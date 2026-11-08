import type { Caps } from "../caps";
import type { SourceKey } from "../guard";
import { SOURCES } from "../sources/registry";
import type { SourceRun } from "../types";
import { ago, pct, toneOf, usd, type Tone } from "./format";

// Sources & runs view model. Pure. Yield = rows kept ÷ rows in, over all ok runs.

export type SourceRow = {
  key: SourceKey; label: string; enabled: boolean; paid: boolean;
  runs: number; refused: number; rowsIn: number; rowsKept: number; yieldPct: string;
  cost: string; costMonth: string; lastRun: string;
  capLabel: string; usedToday: number; capToday: number | null; capText: string; capRatio: number; capTone: Tone;
};

export type SourcesView = {
  rows: SourceRow[];
  monthSpend: string; monthCap: string; monthRatio: number;
  recent: { id: string; source: string; when: string; status: string; tone: Tone; rows: string; cost: string; note: string }[];
};

function capFor(key: SourceKey, caps: Caps): number | null {
  const map: Partial<Record<SourceKey, number>> = {
    httparchive: caps.bigqueryGb, urlscan: caps.urlscanSearches, apollo: caps.apolloPages,
    millionverifier: caps.mvChecks, monid: caps.monidUsd, apify: caps.apifyUsd,
  };
  return map[key] ?? null;
}

const usesUsd = (key: SourceKey) => key === "monid" || key === "apify";

function capTone(ratio: number): Tone {
  if (ratio >= 1) return "bad";
  if (ratio >= 0.8) return "warn";
  return "good";
}

function sourceRow(key: SourceKey, runs: SourceRun[], caps: Caps, enabled: boolean, dayStart: string, monthStart: string, now: Date): SourceRow {
  const mine = runs.filter((r) => r.source === key);
  const done = mine.filter((r) => r.status === "ok" || r.status === "pending");
  const today = done.filter((r) => r.startedAt >= dayStart);
  const usedToday = today.reduce((s, r) => s + (usesUsd(key) ? r.costUsd : r.units), 0);
  const cap = capFor(key, caps);
  const ratio = cap ? usedToday / cap : cap === 0 ? 1 : 0;
  const fmt = (n: number) => (usesUsd(key) ? usd(n) : Number.isInteger(n) ? String(n) : n.toFixed(1));
  const rowsIn = done.reduce((s, r) => s + r.rowsIn, 0);
  const rowsKept = done.reduce((s, r) => s + r.rowsKept, 0);
  const last = mine.map((r) => r.startedAt).sort().at(-1) ?? null;
  return {
    key, label: SOURCES[key].label, enabled, paid: SOURCES[key].paid,
    runs: done.length, refused: mine.filter((r) => r.status === "refused").length, rowsIn, rowsKept, yieldPct: pct(rowsKept, rowsIn),
    cost: usd(done.reduce((s, r) => s + r.costUsd, 0)), costMonth: usd(done.filter((r) => r.startedAt >= monthStart).reduce((s, r) => s + r.costUsd, 0)),
    lastRun: ago(last, now), capLabel: SOURCES[key].capLabel, usedToday, capToday: cap,
    capText: cap == null ? "no cap" : cap === 0 ? "off (cap 0)" : `${fmt(usedToday)} of ${fmt(cap)}`,
    capRatio: Math.min(1, ratio), capTone: cap === 0 ? "neutral" : capTone(ratio),
  };
}

export function toSourcesView(runs: SourceRun[], caps: Caps, enabled: Record<string, boolean>, now: Date): SourcesView {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const keys = Object.keys(SOURCES) as SourceKey[];
  const monthSpend = runs.filter((r) => r.startedAt >= monthStart && r.status !== "refused" && r.status !== "failed").reduce((s, r) => s + r.costUsd, 0);
  return {
    rows: keys.map((k) => sourceRow(k, runs, caps, enabled[k] === true, dayStart, monthStart, now)),
    monthSpend: usd(monthSpend), monthCap: usd(caps.monthlyUsd), monthRatio: caps.monthlyUsd > 0 ? Math.min(1, monthSpend / caps.monthlyUsd) : 1,
    recent: [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 25).map((r) => ({
      id: r.id, source: SOURCES[r.source as SourceKey]?.label ?? r.source, when: ago(r.startedAt, now), status: r.status, tone: toneOf(r.status),
      rows: r.status === "refused" ? "–" : `${r.rowsIn} → ${r.rowsKept}`, cost: usd(r.costUsd), note: r.note ?? "",
    })),
  };
}
