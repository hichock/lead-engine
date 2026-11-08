// Score = fit × trigger, with the reasons written out. Pure: no I/O, same input → same output.
// fit (0–1): how well the company matches the ICP gates in kb/icp.md (mirrored in settings.scoring).
// trigger (0–1): how strong and how fresh the "why now" signals are. Several signals add up, with diminishing returns.
// Use the score to rank, not as a forecast: every rank links to its evidence (the `why` lines).

import type { Signal, SignalKind } from "./types";

export type ScoringConfig = {
  countries: string[]; // target countries (lowercase codes or names); empty = any
  sizeBands: Record<string, number>; // weight per size band, e.g. {"1-10":0.6,"11-50":1,"51-200":0.8}
  tools: string[]; // target tools (lowercase); empty = any
  kindWeights: Record<SignalKind, number>; // base strength per signal kind
  halfLifeDays: number; // a signal loses half its strength after this many days
};

export const DEFAULT_SCORING: ScoringConfig = {
  countries: [],
  sizeBands: { "1-10": 0.6, "11-50": 1, "51-200": 0.8, "201-500": 0.4, "500+": 0.1 },
  tools: [],
  kindWeights: { request: 0.9, job: 0.7, comment: 0.6, ad: 0.6, tech: 0.5, register: 0.4, review: 0.3 },
  halfLifeDays: 30,
};

export type ScoreInput = {
  country: string | null;
  sizeBand: string | null;
  tech: string[];
  qualified: boolean | null;
  signals: Pick<Signal, "kind" | "value" | "observedAt">[];
};

export type ScoreResult = { score: number; fit: number; trigger: number; why: string[] };

const round2 = (n: number) => Math.round(n * 100) / 100;
const lc = (s: string) => s.trim().toLowerCase();

type Part = { value: number; reason: string };

function countryPart(c: ScoringConfig, country: string | null): Part {
  if (!c.countries.length) return { value: 1, reason: "any country" };
  if (!country) return { value: 0.5, reason: "country unknown" };
  const hit = c.countries.map(lc).includes(lc(country));
  return hit ? { value: 1, reason: `${country} is a target country` } : { value: 0.3, reason: `${country} is outside the target countries` };
}

function sizePart(c: ScoringConfig, band: string | null): Part {
  if (!band) return { value: 0.5, reason: "size unknown" };
  const w = c.sizeBands[band];
  return w == null ? { value: 0.5, reason: `size ${band} has no weight` } : { value: w, reason: `size ${band} (weight ${w})` };
}

function toolPart(c: ScoringConfig, tech: string[]): Part {
  if (!c.tools.length) return { value: 1, reason: "any tool" };
  const hits = tech.filter((t) => c.tools.map(lc).includes(lc(t)));
  return hits.length ? { value: 1, reason: `runs ${hits.join(", ")}` } : { value: 0.6, reason: "no target tool seen" };
}

export function fitOf(c: ScoringConfig, x: ScoreInput): { fit: number; reasons: string[] } {
  if (x.qualified === false) return { fit: 0, reasons: ["not qualified"] };
  const parts = [countryPart(c, x.country), sizePart(c, x.sizeBand), toolPart(c, x.tech)];
  const fit = parts.reduce((p, q) => p * q.value, 1);
  return { fit, reasons: parts.map((p) => p.reason) };
}

export function signalStrength(c: ScoringConfig, s: Pick<Signal, "kind" | "observedAt">, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(s.observedAt).getTime()) / 86_400_000);
  return (c.kindWeights[s.kind] ?? 0.3) * Math.pow(0.5, ageDays / c.halfLifeDays);
}

export function triggerOf(c: ScoringConfig, signals: ScoreInput["signals"], now: Date): { trigger: number; reasons: string[] } {
  const ranked = signals
    .map((s) => ({ s, w: signalStrength(c, s, now) }))
    .sort((a, b) => b.w - a.w);
  const trigger = 1 - ranked.reduce((left, r) => left * (1 - r.w), 1);
  const reasons = ranked.slice(0, 3).map(({ s, w }) => {
    const days = Math.round((now.getTime() - new Date(s.observedAt).getTime()) / 86_400_000);
    return `${s.kind}: ${s.value} (${days} d ago, ${round2(w)})`;
  });
  return { trigger, reasons: reasons.length ? reasons : ["no signal yet"] };
}

export function scoreCompany(x: ScoreInput, now: Date, c: ScoringConfig = DEFAULT_SCORING): ScoreResult {
  const f = fitOf(c, x);
  const t = triggerOf(c, x.signals, now);
  return {
    score: Math.round(100 * f.fit * t.trigger),
    fit: round2(f.fit),
    trigger: round2(t.trigger),
    why: [`Fit ${round2(f.fit)}: ${f.reasons.join("; ")}`, `Trigger ${round2(t.trigger)}: ${t.reasons.join("; ")}`],
  };
}

// Rank: score first, then the stronger trigger (a fresh signal beats a perfect fit with nothing happening).
export function rank<T extends { result: ScoreResult }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.result.score - a.result.score || b.result.trigger - a.result.trigger);
}
