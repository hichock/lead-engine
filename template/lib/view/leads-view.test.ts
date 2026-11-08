import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFilters, toLeadsView } from "./leads-view";
import { demoCompanies, demoSignals, DEMO_NOW } from "../demo";

const none = parseFilters({});

test("rows are ranked by score, unscored last", () => {
  const v = toLeadsView(demoCompanies, demoSignals, none, DEMO_NOW);
  assert.equal(v.total, 12);
  const scores = v.rows.map((r) => r.score ?? -1);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  assert.equal(v.rows[0].domain, "harbourline-logistics.example");
});

test("the row shows the newest signal, the fit reasons and both factors", () => {
  const row = v0().rows.find((r) => r.id === "c01");
  assert.ok(row);
  assert.equal(row.signalKind, "job");
  assert.equal(row.signalAge, "2 d ago");
  assert.equal(row.signalCount, 4);
  assert.equal(row.why, "UK is a target country · size 11-50 (weight 1) · runs Softr, Airtable");
  assert.equal(row.factors, "fit 1 × trigger 0.96");
});

test("rejected companies show the qualify reason instead of a score reason", () => {
  const row = v0().rows.find((r) => r.id === "c12");
  assert.ok(row);
  assert.match(row.why, /Phishing/);
  assert.equal(row.statusTone, "bad");
});

test("filters combine", () => {
  const v = toLeadsView(demoCompanies, demoSignals, parseFilters({ status: "qualified", kind: "tech", min: "20" }), DEMO_NOW);
  assert.ok(v.filtered);
  assert.ok(v.rows.length > 0);
  assert.ok(v.rows.every((r) => r.status === "qualified" && r.signalKind === "tech" && (r.score ?? 0) >= 20));
  assert.equal(toLeadsView(demoCompanies, demoSignals, parseFilters({ q: "harbour" }), DEMO_NOW).rows.length, 1);
});

test("counts", () => {
  assert.deepEqual(v0().counts, { qualified: 8, toQualify: 2, contacted: 1, replied: 1 });
});

function v0() {
  return toLeadsView(demoCompanies, demoSignals, none, DEMO_NOW);
}
