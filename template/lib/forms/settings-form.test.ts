import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCaps, parseEnabled, parseMailbox, parseSend } from "./settings-form";
import { DEFAULT_CAPS } from "../caps";

const capsFields = Object.fromEntries(Object.entries(DEFAULT_CAPS).map(([k, v]) => [k, String(v)]));

test("caps: valid numbers pass, blanks and negatives fail", () => {
  assert.deepEqual(parseCaps(capsFields), { ok: true, value: DEFAULT_CAPS });
  assert.equal(parseCaps({ ...capsFields, monidUsd: "" }).ok, false);
  assert.equal(parseCaps({ ...capsFields, apifyUsd: "-1" }).ok, false);
  assert.equal(parseCaps({ ...capsFields, bigqueryGbPerQuery: "5000" }).ok, false);
});

test("send settings: window, delays and the opt-out switch", () => {
  const r = parseSend({ windowStartHour: "9", windowEndHour: "17", stepDelays: "3, 5", minGapMinutes: "8", newPerDay: "15", optOutLine: "Reply no to stop.", autoQueue: "on" });
  assert.ok(r.ok);
  assert.deepEqual(r.ok && r.value, { windowStartHour: 9, windowEndHour: 17, minGapMinutes: 8, stepDelays: [3, 5], newPerDay: 15, optOutLine: "Reply no to stop.", autoQueue: true });
  assert.equal(parseSend({ windowStartHour: "17", windowEndHour: "9", stepDelays: "3", minGapMinutes: "8", newPerDay: "15" }).ok, false);
  assert.equal(parseSend({ windowStartHour: "9", windowEndHour: "17", stepDelays: "0", minGapMinutes: "8", newPerDay: "15" }).ok, false);
});

test("sources switches", () => {
  const e = parseEnabled({ src_urlscan: "on" });
  assert.equal(e.urlscan, true);
  assert.equal(e.apify, false);
});

test("mailbox: app password spaces are removed, cap is bounded", () => {
  const r = parseMailbox({ email: "Alex@Try.example", fromName: "Alex", password: "abcd efgh ijkl mnop", dailyCap: "15" });
  assert.ok(r.ok);
  assert.equal(r.ok && r.value.password, "abcdefghijklmnop");
  assert.equal(r.ok && r.value.email, "alex@try.example");
  assert.equal(parseMailbox({ email: "a@b.example", fromName: "A", password: "abcdefghijkl", dailyCap: "80" }).ok, false);
});
