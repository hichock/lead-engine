import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runSource, parseCall } from "./run";

// A tiny stand-in for the Supabase client: every query resolves to rows from `tables`, writes are recorded.
type Rows = Record<string, Record<string, unknown>[]>;
function fakeDb(tables: Rows) {
  const writes: { table: string; op: string; row: unknown }[] = [];
  const from = (table: string) => {
    let single = false;
    const q: Record<string, unknown> = {};
    const chain = () => q;
    for (const m of ["select", "eq", "in", "gte", "gt", "is", "not", "order", "limit", "range"]) q[m] = chain;
    q.maybeSingle = () => { single = true; return q; };
    q.single = () => { single = true; return q; };
    for (const op of ["insert", "update", "upsert"]) q[op] = (row: unknown) => { writes.push({ table, op, row }); return q; };
    q.then = (ok: (v: unknown) => void) => {
      const rows = tables[table] ?? [];
      const data = single ? (table === "sources_runs" ? { id: "run-1" } : rows[0] ?? null) : rows;
      ok({ data, error: null });
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, writes };
}

const realFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = (async () => { fetchCalls++; throw new Error("provider must not be called"); }) as typeof fetch;
afterEach(() => { fetchCalls = 0; });
process.on("exit", () => { globalThis.fetch = realFetch; });

const settings = (enabled: Record<string, boolean>) => [{ value: enabled }];
const monidCall = parseCall({ source: "monid", params: { path: "run", body: { endpoint: "hunter/domain-search" }, maxUsd: 0.05 }, company_id: "c1" });

test("route refuses paid contact finding for an unqualified company, without calling the provider", async () => {
  if (typeof monidCall === "string") throw new Error(monidCall);
  const { db, writes } = fakeDb({ settings: settings({ monid: true }), companies: [{ qualified: false, evidence: "x" }], sources_runs: [] });
  const out = await runSource(db, monidCall, new Date("2026-11-09T10:00:00Z"));
  assert.equal(out.status, 403);
  assert.match(String(out.body.refused), /not qualified/);
  assert.equal(fetchCalls, 0);
  assert.deepEqual(writes.map((w) => [w.table, w.op, (w.row as { status: string }).status]), [["sources_runs", "insert", "refused"]]);
});

test("route refuses a call over the daily cap, without calling the provider", async () => {
  if (typeof monidCall === "string") throw new Error(monidCall);
  const { db } = fakeDb({ settings: settings({ monid: true }), companies: [{ qualified: true, evidence: "x" }], sources_runs: [{ cost_usd: 1.48, units: 0 }] });
  const out = await runSource(db, monidCall, new Date("2026-11-09T10:00:00Z"));
  assert.equal(out.status, 403);
  assert.equal(fetchCalls, 0);
});

test("route refuses the same input twice in 24 h (ledger)", async () => {
  const call = parseCall({ source: "urlscan", params: { q: "domain:softr-files.com" } });
  if (typeof call === "string") throw new Error(call);
  const { db } = fakeDb({ sources_runs: [{ id: "r0", status: "ok", started_at: "2026-11-09T08:00:00Z", provider_job_id: null }] });
  const out = await runSource(db, call, new Date("2026-11-09T10:00:00Z"));
  assert.equal(out.status, 409);
  assert.equal(fetchCalls, 0);
});

test("parseCall rejects unknown sources", () => {
  assert.match(String(parseCall({ source: "clay" })), /source must be one of/);
});
