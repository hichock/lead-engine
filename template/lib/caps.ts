// Default caps and settings. The owner changes them in Settings (table `settings`); kb/sources.md mirrors them.
// Defaults come from the runs this bundle was built on (see .claude/skills/*/references): Monid $1.50, MillionVerifier
// 80 checks and BigQuery 30 GB per run day, 200 GB max per query, Apify $0 until the owner sets a budget.

export type Caps = {
  monidUsd: number; // per run day
  mvChecks: number; // MillionVerifier checks per run day
  bigqueryGb: number; // GB billed per run day
  bigqueryGbPerQuery: number; // hard ceiling for one query (maximumBytesBilled)
  apifyUsd: number; // per run day; 0 = Apify off
  urlscanSearches: number; // per run day (free key allows 1,000 a day)
  apolloPages: number; // free people-search pages per run day
  monthlyUsd: number; // all paid sources together, per calendar month
};

export const DEFAULT_CAPS: Caps = {
  monidUsd: 1.5,
  mvChecks: 80,
  bigqueryGb: 30,
  bigqueryGbPerQuery: 200,
  apifyUsd: 0,
  urlscanSearches: 200,
  apolloPages: 20,
  monthlyUsd: 30,
};

export type SendSettings = {
  windowStartHour: number; // local time of the lead
  windowEndHour: number; // exclusive
  minGapMinutes: number; // between two sends from one mailbox
  stepDelays: number[]; // business days before follow-up 1, follow-up 2
  newPerDay: number; // first emails per day, all mailboxes together
  optOutLine: string; // appended to every email; empty string turns it off (not recommended)
  autoQueue: boolean; // false = the owner approves drafts in Outreach before anything is queued
};

export const DEFAULT_SEND: SendSettings = {
  windowStartHour: 9,
  windowEndHour: 17,
  minGapMinutes: 8,
  stepDelays: [3, 5],
  newPerDay: 15,
  optOutLine: "If this isn't relevant, reply \"no\" and I won't write again.",
  autoQueue: false,
};

// Merge stored values over defaults, ignoring anything that is not a finite number of the right key.
export function readCaps(stored: unknown): Caps {
  const out = { ...DEFAULT_CAPS };
  if (!stored || typeof stored !== "object") return out;
  for (const k of Object.keys(out) as (keyof Caps)[]) {
    const v = Number((stored as Record<string, unknown>)[k]);
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

export function readSend(stored: unknown): SendSettings {
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const num = (k: keyof SendSettings, d: number) => (Number.isFinite(Number(s[k])) ? Number(s[k]) : d);
  return {
    windowStartHour: num("windowStartHour", DEFAULT_SEND.windowStartHour),
    windowEndHour: num("windowEndHour", DEFAULT_SEND.windowEndHour),
    minGapMinutes: num("minGapMinutes", DEFAULT_SEND.minGapMinutes),
    stepDelays: Array.isArray(s.stepDelays) ? s.stepDelays.map(Number).filter((n) => n > 0) : DEFAULT_SEND.stepDelays,
    newPerDay: num("newPerDay", DEFAULT_SEND.newPerDay),
    optOutLine: typeof s.optOutLine === "string" ? s.optOutLine : DEFAULT_SEND.optOutLine,
    autoQueue: s.autoQueue === true,
  };
}
