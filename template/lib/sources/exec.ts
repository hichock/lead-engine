import type { Caps } from "../caps";
import type { SourceKey, Usage } from "../guard";
import * as urlscan from "./urlscan";
import * as bq from "./bigquery";
import * as hta from "./httparchive";
import * as apify from "./apify";
import * as monid from "./monid";
import * as mv from "./millionverifier";
import * as apollo from "./apollo";
import * as reverseip from "./reverseip";

// The provider calls behind one guarded source call, shared by the app (lib/sources/run.ts, Supabase ledger) and the
// local mode (lib/local/source.ts, SQLite or Postgres ledger). Callers decide (guard + ledger) before calling these.

type P = Record<string, unknown>;
export type ProviderCall = { source: SourceKey; params: P; companyId: string | null };
export type Exec = { rows: unknown[]; rowsIn: number; rowsKept?: number; usd: number; units: number; jobId?: string | null; pending?: boolean; extra?: P };
export type VerifyWriter = (results: { email: string; result: mv.MvResult }[]) => Promise<void>;

export function htaSql(p: P): string {
  const techs = Array.isArray(p.techs) ? p.techs.map(String) : [];
  const crawl = String(p.crawlDate ?? "");
  if (p.mode === "names") return hta.techNamesSql(crawl, String(p.like ?? ""));
  if (p.mode === "new") return hta.newDomainsSql(techs, crawl, String(p.prevCrawlDate ?? ""));
  return hta.techDomainsSql(techs, crawl, Number(p.limit ?? 5000));
}

export const bqExec = (r: bq.BqResult): Exec => ({
  rows: r.rows, rowsIn: r.rows.length, usd: 0, units: r.gb, jobId: r.jobId ? `${r.location ?? "US"}:${r.jobId}` : null, pending: !r.complete,
});

export async function execute(call: ProviderCall, caps: Caps, usage: Usage, writeVerify: VerifyWriter): Promise<Exec> {
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
      await writeVerify(results);
      return { rows: results, rowsIn: results.length, rowsKept: results.filter((r) => r.result === "ok").length, usd: results.length * mv.MV_USD_PER_CHECK, units: results.length };
    }
  }
}

// Resume a pending job (BigQuery or Apify) instead of starting it again.
export async function resume(source: SourceKey, jobId: string): Promise<Exec> {
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

