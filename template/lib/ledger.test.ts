import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, inputHash, ledgerDecision } from "./ledger";

const now = new Date("2026-11-09T12:00:00Z");

test("hash ignores key order and undefined values", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [3, { y: 1, x: 2 }] } }), '{"a":{"c":[3,{"x":2,"y":1}],"d":2},"b":1}');
  assert.equal(inputHash("urlscan", { q: "x", size: 100 }), inputHash("urlscan", { size: 100, q: "x", extra: undefined }));
  assert.notEqual(inputHash("urlscan", { q: "x" }), inputHash("apify", { q: "x" }));
});

test("a fresh input runs", () => {
  assert.deepEqual(ledgerDecision([], now), { action: "run" });
});

test("the same input inside 24 h is refused", () => {
  const d = ledgerDecision([{ status: "ok", startedAt: "2026-11-09T02:00:00Z", providerJobId: null }], now);
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, /~14 h/);
});

test("the same input after 24 h runs again", () => {
  assert.deepEqual(ledgerDecision([{ status: "ok", startedAt: "2026-11-08T11:59:00Z", providerJobId: null }], now), { action: "run" });
});

test("a failed run does not block a retry", () => {
  assert.deepEqual(ledgerDecision([{ status: "failed", startedAt: "2026-11-09T11:00:00Z", providerJobId: null }], now), { action: "run" });
});

test("a pending paid job is resumed, not re-billed", () => {
  const d = ledgerDecision([{ status: "pending", startedAt: "2026-11-09T11:00:00Z", providerJobId: "job_123" }], now);
  assert.deepEqual(d, { action: "resume", providerJobId: "job_123" });
});
