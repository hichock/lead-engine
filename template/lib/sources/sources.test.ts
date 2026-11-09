import { test } from "node:test";
import assert from "node:assert/strict";
import { sliceQueries, uniqueHosts } from "./urlscan";
import { techDomainsSql, techNamesSql } from "./httparchive";
import { estimate, stageOf } from "./registry";
import { decideCall } from "../guard";
import { DEFAULT_CAPS } from "../caps";

test("urlscan: 30 days in 3-day slices, newest first", () => {
  const q = sliceQueries("domain:softr-files.com AND NOT page.domain:softr.app");
  assert.equal(q.length, 10);
  assert.equal(q[0], "(domain:softr-files.com AND NOT page.domain:softr.app) AND date:[now-3d TO now]");
  assert.equal(q[1], "(domain:softr-files.com AND NOT page.domain:softr.app) AND date:[now-6d TO now-3d]");
  assert.equal(q[9], "(domain:softr-files.com AND NOT page.domain:softr.app) AND date:[now-30d TO now-27d]");
});

test("urlscan: one row per host, newest scan kept", () => {
  const h = uniqueHosts([
    { domain: "a.example", url: "1", time: "2026-11-01", title: null, ip: null },
    { domain: "a.example", url: "2", time: "2026-11-03", title: null, ip: null },
    { domain: "b.example", url: "3", time: "2026-11-02", title: null, ip: null },
  ]);
  assert.deepEqual(h.map((x) => x.url).sort(), ["2", "3"]);
});

test("HTTP Archive SQL is built from checked inputs only", () => {
  const sql = techDomainsSql(["Softr", "Bubble"], "2026-10-01", 1000);
  assert.match(sql, /t\.technology IN \('Softr', 'Bubble'\)/);
  assert.match(sql, /date = '2026-10-01'/);
  assert.match(sql, /LIMIT 1000$/);
  assert.throws(() => techDomainsSql(["Softr'; DROP TABLE x; --"], "2026-10-01"));
  assert.throws(() => techDomainsSql(["Softr"], "2026-10-15"));
  assert.throws(() => techNamesSql("2026-10-01", "a'b"));
});

test("cost estimates per call", () => {
  assert.deepEqual(estimate("millionverifier", { emails: ["a@x.example", "b@x.example"] }), { usd: 0.0074, units: 2 });
  assert.deepEqual(estimate("urlscan", { q: "x" }), { usd: 0, units: 1 });
  assert.deepEqual(estimate("urlscan", { q: "x", slices: true }), { usd: 0, units: 10 });
  assert.deepEqual(estimate("apify", { maxUsd: 1.2 }), { usd: 1.2, units: 0 });
  assert.deepEqual(estimate("monid", { maxUsd: 0.1 }), { usd: 0.1, units: 0 });
});

test("Monid free lookups need no company; a paid run is always contact or verify", () => {
  assert.equal(stageOf("monid", { path: "discover" }), "discover");
  assert.equal(stageOf("monid", { path: "inspect" }), "discover");
  assert.equal(stageOf("monid", { path: "wallet/balance" }), "discover");
  assert.equal(stageOf("monid", { path: "run" }), "contact");
  assert.equal(stageOf("monid", { path: "run", stage: "verify" }), "verify");
  assert.equal(stageOf("monid", { path: "run", stage: "discover" }), "contact");
  assert.equal(stageOf("monid", {}), "contact");
});

test("a free Monid discover call without a company is allowed; a paid run without one is refused", () => {
  const source = { key: "monid" as const, stage: "contact" as const, paid: true };
  const fresh = { usdToday: 0, unitsToday: 0, usdThisMonth: 0 };
  const free = { path: "discover", body: { query: "hunter domain search" } };
  assert.deepEqual(decideCall({ source, enabled: true, estimate: estimate("monid", free), stageOverride: stageOf("monid", free), company: null }, DEFAULT_CAPS, fresh), { ok: true });
  const paid = { path: "run", maxUsd: 0.1, stage: "discover" };
  const d = decideCall({ source, enabled: true, estimate: estimate("monid", paid), stageOverride: stageOf("monid", paid), company: null }, DEFAULT_CAPS, fresh);
  assert.equal(d.ok, false);
});
