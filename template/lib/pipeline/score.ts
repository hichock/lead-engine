import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SCORING, scoreCompany, type ScoringConfig } from "../scoring";
import type { SignalKind } from "../types";
import { allRows } from "../supabase/admin";

// Recomputes score, fit, trigger and why for companies (all, or the given ids) from their signals.
export function readScoring(stored: unknown): ScoringConfig {
  const s = (stored && typeof stored === "object" ? stored : {}) as Partial<ScoringConfig>;
  return {
    ...DEFAULT_SCORING,
    ...(Array.isArray(s.countries) ? { countries: s.countries.map(String) } : {}),
    ...(Array.isArray(s.tools) ? { tools: s.tools.map(String) } : {}),
    ...(s.sizeBands && typeof s.sizeBands === "object" ? { sizeBands: s.sizeBands } : {}),
    ...(s.kindWeights && typeof s.kindWeights === "object" ? { kindWeights: { ...DEFAULT_SCORING.kindWeights, ...s.kindWeights } } : {}),
    ...(Number(s.halfLifeDays) > 0 ? { halfLifeDays: Number(s.halfLifeDays) } : {}),
  };
}

type Row = { id: string; country: string | null; size_band: string | null; tech: string[]; qualified: boolean | null };
type Sig = { company_id: string; kind: SignalKind; value: string; observed_at: string };

export async function rescore(db: SupabaseClient, ids: string[] | null, now = new Date()) {
  const { data: cfgRow } = await db.from("settings").select("value").eq("key", "scoring").maybeSingle();
  const cfg = readScoring(cfgRow?.value);
  const companies = await allRows<Row>((from, to) => {
    let q = db.from("companies").select("id, country, size_band, tech, qualified").order("id").range(from, to);
    if (ids?.length) q = q.in("id", ids);
    return q;
  });
  const signals = await allRows<Sig>((from, to) => {
    let q = db.from("signals").select("company_id, kind, value, observed_at").order("id").range(from, to);
    if (ids?.length) q = q.in("company_id", ids);
    return q;
  });
  const by = new Map<string, Sig[]>();
  for (const s of signals) by.set(s.company_id, [...(by.get(s.company_id) ?? []), s]);
  let updated = 0;
  for (const c of companies) {
    const r = scoreCompany({ country: c.country, sizeBand: c.size_band, tech: c.tech ?? [], qualified: c.qualified,
      signals: (by.get(c.id) ?? []).map((s) => ({ kind: s.kind, value: s.value, observedAt: s.observed_at })) }, now, cfg);
    const { error } = await db.from("companies").update({ score: r.score, fit: r.fit, trigger: r.trigger, why: r.why }).eq("id", c.id);
    if (error) throw new Error(`Could not save score: ${error.message}`);
    updated++;
  }
  return { updated };
}
