import { test } from "node:test";
import assert from "node:assert/strict";
import { runChecks, withOptOut, wordCount, type CheckContext, type CheckLead } from "./checks";

const ctx = (o: Partial<CheckContext> = {}): CheckContext => ({
  suppressedEmails: new Set(), suppressedDomains: new Set(), contactedEmails: new Set(), contactedDomains: new Set(), maxWords: 90, ...o,
});
const lead = (o: Partial<CheckLead> = {}): CheckLead => ({
  personId: "p1", email: "ana@acme.example", verifyStatus: "ok", suppressed: false, companyDomain: "acme.example",
  companyQualified: true, evidence: "client portal on Softr at portal.acme.example", excluded: false,
  body: "Hi Ana, your client portal loads in 5.4 s on a phone.", subject: "portal speed", ...o,
});

test("a clean lead passes", () => {
  assert.equal(runChecks([lead()], ctx()).pass.length, 1);
});

test("catch_all never reaches the sender", () => {
  assert.deepEqual(runChecks([lead({ verifyStatus: "catch_all" })], ctx()).fail, [{ personId: "p1", reason: "verifier says catch_all (only ok is sendable)" }]);
});

test("suppression works on email and on domain", () => {
  assert.equal(runChecks([lead()], ctx({ suppressedDomains: new Set(["acme.example"]) })).fail[0].reason, "suppressed");
  assert.equal(runChecks([lead({ email: "ANA@acme.example" })], ctx({ suppressedEmails: new Set(["ana@acme.example"]) })).fail[0].reason, "suppressed");
});

test("a company we already emailed is skipped, and duplicates in a batch are caught", () => {
  assert.equal(runChecks([lead()], ctx({ contactedDomains: new Set(["acme.example"]) })).fail[0].reason, "already contacted");
  const r = runChecks([lead(), lead({ personId: "p2" })], ctx());
  assert.deepEqual(r.fail, [{ personId: "p2", reason: "duplicate in this batch" }]);
});

test("unqualified, excluded, no evidence and long copy are refused", () => {
  assert.equal(runChecks([lead({ companyQualified: null })], ctx()).fail[0].reason, "company not qualified");
  assert.equal(runChecks([lead({ excluded: true })], ctx()).fail[0].reason, "excluded segment or competitor");
  assert.equal(runChecks([lead({ evidence: " " })], ctx()).fail[0].reason, "no evidence line");
  assert.match(runChecks([lead({ body: "word ".repeat(91) })], ctx()).fail[0].reason, /91 words/);
});

test("opt-out line is appended once and can be turned off", () => {
  const line = "If this isn't relevant, reply \"no\" and I won't write again.";
  assert.equal(withOptOut("Hi.\n\nSam", line), `Hi.\n\nSam\n\n${line}`);
  assert.equal(withOptOut(`Hi.\n\n${line}`, line), `Hi.\n\n${line}`);
  assert.equal(withOptOut("Hi.", ""), "Hi.");
  assert.equal(wordCount("  one two\nthree "), 3);
});
