import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SCORING, rank, scoreCompany, signalStrength } from "./scoring";

const now = new Date("2026-11-09T12:00:00Z");
const cfg = { ...DEFAULT_SCORING, countries: ["uk", "us"], tools: ["airtable", "softr"] };

test("a fresh job post at a target company scores high and says why", () => {
  const r = scoreCompany(
    { country: "UK", sizeBand: "11-50", tech: ["Airtable"], qualified: true, signals: [{ kind: "job", value: "ops manager role names Airtable", observedAt: "2026-11-09T12:00:00Z" }] },
    now, cfg,
  );
  assert.equal(r.fit, 1);
  assert.equal(r.trigger, 0.7);
  assert.equal(r.score, 70);
  assert.deepEqual(r.why, [
    "Fit 1: UK is a target country; size 11-50 (weight 1); runs Airtable",
    "Trigger 0.7: job: ops manager role names Airtable (0 d ago, 0.7)",
  ]);
});

test("a signal loses half its strength after the half-life", () => {
  assert.equal(signalStrength(cfg, { kind: "tech", observedAt: "2026-10-10T12:00:00Z" }, now), 0.25);
});

test("two signals add up with diminishing returns", () => {
  const r = scoreCompany(
    { country: "US", sizeBand: "11-50", tech: ["Softr"], qualified: true, signals: [
      { kind: "tech", value: "Softr portal", observedAt: "2026-11-09T12:00:00Z" },
      { kind: "comment", value: "commented on a migration post", observedAt: "2026-11-09T12:00:00Z" },
    ] },
    now, cfg,
  );
  assert.equal(r.trigger, 0.8); // 1 - (1-0.5)(1-0.6)
  assert.equal(r.score, 80);
});

test("an unqualified company scores 0", () => {
  const r = scoreCompany({ country: "UK", sizeBand: "11-50", tech: [], qualified: false, signals: [{ kind: "request", value: "x", observedAt: "2026-11-09T12:00:00Z" }] }, now, cfg);
  assert.equal(r.score, 0);
  assert.equal(r.why[0], "Fit 0: not qualified");
});

test("no signal means no trigger, whatever the fit", () => {
  const r = scoreCompany({ country: "UK", sizeBand: "11-50", tech: ["Airtable"], qualified: true, signals: [] }, now, cfg);
  assert.equal(r.score, 0);
  assert.equal(r.why[1], "Trigger 0: no signal yet");
});

test("outside the target countries lowers fit", () => {
  const r = scoreCompany({ country: "DE", sizeBand: "11-50", tech: ["Airtable"], qualified: true, signals: [{ kind: "job", value: "x", observedAt: "2026-11-09T12:00:00Z" }] }, now, cfg);
  assert.equal(r.fit, 0.3);
  assert.equal(r.score, 21);
});

test("rank puts the stronger trigger first on equal scores", () => {
  const a = { id: "a", result: { score: 40, fit: 1, trigger: 0.4, why: [] } };
  const b = { id: "b", result: { score: 40, fit: 0.5, trigger: 0.8, why: [] } };
  const c = { id: "c", result: { score: 60, fit: 1, trigger: 0.6, why: [] } };
  assert.deepEqual(rank([a, b, c]).map((x) => x.id), ["c", "b", "a"]);
});
