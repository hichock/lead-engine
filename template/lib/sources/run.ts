import type { SupabaseClient } from "@supabase/supabase-js";
import { readCaps, type Caps } from "../caps";
import { decideCall, type Usage } from "../guard";
import { inputHash, ledgerDecision, type PriorRun } from "../ledger";
import { startOfMonth, startOfRunDay } from "../sender/window";
import type { SourceKey } from "../guard";
import { SOURCES, estimate, isDeduped, isSourceKey, stageOf } from "./registry";
import * as bq from "./bigquery";
import type * as mv from "./millionverifier";
import { execute as executeCall, htaSql, resume, type Exec } from "./exec";

// One guarded source call: parse → load → decide → write ledger → call provider → write ledger.
// Used by POST /api/agent/source (Claude skills) and by the sources cron.

type P = Record<string, unknown>;
export type SourceCall = { source: SourceKey; params: P; companyId: string | null };
export type CallOutcome = { status: number; body: Record<string, unknown> };

export function parseCall(body: unknown): SourceCall | string {
  const b = (body && typeof body === "object" ? body : {}) as P;
  if (!isSourceKey(b.source)) return `source must be one of: ${Object.keys(SOURCES).join(", ")}`;
  const params = (b.params && typeof b.params === "object" ? b.params : {}) as P;
  const companyId = typeof b.company_id === "string" && b.company_id ? b.company_id : null;
  return { source: b.source, params, companyId };
}

