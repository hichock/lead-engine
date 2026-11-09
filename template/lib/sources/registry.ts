import type { SourceDef, SourceKey } from "../guard";
import { MV_USD_PER_CHECK } from "./millionverifier";

// The list of sources the app knows, what stage each serves, and how much a call is expected to cost.
// Pure. Adding a source = a module in lib/sources/, a line here, a case in run.ts, a row in kb/sources.md.

export const SOURCES: Record<SourceKey, SourceDef & { label: string; capLabel: string }> = {
  httparchive: { key: "httparchive", stage: "discover", paid: false, label: "HTTP Archive (BigQuery)", capLabel: "GB billed / day" },
  urlscan: { key: "urlscan", stage: "discover", paid: false, label: "urlscan.io", capLabel: "searches / day" },
  reverseip: { key: "reverseip", stage: "discover", paid: false, label: "Reverse IP (HackerTarget)", capLabel: "lookups" },
  apollo: { key: "apollo", stage: "discover", paid: false, label: "Apollo people search (free)", capLabel: "pages / day" },
  apify: { key: "apify", stage: "research", paid: true, label: "Apify actors", capLabel: "$ / day" },
  monid: { key: "monid", stage: "contact", paid: true, label: "Monid (Hunter, ContactOut...)", capLabel: "$ / day" },
  millionverifier: { key: "millionverifier", stage: "verify", paid: true, label: "MillionVerifier", capLabel: "checks / day" },
};

export const isSourceKey = (k: unknown): k is SourceKey => typeof k === "string" && k in SOURCES;

type P = Record<string, unknown>;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

// Expected cost of one call. BigQuery GB come from the dry run, not from here.
export function estimate(key: SourceKey, p: P): { usd: number; units: number } {
  switch (key) {
    case "millionverifier": {
      const n = Array.isArray(p.emails) ? p.emails.length : 0;
      return { usd: round4(n * MV_USD_PER_CHECK), units: n };
    }
    case "urlscan": return { usd: 0, units: p.slices ? 10 : 1 };
    case "apollo": return { usd: 0, units: 1 };
    case "apify": return { usd: num(p.maxUsd), units: 0 };
    case "monid": return { usd: p.path === "run" || p.path === undefined ? num(p.maxUsd) : 0, units: 0 };
    default: return { usd: 0, units: 0 };
  }
}

// Polls and free lookups are not deduplicated (they must be repeatable); anything that starts work is.
export function isDeduped(key: SourceKey, p: P): boolean {
  if (key === "monid") return p.path === "run";
  if (key === "httparchive") return !p.jobId;
  return true;
}

// Monid and Apify serve several stages; the caller says which, and contact/verify then need a qualified company.
// Monid's free lookups (discover, inspect, runs/<id>, wallet/balance) need no company. A paid Monid `run` is always a
// contact or verify call (default contact), so it can never skip the qualified-only rule by claiming another stage.
export function stageOf(key: SourceKey, p: P): SourceDef["stage"] {
  const s = p.stage;
  if (key === "monid") {
    if (p.path !== undefined && p.path !== "run") return "discover";
    return s === "verify" ? "verify" : "contact";
  }
  if (key === "apify" && (s === "discover" || s === "contact" || s === "verify" || s === "research")) return s;
  return SOURCES[key].stage;
}
