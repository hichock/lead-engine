import { test } from "node:test";
import assert from "node:assert/strict";
import { decideCall, type CallRequest, type SourceDef } from "./guard";
import { DEFAULT_CAPS } from "./caps";

const monid: SourceDef = { key: "monid", stage: "contact", paid: true };
const mv: SourceDef = { key: "millionverifier", stage: "verify", paid: true };
const hta: SourceDef = { key: "httparchive", stage: "discover", paid: false };
const apify: SourceDef = { key: "apify", stage: "research", paid: true };
const fresh = { usdToday: 0, unitsToday: 0, usdThisMonth: 0 };
const qualified = { qualified: true, hasEvidence: true };

const req = (o: Partial<CallRequest>): CallRequest => ({ source: monid, enabled: true, estimate: { usd: 0.03, units: 1 }, company: qualified, ...o });

test("paid contact finding is refused on an unqualified company", () => {
  for (const q of [false, null]) {
    const d = decideCall(req({ company: { qualified: q, hasEvidence: true } }), DEFAULT_CAPS, fresh);
    assert.equal(d.ok, false);
    assert.match((d as { reason: string }).reason, /not qualified/);
  }
});

test("paid contact finding without a company is refused", () => {
  assert.equal(decideCall(req({ company: null }), DEFAULT_CAPS, fresh).ok, false);
});

test("paid contact finding on a qualified company is allowed", () => {
  assert.deepEqual(decideCall(req({}), DEFAULT_CAPS, fresh), { ok: true });
});

test("verification needs an evidence line", () => {
  const d = decideCall(req({ source: mv, company: { qualified: true, hasEvidence: false } }), DEFAULT_CAPS, fresh);
  assert.equal(d.ok, false);
});

test("a call that would pass the daily dollar cap is refused", () => {
  const d = decideCall(req({ estimate: { usd: 0.1, units: 1 } }), DEFAULT_CAPS, { usdToday: 1.45, unitsToday: 40, usdThisMonth: 5 });
  assert.equal(d.ok, false);
  assert.match((d as { reason: string }).reason, /\$1\.45 of \$1\.50/);
});

test("MillionVerifier stops at 80 checks a day", () => {
  assert.equal(decideCall(req({ source: mv, estimate: { usd: 0.0037, units: 1 } }), DEFAULT_CAPS, { usdToday: 0.29, unitsToday: 80, usdThisMonth: 1 }).ok, false);
  assert.equal(decideCall(req({ source: mv, estimate: { usd: 0.0037, units: 1 } }), DEFAULT_CAPS, { usdToday: 0.29, unitsToday: 79, usdThisMonth: 1 }).ok, true);
});

test("the monthly cap stops every paid source", () => {
  const d = decideCall(req({}), DEFAULT_CAPS, { usdToday: 0, unitsToday: 0, usdThisMonth: 29.99 });
  assert.match((d as { reason: string }).reason, /monthly cap/);
});

test("Apify is refused while its budget is 0", () => {
  assert.match((decideCall(req({ source: apify, company: null }), DEFAULT_CAPS, fresh) as { reason: string }).reason, /Apify is off/);
  assert.equal(decideCall(req({ source: apify, company: null }), { ...DEFAULT_CAPS, apifyUsd: 2 }, fresh).ok, true);
});

test("Apify used for contact finding still needs a qualified company", () => {
  const d = decideCall(req({ source: apify, stageOverride: "contact", company: { qualified: false, hasEvidence: false } }), { ...DEFAULT_CAPS, apifyUsd: 5 }, fresh);
  assert.equal(d.ok, false);
});

test("BigQuery needs a dry run and respects the GB caps", () => {
  const base = { source: hta, company: null, estimate: { usd: 0, units: 0 } };
  assert.match((decideCall(req(base), DEFAULT_CAPS, fresh) as { reason: string }).reason, /dry run first/);
  assert.equal(decideCall(req({ ...base, bigqueryDryRunGb: 2.9 }), DEFAULT_CAPS, fresh).ok, true);
  assert.equal(decideCall(req({ ...base, bigqueryDryRunGb: 2.9 }), DEFAULT_CAPS, { usdToday: 0, unitsToday: 28, usdThisMonth: 0 }).ok, false);
  assert.equal(decideCall(req({ ...base, bigqueryDryRunGb: 250 }), { ...DEFAULT_CAPS, bigqueryGb: 1000 }, fresh).ok, false);
});

test("a disabled source is refused", () => {
  assert.equal(decideCall(req({ enabled: false }), DEFAULT_CAPS, fresh).ok, false);
});
