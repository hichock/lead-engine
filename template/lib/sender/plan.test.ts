import { test } from "node:test";
import assert from "node:assert/strict";
import { planSends, type PlanCandidate, type PlanInput } from "./plan";
import { DEFAULT_SEND } from "../caps";

const now = new Date("2026-11-10T10:00:00Z"); // Tuesday 10:00 London
const mb = (email: string, o: Partial<PlanInput["mailboxes"][0]> = {}) => ({ email, dailyCap: 20, active: true, lastSentAt: null, sentToday: 0, ...o });
const c = (id: string, o: Partial<PlanCandidate> = {}): PlanCandidate => ({ messageId: id, personId: `p-${id}`, step: 1, tz: "Europe/London", mailbox: null, prevSentAt: null, stopped: false, ...o });
const input = (o: Partial<PlanInput>): PlanInput => ({ now, mailboxes: [mb("a@x.example"), mb("b@x.example")], candidates: [], firstEmailsToday: 0, settings: DEFAULT_SEND, ...o });

test("one email per mailbox per tick", () => {
  const p = planSends(input({ candidates: [c("1"), c("2"), c("3")] }));
  assert.deepEqual(p.sends.map((s) => [s.messageId, s.mailbox]), [["1", "a@x.example"], ["2", "b@x.example"]]);
  assert.equal(p.skipped["no mailbox free this tick"], 1);
});

test("a mailbox inside its gap or at its daily cap is not used", () => {
  const p = planSends(input({
    mailboxes: [mb("a@x.example", { lastSentAt: "2026-11-10T09:55:00Z" }), mb("b@x.example", { sentToday: 20 })],
    candidates: [c("1")],
  }));
  assert.equal(p.sends.length, 0);
});

test("the gap has passed after 8 minutes", () => {
  const p = planSends(input({ mailboxes: [mb("a@x.example", { lastSentAt: "2026-11-10T09:52:00Z" })], candidates: [c("1")] }));
  assert.equal(p.sends.length, 1);
});

test("first emails stop at the daily new-lead cap", () => {
  const p = planSends(input({ candidates: [c("1"), c("2")], firstEmailsToday: 14 }));
  assert.equal(p.sends.length, 1);
  assert.equal(p.skipped["daily first-email cap reached"], 1);
});

test("nothing goes out at the weekend or outside the lead's hours", () => {
  assert.equal(planSends(input({ now: new Date("2026-11-08T12:00:00Z"), candidates: [c("1")] })).sends.length, 0);
  assert.equal(planSends(input({ candidates: [c("1", { tz: "America/Chicago" })] })).sends.length, 0); // 04:00 in Chicago
});

test("follow-up 1 waits 3 business days and uses the same mailbox", () => {
  const due = c("f", { step: 2, mailbox: "b@x.example", prevSentAt: "2026-11-05T09:00:00Z" }); // Thu + 3 = Tue 09:00
  const early = c("g", { step: 2, mailbox: "a@x.example", prevSentAt: "2026-11-06T09:00:00Z" }); // Fri + 3 = Wed
  const p = planSends(input({ candidates: [early, due] }));
  assert.deepEqual(p.sends, [{ messageId: "f", personId: "p-f", mailbox: "b@x.example", step: 2 }]);
  assert.equal(p.skipped["follow-up not due"], 1);
});

test("follow-ups go before first emails", () => {
  const p = planSends(input({ mailboxes: [mb("a@x.example")], candidates: [c("new"), c("fu", { step: 3, mailbox: "a@x.example", prevSentAt: "2026-11-02T09:00:00Z" })] }));
  assert.equal(p.sends[0].messageId, "fu");
});

test("a stopped person (reply, bounce, opt-out) gets nothing", () => {
  const p = planSends(input({ candidates: [c("1", { stopped: true })] }));
  assert.equal(p.sends.length, 0);
  assert.equal(p.skipped.stopped, 1);
});
