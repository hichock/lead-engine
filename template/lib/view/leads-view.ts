import type { Company, Signal, SignalKind } from "../types";
import { ago, scoreTone, toneOf, type Tone } from "./format";

// Leads page view model. Pure: rows in, display rows out.

export type LeadFilters = { q: string; status: string; kind: string; minScore: number };
type SearchParams = Record<string, string | string[] | undefined>;

const first = (sp: SearchParams, k: string): string => {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export function parseFilters(sp: SearchParams): LeadFilters {
  const min = Number(first(sp, "min"));
  return {
    q: first(sp, "q").trim().toLowerCase(),
    status: first(sp, "status"),
    kind: first(sp, "kind"),
    minScore: Number.isFinite(min) ? Math.max(0, Math.min(100, min)) : 0,
  };
}

export type LeadRow = {
  id: string; name: string; domain: string; country: string; source: string;
  signalKind: SignalKind | null; signalText: string; signalAge: string; signalCount: number;
  score: number | null; scoreLabel: string; scoreTone: Tone; why: string; factors: string;
  status: string; statusTone: Tone;
};

export type LeadsView = {
  rows: LeadRow[];
  total: number;
  counts: { qualified: number; toQualify: number; contacted: number; replied: number };
  kinds: SignalKind[];
  statuses: string[];
  filtered: boolean;
};

function newest(signals: Signal[]): Signal | null {
  return [...signals].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null;
}

// The table shows the fit reasons and the two factors; the newest signal has its own column.
// "Fit 1: UK is a target country; size 11-50 (weight 1); runs Softr" → "UK is a target country · size 11-50 (weight 1) · runs Softr"
function whyLine(c: Company): { why: string; factors: string } {
  if (c.qualified === false) return { why: c.qualifyReason ?? "Not qualified", factors: "" };
  const fit = c.why[0]?.match(/^Fit ([\d.]+): (.*)$/);
  const trigger = c.why[1]?.match(/^Trigger ([\d.]+):/);
  if (!fit) return { why: "Not scored yet", factors: "" };
  return { why: fit[2].split("; ").join(" · "), factors: `fit ${fit[1]} × trigger ${trigger?.[1] ?? "?"}` };
}

function toRow(c: Company, signals: Signal[], now: Date): LeadRow {
  const top = newest(signals);
  return {
    id: c.id, name: c.name || c.domain, domain: c.domain, country: c.country ?? "–", source: c.source,
    signalKind: top?.kind ?? null, signalText: top?.value ?? "No signal yet", signalAge: top ? ago(top.observedAt, now) : "",
    signalCount: signals.length,
    score: c.score, scoreLabel: c.score == null ? "–" : String(c.score), scoreTone: scoreTone(c.score),
    ...whyLine(c), status: c.status, statusTone: toneOf(c.status),
  };
}

function matches(r: LeadRow, f: LeadFilters): boolean {
  if (f.q && !`${r.name} ${r.domain} ${r.signalText}`.toLowerCase().includes(f.q)) return false;
  if (f.status && r.status !== f.status) return false;
  if (f.kind && r.signalKind !== f.kind) return false;
  if (f.minScore && (r.score ?? 0) < f.minScore) return false;
  return true;
}

export function toLeadsView(companies: Company[], signals: Signal[], f: LeadFilters, now: Date): LeadsView {
  const by = new Map<string, Signal[]>();
  for (const s of signals) by.set(s.companyId, [...(by.get(s.companyId) ?? []), s]);
  const all = companies
    .map((c) => toRow(c, by.get(c.id) ?? [], now))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name));
  return {
    rows: all.filter((r) => matches(r, f)),
    total: all.length,
    counts: {
      qualified: companies.filter((c) => c.qualified === true).length,
      toQualify: companies.filter((c) => c.qualified == null).length,
      contacted: companies.filter((c) => c.status === "contacted").length,
      replied: companies.filter((c) => c.status === "replied").length,
    },
    kinds: [...new Set(signals.map((s) => s.kind))].sort(),
    statuses: ["new", "qualified", "contacted", "replied", "won", "lost", "rejected"],
    filtered: !!(f.q || f.status || f.kind || f.minScore),
  };
}