async function loadUsage(db: SupabaseClient, source: SourceKey, now: Date): Promise<Usage> {
  const { data: today, error } = await db.from("sources_runs").select("cost_usd, units")
    .eq("source", source).in("status", ["ok", "pending"]).gte("started_at", startOfRunDay(now).toISOString());
  if (error) throw new Error(`Could not load usage: ${error.message}`);
  const { data: month, error: e2 } = await db.from("sources_runs").select("cost_usd")
    .in("status", ["ok", "pending"]).gte("started_at", startOfMonth(now).toISOString()).gt("cost_usd", 0);
  if (e2) throw new Error(`Could not load usage: ${e2.message}`);
  const sum = (rows: { cost_usd?: number | string; units?: number | string }[] | null, k: "cost_usd" | "units") =>
    (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
  return { usdToday: sum(today, "cost_usd"), unitsToday: sum(today, "units"), usdThisMonth: sum(month, "cost_usd") };
}

async function loadSetting(db: SupabaseClient, key: string): Promise<unknown> {
  const { data, error } = await db.from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data?.value ?? null;
}

async function loadCompany(db: SupabaseClient, id: string | null) {
  if (!id) return null;
  const { data, error } = await db.from("companies").select("qualified, evidence").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load company: ${error.message}`);
  return data ? { qualified: data.qualified as boolean | null, hasEvidence: !!(data.evidence as string | null)?.trim() } : null;
}

async function loadPrior(db: SupabaseClient, source: string, hash: string, now: Date): Promise<(PriorRun & { id: string })[]> {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const { data, error } = await db.from("sources_runs").select("id, status, started_at, provider_job_id")
    .eq("source", source).eq("input_hash", hash).gte("started_at", since);
  if (error) throw new Error(`Could not load ledger: ${error.message}`);
  return (data ?? []).map((r) => ({ id: r.id as string, status: r.status as PriorRun["status"], startedAt: r.started_at as string, providerJobId: r.provider_job_id as string | null }));
}

async function writeVerifyResults(db: SupabaseClient, companyId: string | null, results: { email: string; result: mv.MvResult }[]) {
  if (!companyId) return;
  for (const r of results) {
    if (r.result === "error") continue;
    const { error } = await db.from("people").update({ verify_status: r.result, verify_source: "millionverifier", verified_at: new Date().toISOString() })
      .eq("company_id", companyId).eq("email", r.email);
    if (error) throw new Error(`Could not save verify result: ${error.message}`);
  }
}

const execute = (call: SourceCall, caps: Caps, usage: Usage, db: SupabaseClient) =>
  executeCall(call, caps, usage, (results) => writeVerifyResults(db, call.companyId, results));

async function logRefused(db: SupabaseClient, call: SourceCall, hash: string, reason: string) {
  await db.from("sources_runs").insert({ source: call.source, input_hash: hash, params: call.params, company_id: call.companyId, status: "refused", note: reason, finished_at: new Date().toISOString() });
}

function finishRow(e: Exec) {
  return {
    status: e.pending ? "pending" : "ok", rows_in: e.rowsIn, rows_kept: e.rowsKept ?? e.rowsIn, cost_usd: e.usd, units: e.units,
    provider_job_id: e.jobId ?? null, finished_at: e.pending ? null : new Date().toISOString(),
  };
}

const reply = (status: number, body: Record<string, unknown>): CallOutcome => ({ status, body });

async function runResume(db: SupabaseClient, call: SourceCall, priorId: string, jobId: string): Promise<CallOutcome> {
  const e = await resume(call.source, jobId);
  const row = finishRow(e);
  // A finished Apify run replaces the ceiling estimate with the real spend.
  const { error } = await db.from("sources_runs").update(e.pending ? { note: "still running" } : row).eq("id", priorId);
  if (error) throw new Error(`Could not update ledger: ${error.message}`);
  return reply(e.pending ? 202 : 200, { resumed: true, pending: !!e.pending, jobId, rows: e.rows, ...e.extra });
}

export async function runSource(db: SupabaseClient, call: SourceCall, now = new Date()): Promise<CallOutcome> {
  const hash = inputHash(call.source, call.params);
  const deduped = isDeduped(call.source, call.params);
  if (call.source === "httparchive" && typeof call.params.jobId === "string") {
    return reply(200, { ...(await resume("httparchive", call.params.jobId)) });
  }
  if (deduped) {
    const prior = await loadPrior(db, call.source, hash, now);
    const d = ledgerDecision(prior, now);
    if (d.action === "refuse") { await logRefused(db, call, hash, d.reason); return reply(409, { refused: d.reason }); }
    if (d.action === "resume") return runResume(db, call, prior.find((r) => r.providerJobId === d.providerJobId)!.id, d.providerJobId);
  }
  const [capsRaw, enabledRaw, usage, company] = await Promise.all([
    loadSetting(db, "caps"), loadSetting(db, "sources_enabled"), loadUsage(db, call.source, now), loadCompany(db, call.companyId),
  ]);
  const caps = readCaps(capsRaw);
  const enabled = ((enabledRaw ?? {}) as Record<string, boolean>)[call.source] === true;
  const dryRunGb = call.source === "httparchive" && enabled ? (await bq.query(htaSql(call.params), { dryRun: true, maxGb: caps.bigqueryGbPerQuery })).gb : null;
  const est = estimate(call.source, call.params);
  const decision = decideCall({ source: SOURCES[call.source], enabled, estimate: est, stageOverride: stageOf(call.source, call.params), company, bigqueryDryRunGb: dryRunGb }, caps, usage);
  if (!decision.ok) { await logRefused(db, call, hash, decision.reason); return reply(403, { refused: decision.reason }); }
  if (call.params.dryRun === true) return reply(200, { dryRun: true, gb: dryRunGb, estimate: est });
  if (!deduped) {
    const e = await execute(call, caps, usage, db);
    return reply(200, { rows: e.rows, ...e.extra });
  }
  const { data: row, error } = await db.from("sources_runs").insert({ source: call.source, input_hash: hash, params: call.params, company_id: call.companyId, status: "pending", units: est.units, cost_usd: est.usd }).select("id").single();
  if (error) return reply(409, { refused: error.code === "23P01" ? "same input already running or ran in the last 24 h" : `ledger: ${error.message}` });
  try {
    const e = await execute(call, caps, usage, db);
    await db.from("sources_runs").update(finishRow(e)).eq("id", row.id);
    return reply(e.pending ? 202 : 200, { runId: row.id, pending: !!e.pending, jobId: e.jobId ?? null, gb: dryRunGb, rows: e.rows, ...e.extra });
  } catch (err) {
    await db.from("sources_runs").update({ status: "failed", note: (err as Error).message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", row.id);
    return reply(502, { error: (err as Error).message, runId: row.id });
  }
}
