import { createHash } from "node:crypto";

// Run ledger logic (table `sources_runs`). One row per call to a source. A call with the same source and the same
// input inside 24 hours is refused, and a pending paid job is resumed instead of re-run, so a dropped or repeated call
// never bills twice. The database enforces the same rule with an exclusion constraint (see the init migration).

export const LEDGER_WINDOW_MS = 24 * 60 * 60 * 1000;

// Stable JSON: object keys sorted at every level, so {a,b} and {b,a} hash the same.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function inputHash(source: string, params: unknown): string {
  return createHash("sha256").update(`${source}\n${canonicalJson(params)}`).digest("hex");
}

export type PriorRun = { status: "pending" | "ok" | "failed" | "refused"; startedAt: string; providerJobId: string | null };

export type LedgerDecision =
  | { action: "run" }
  | { action: "resume"; providerJobId: string }
  | { action: "refuse"; reason: string };

// Decides what to do with a call, given earlier runs with the same input hash (any order).
export function ledgerDecision(prior: PriorRun[], now: Date): LedgerDecision {
  const recent = prior.filter((r) => now.getTime() - new Date(r.startedAt).getTime() < LEDGER_WINDOW_MS);
  const pending = recent.find((r) => r.status === "pending" && r.providerJobId);
  if (pending?.providerJobId) return { action: "resume", providerJobId: pending.providerJobId };
  const done = recent.find((r) => r.status === "ok" || r.status === "pending");
  if (done) {
    const hours = Math.ceil((LEDGER_WINDOW_MS - (now.getTime() - new Date(done.startedAt).getTime())) / 3_600_000);
    return { action: "refuse", reason: `same input already ran in the last 24 h; try again in ~${hours} h or change the input` };
  }
  return { action: "run" };
}
