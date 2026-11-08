import type { Caps } from "./caps";

// The cost guard. Every call to a source goes through decideCall() before any money is spent.
// Rules (enforced here in code, not left to a prompt):
//  1. A disabled source is refused.
//  2. Paid contact finding and verification only run for companies with qualified === true.
//  3. A call whose estimated cost would pass the per-run-day cap or the monthly cap is refused.
//  4. Apify is off until the owner sets apifyUsd > 0.
//  5. BigQuery needs a dry run first; a query over the per-query or remaining daily GB is refused.

export type SourceKey =
  | "urlscan" | "httparchive" | "reverseip" | "apify" | "monid" | "millionverifier" | "apollo";

// stage: discover = finds companies; contact = finds a person's email; verify = checks an email; research = reads activity.
export type SourceDef = { key: SourceKey; stage: "discover" | "contact" | "verify" | "research"; paid: boolean };

export type Usage = { // what this source has used since the start of the run day (UTC), and all paid sources this month
  usdToday: number;
  unitsToday: number; // checks, searches, pages or GB, depending on the source
  usdThisMonth: number;
};

export type CallRequest = {
  source: SourceDef;
  enabled: boolean;
  estimate: { usd: number; units: number };
  stageOverride?: SourceDef["stage"]; // a multi-purpose source (Monid, Apify) states the stage of this call
  company?: { qualified: boolean | null; hasEvidence: boolean } | null;
  bigqueryDryRunGb?: number | null; // required for httparchive
};

export type Decision = { ok: true } | { ok: false; reason: string };

const refuse = (reason: string): Decision => ({ ok: false, reason });

function checkQualified(stage: SourceDef["stage"], req: CallRequest): Decision | null {
  if (stage !== "contact" && stage !== "verify") return null;
  if (!req.company) return refuse(`${stage} calls need a company_id`);
  if (req.company.qualified !== true) return refuse("company is not qualified: run qualify first (paid contact work only on qualified companies)");
  if (stage === "verify" && !req.company.hasEvidence) return refuse("company has no evidence line yet: verify only rows that have a copy fact");
  return null;
}

function checkBigquery(req: CallRequest, caps: Caps, usage: Usage): Decision | null {
  if (req.source.key !== "httparchive") return null;
  const gb = req.bigqueryDryRunGb;
  if (gb == null) return refuse("BigQuery: run a dry run first and pass its GB estimate");
  if (gb > caps.bigqueryGbPerQuery) return refuse(`BigQuery: ${gb.toFixed(1)} GB is over the per-query cap of ${caps.bigqueryGbPerQuery} GB`);
  if (usage.unitsToday + gb > caps.bigqueryGb) return refuse(`BigQuery: ${gb.toFixed(1)} GB would pass today's cap (${usage.unitsToday.toFixed(1)} of ${caps.bigqueryGb} GB used)`);
  return null;
}

// Units-based daily caps per source (checks, searches, pages).
function unitCap(key: SourceKey, caps: Caps): number | null {
  if (key === "millionverifier") return caps.mvChecks;
  if (key === "urlscan") return caps.urlscanSearches;
  if (key === "apollo") return caps.apolloPages;
  return null;
}

function usdCap(key: SourceKey, caps: Caps): number | null {
  if (key === "monid") return caps.monidUsd;
  if (key === "apify") return caps.apifyUsd;
  return null;
}

function checkBudget(req: CallRequest, caps: Caps, usage: Usage): Decision | null {
  const { key } = req.source;
  if (key === "apify" && caps.apifyUsd <= 0) return refuse("Apify is off: set an Apify budget in Settings first");
  const units = unitCap(key, caps);
  if (units != null && usage.unitsToday + req.estimate.units > units)
    return refuse(`${key}: ${req.estimate.units} more would pass today's cap (${usage.unitsToday} of ${units} used)`);
  const usd = usdCap(key, caps);
  if (usd != null && usage.usdToday + req.estimate.usd > usd)
    return refuse(`${key}: $${req.estimate.usd.toFixed(2)} more would pass today's cap ($${usage.usdToday.toFixed(2)} of $${usd.toFixed(2)} used)`);
  if (req.source.paid && usage.usdThisMonth + req.estimate.usd > caps.monthlyUsd)
    return refuse(`monthly cap: $${usage.usdThisMonth.toFixed(2)} of $${caps.monthlyUsd.toFixed(2)} used`);
  return null;
}

export function decideCall(req: CallRequest, caps: Caps, usage: Usage): Decision {
  if (!req.enabled) return refuse(`${req.source.key} is switched off in Settings`);
  const stage = req.stageOverride ?? req.source.stage;
  return checkQualified(stage, req) ?? checkBigquery(req, caps, usage) ?? checkBudget(req, caps, usage) ?? { ok: true };
}
