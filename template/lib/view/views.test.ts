import { test } from "node:test";
import assert from "node:assert/strict";
import { toCompanyView } from "./company-view";
import { toSourcesView } from "./sources-view";
import { toOutreachView } from "./outreach-view";
import { demoCompanies, demoMailboxes, demoMessages, demoPeople, demoRuns, demoSignals, DEMO_NOW } from "../demo";
import { DEFAULT_CAPS } from "../caps";

test("company view: why lines split into parts, timeline newest first, sendable only for ok", () => {
  const c = demoCompanies.find((x) => x.id === "c01");
  assert.ok(c);
  const v = toCompanyView(c, demoSignals.filter((s) => s.companyId === "c01"), demoPeople.filter((p) => p.companyId === "c01"), demoMessages.filter((m) => m.companyId === "c01"), DEMO_NOW);
  assert.equal(v.why[0].label, "Fit");
  assert.deepEqual(v.why[0].parts, ["UK is a target country", "size 11-50 (weight 1)", "runs Softr, Airtable"]);
  assert.equal(v.timeline[0].kind, "job");
  assert.deepEqual(v.people.map((p) => [p.name, p.sendable]), [["Dana Whitlock", true], ["Sam Okafor", false]]);
  assert.equal(v.thread[0].step, "Email 1 · Dana Whitlock");
});

test("sources view: yield, cap use and refused counts", () => {
  const v = toSourcesView(demoRuns, DEFAULT_CAPS, { httparchive: true, urlscan: true, millionverifier: true, monid: true, apollo: true }, DEMO_NOW);
  const mv = v.rows.find((r) => r.key === "millionverifier");
  assert.ok(mv);
  assert.equal(mv.yieldPct, "51%"); // 30 of 59 ok
  assert.equal(mv.capText, "59 of 80");
  assert.equal(mv.capTone, "good");
  const monid = v.rows.find((r) => r.key === "monid");
  assert.equal(monid?.refused, 1);
  assert.equal(monid?.capText, "$0.38 of $1.50");
  assert.equal(v.rows.find((r) => r.key === "apify")?.capText, "off (cap 0)");
  assert.equal(v.monthSpend, "$0.60");
  assert.equal(v.recent[0].status, "refused");
});

test("outreach view: drafts are step-1 only, follow-ups first in the queue, totals", () => {
  const v = toOutreachView(demoMessages, demoPeople, demoCompanies, demoMailboxes, DEMO_NOW);
  assert.deepEqual(v.drafts.map((d) => d.id), ["m1"]);
  assert.deepEqual(v.queue.map((d) => d.step), ["Follow-up 1", "Email 1"]);
  assert.equal(v.replies[0].status, "question");
  assert.deepEqual(v.totals, { sentToday: 10, capToday: 30, drafts: 1, queued: 2, replies: 1 });
});
