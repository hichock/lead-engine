import type { SupabaseClient } from "@supabase/supabase-js";
import { readCaps, type Caps } from "../caps";
import { decideCall, type Usage } from "../guard";
import { inputHash, ledgerDecision, type PriorRun } from "../ledger";
import { startOfMonth, startOfRunDay } from "../sender/window";
import type { SourceKey } from "../guard";
import { SOURCES, estimate, isDeduped, isSourceKey, stageOf } from "./registry";
import * as urlscan from "./urlscan";
import * as bq from "./bigquery";
import * as hta from "./httparchive";
import * as apify from "./apify";
import * as monid from "./monid";
import * as mv from "./millionverifier";
import * as apollo from "./apollo";
import * as reverseip from "./reverseip";

// One guarded source call: parse → load → decide → write ledger → call provider → write ledger.
// Used by POST /api/agent/source (Claude skills) and by the sources cron.

type P = Record<string, unknown>;
export type SourceCall = { source: SourceKey; params: P; companyId: string | null };
export type CallOutcome = { status: number; body: Record<string, unknown> };
type Exec = { rows: unknown[]; rowsIn: number; rowsKept?: number; usd: number; units: number; jobId?: string | null; pending?: boolean; extra?: P };

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

function htaSql(p: P): string {
  const techs = Array.isArray(p.techs) ? p.techs.map(String) : [];
  const crawl = String(p.crawlDate ?? "");
  if (p.mode === "names") return hta.techNamesSql(crawl, String(p.like ?? ""));
  if (p.mode === "new") return hta.newDomainsSql(techs, crawl, String(p.prevCrawlDate ?? ""));
  return hta.techDomainsSql(techs, crawl, Number(p.limit ?? 5000));
}

const bqExec = (r: bq.BqResult): Exec => ({
  rows: r.rows, rowsIn: r.rows.length, usd: 0, units: r.gb, jobId: r.jobId ? `${r.location ?? "US"}:${r.jobId}` : null, pending: !r.complete,
});

async function execute(call: SourceCall, caps: Caps, usage: Usage, db: SupabaseClient): Promise<Exec> {
  const p = call.params;
  switch (call.source) {
    case "urlscan": {
      const qs = p.slices ? urlscan.sliceQueries(String(p.q ?? "")) : [String(p.q ?? "")];
      const hits: urlscan.UrlscanHit[] = [];
      for (const q of qs) hits.push(...(await urlscan.search(q, 100)).hits);
      const rows = urlscan.uniqueHosts(hits);
      return { rows, rowsIn: rows.length, usd: 0, units: qs.length };
    }
    case "httparchive": {
      const maxGb = Math.min(caps.bigqueryGbPerQuery, caps.bigqueryGb - usage.unitsToday);
      return bqExec(await bq.query(htaSql(p), { dryRun: false, maxGb }));
    }
    case "reverseip": {
      const rows = await reverseip.hostsOnIp(String(p.ip ?? ""));
      return { rows, rowsIn: rows.length, usd: 0, units: 1 };
    }
    case "apollo": {
      const r = await apollo.searchPeople({ titles: (p.titles as string[]) ?? [], keywords: p.keywords as string | undefined, employeeRanges: p.employeeRanges as string[] | undefined, locations: p.locations as string[] | undefined, page: Number(p.page ?? 1) });
      return { rows: r.people, rowsIn: r.people.length, usd: 0, units: 1, extra: { total: r.total } };
    }
    case "apify": {
      const run = await apify.startRun(String(p.actor ?? ""), p.input, Number(p.maxUsd));
      return { rows: [], rowsIn: 0, usd: Number(p.maxUsd), units: 0, jobId: run.id, pending: true, extra: { runStatus: run.status } };
    }
    case "monid": {
      const res = await monid.call(String(p.path ?? "run"), p.body);
      const cost = Number((res as P)?.cost ?? (res as P)?.costUsd ?? NaN);
      return { rows: [res], rowsIn: 1, usd: monid.isPaidPath(String(p.path ?? "run")) ? (Number.isFinite(cost) ? cost : Number(p.maxUsd)) : 0, units: 0 };
    }
    case "millionverifier": {
      const results = await mv.verifyMany((p.emails as string[]) ?? []);
      await writeVerifyResults(db, call.companyId, results);
      return { rows: results, rowsIn: results.length, rowsKept: results.filter((r) => r.result === "ok").length, usd: results.length * mv.MV_USD_PER_CHECK, units: results.length };
    }
  }
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

// Resume a pending job (BigQuery or Apify) instead of starting it again.
async function resume(source: SourceKey, jobId: string): Promise<Exec> {
  if (source === "httparchive") {
    const [location, id] = jobId.includes(":") ? jobId.split(":") : ["US", jobId];
    return bqExec(await bq.getResults(id, location));
  }
  if (source === "apify") {
    const run = await apify.getRun(jobId);
    if (!apify.finished(run.status)) return { rows: [], rowsIn: 0, usd: 0, units: 0, jobId, pending: true, extra: { runStatus: run.status } };
    if (run.status !== "SUCCEEDED") throw new Error(`apify run ${run.status}`);
    const rows = run.datasetId ? await apify.items(run.datasetId) : [];
    return { rows, rowsIn: rows.length, usd: run.usageUsd ?? 0, units: 0, jobId };
  }
  throw new Error(`${source} has no resumable jobs`);
}

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
