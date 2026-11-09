import { test } from "node:test";
import assert from "node:assert/strict";
import { cell, leadsCsv, sequencerCsv } from "./export-csv";
import type { Company, Message, Person } from "../types";

const co = (o: Partial<Company>): Company => ({
  id: "c1", domain: "acme.example", name: "Acme", country: "UK", sizeBand: "11-50", tech: [], source: "urlscan", evidence: "Portal on Softr",
  qualified: true, qualifyReason: null, score: 70, why: ["Fit 1", "Trigger 0.7"], status: "qualified", createdAt: "2026-11-01", ...o,
});
const person = (o: Partial<Person>): Person => ({
  id: "p1", companyId: "c1", name: "Dana Whitlock", role: "Ops Director", email: "dana@acme.example", verifyStatus: "ok",
  verifySource: "millionverifier", linkedinUrl: null, offerKey: null, suppressed: false, ...o,
});
const msg = (o: Partial<Message>): Message => ({
  id: "m1", personId: "p1", companyId: "c1", channel: "email", mailbox: null, step: 1, subject: "portal speed", body: "Hi Dana,\n\nText",
  direction: "out", class: null, status: "draft", sendAfter: null, sentAt: null, ...o,
});

test("cells are quoted when needed and never start a formula", () => {
  assert.equal(cell("plain"), "plain");
  assert.equal(cell('a "b", c'), '"a ""b"", c"');
  assert.equal(cell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(cell(null), "");
  assert.equal(cell(["x", "y"]), "x | y");
});

test("leads CSV: one row per company, best contact first, highest score first", () => {
  const csv = leadsCsv(
    [co({ id: "c2", domain: "b.example", name: "B", score: 10 }), co({})],
    [person({ id: "p0", email: "info@acme.example", verifyStatus: "catch_all" }), person({})],
  );
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], "domain,company,country,size_band,status,qualified,score,evidence,why,source,contact_name,contact_role,contact_email,verify_status");
  assert.equal(lines[1], "acme.example,Acme,UK,11-50,qualified,yes,70,Portal on Softr,Fit 1 | Trigger 0.7,urlscan,Dana Whitlock,Ops Director,dana@acme.example,ok");
  assert.equal(lines[2], "b.example,B,UK,11-50,qualified,yes,10,Portal on Softr,Fit 1 | Trigger 0.7,urlscan,,,,");
});

test("sequencer CSV: only verifier-ok, unsuppressed people at qualified companies, with drafts", () => {
  const csv = sequencerCsv(
    [co({}), co({ id: "c3", domain: "c.example", qualified: false })],
    [person({}), person({ id: "p2", email: "x@acme.example", verifyStatus: "catch_all" }), person({ id: "p3", companyId: "c3", email: "y@c.example" }), person({ id: "p4", email: "z@acme.example", suppressed: true })],
    [msg({}), msg({ id: "m2", step: 2, subject: "", body: "Second" })],
  );
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[1], 'dana@acme.example,Dana,Whitlock,Acme,https://acme.example,UK,Ops Director,Portal on Softr,portal speed,"Hi Dana,\n\nText",Second,');
});
