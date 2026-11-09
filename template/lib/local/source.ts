import { randomUUID } from "node:crypto";
import { readCaps } from "../caps";
import { decideCall, type Usage } from "../guard";
import { inputHash, ledgerDecision, type PriorRun } from "../ledger";
import { startOfMonth, startOfRunDay } from "../sender/window";
import * as bq from "../sources/bigquery";
import { execute, htaSql, resume, type Exec, type ProviderCall } from "../sources/exec";
import { SOURCES, estimate, isDeduped, stageOf } from "../sources/registry";
import type { LocalStore } from "./store";

// One guarded source call in the local mode: the same guard (caps, qualified-only, BigQuery dry run), the same 24 h
// ledger and resume rules as the app (lib/sources/run.ts), with the ledger in the local store. Provider keys come
// from .env.local on this machine. Status codes match the app: 200 done, 202 pending, 403 refused, 409 ledger.

export type LocalOutcome = { status: number; body: Record<string, unknown> };

// Sources are on by default locally (no Settings page); the owner switches one off with `le ingest '{"sources_enabled":...}'`
// or by editing kb/sources.md and asking Claude. Apify still needs a budget above $0 (guard rule).
const DEFAULT_ENABLED: Record<string, boolean> = { httparchive: true, urlscan: true, apollo: true, monid: true, millionverifier: true, apify: true, reverseip: false };

async function usageOf(s: LocalStore, source: string, now: Date): Promise<Usage> {
  const day = await s.get("select coalesce(sum(cost_usd),0) as usd, coalesce(sum(units),0) as units from sources_runs where source = ? and status in ('ok','pending') and started_at >= ?", [source, startOfRunDay(now).toISOString()]);
  const month = await s.get("select coalesce(sum(cost_usd),0) as usd from sources_runs where status in ('ok','pending') and started_at >= ?", [startOfMonth(now).toISOString()]);
  return { usdToday: Number(day?.usd ?? 0), unitsToday: Number(day?.units ?? 0), usdThisMonth: Number(month?.usd ?? 0) };
}

async function priorRuns(s: LocalStore, source: string, hash: string, now: Date): Promise<(PriorRun & { id: string })[]> {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const rows = await s.all("select id, status, started_at, provider_job_id from sources_runs where source = ? and input_hash = ? and started_at >= ?", [source, hash, since]);
  return rows.map((r) => ({ id: String(r.id), status: r.status as PriorRun["status"], startedAt: String(r.started_at), providerJobId: (r.provider_job_id as string) ?? null }));
}

async function finish(s: LocalStore, id: string, e: Exec) {
  await s.sql.run("update sources_runs set status = ?, rows_in = ?, rows_kept = ?, cost_usd = ?, units = ?, provider_job_id = ?, finished_at = ? where id = ?",
    [e.pending ? "pending" : "ok", e.rowsIn, e.rowsKept ?? e.rowsIn, e.usd, e.units, e.jobId ?? null, e.pending ? null : new Date().toISOString(), id]);
}

async function logRun(s: LocalStore, call: ProviderCall, hash: string, status: string, note: string | null, est = { usd: 0, units: 0 }): Promise<string> {
  const id = randomUUID();
  await s.sql.run("insert into sources_runs (id, source, input_hash, params, company_id, status, note, cost_usd, units, started_at, finished_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, call.source, hash, JSON.stringify(call.params), call.companyId, status, note, est.usd, est.units, new Date().toISOString(), status === "refused" ? new Date().toISOString() : null]);
  return id;
}

const writeVerify = (s: LocalStore, companyId: string | null) => async (results: { email: string; result: string }[]) => {
  if (!companyId) return;
  for (const r of results) if (r.result !== "error")
    await s.sql.run("update people set verify_status = ?, verify_source = 'millionverifier', verified_at = ? where company_id = ? and email = ?", [r.result, new Date().toISOString(), companyId, r.email]);
};

async function loadCompany(s: LocalStore, id: string | null) {
  if (!id) return null;
  const c = await s.get("select qualified, evidence from companies where id = ?", [id]);
  return c ? { qualified: (c.qualified as boolean | null) ?? null, hasEvidence: !!String(c.evidence ?? "").trim() } : null;
}

async function resumeRun(s: LocalStore, call: ProviderCall, prior: (PriorRun & { id: string })[], jobId: string): Promise<LocalOutcome> {
  const e = await resume(call.source, jobId);
  const id = prior.find((r) => r.providerJobId === jobId)!.id;
  if (!e.pending) await finish(s, id, e);
  return { status: e.pending ? 202 : 200, body: { resumed: true, pending: !!e.pending, jobId, rows: e.rows, ...e.extra } };
}

export async function runLocalSource(s: LocalStore, call: ProviderCall, now = new Date()): Promise<LocalOutcome> {
  const hash = inputHash(call.source, call.params);
  const deduped = isDeduped(call.source, call.params);
  if (deduped) {
    const prior = await priorRuns(s, call.source, hash, now);
    const d = ledgerDecision(prior, now);
    if (d.action === "refuse") { await logRun(s, call, hash, "refused", d.reason); return { status: 409, body: { refused: d.reason } }; }
    if (d.action === "resume") return resumeRun(s, call, prior, d.providerJobId);
  }
  const caps = readCaps(await s.setting("caps"));
  const enabled = { ...DEFAULT_ENABLED, ...((await s.setting("sources_enabled")) as Record<string, boolean> | null ?? {}) }[call.source] === true;
  const usage = await usageOf(s, call.source, now);
  const dryRunGb = call.source === "httparchive" && enabled ? (await bq.query(htaSql(call.params), { dryRun: true, maxGb: caps.bigqueryGbPerQuery })).gb : null;
  const est = estimate(call.source, call.params);
  const decision = decideCall({ source: SOURCES[call.source], enabled, estimate: est, stageOverride: stageOf(call.source, call.params), company: await loadCompany(s, call.companyId), bigqueryDryRunGb: dryRunGb }, caps, usage);
  if (!decision.ok) { await logRun(s, call, hash, "refused", decision.reason); return { status: 403, body: { refused: decision.reason } }; }
  if (call.params.dryRun === true) return { status: 200, body: { dryRun: true, gb: dryRunGb, estimate: est } };
  if (!deduped) { const e = await execute(call, caps, usage, writeVerify(s, call.companyId)); return { status: 200, body: { rows: e.rows, ...e.extra } }; }
  const id = await logRun(s, call, hash, "pending", null, est);
  try {
    const e = await execute(call, caps, usage, writeVerify(s, call.companyId));
    await finish(s, id, e);
    return { status: e.pending ? 202 : 200, body: { runId: id, pending: !!e.pending, jobId: e.jobId ?? null, gb: dryRunGb, rows: e.rows, ...e.extra } };
  } catch (err) {
    await s.sql.run("update sources_runs set status = 'failed', note = ?, finished_at = ? where id = ?", [(err as Error).message.slice(0, 500), new Date().toISOString(), id]);
    return { status: 502, body: { error: (err as Error).message, runId: id } };
  }
}
