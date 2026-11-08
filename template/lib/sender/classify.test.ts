import { test } from "node:test";
import assert from "node:assert/strict";
import { bouncedAddress, classifyInbound } from "./classify";

const m = (o: Partial<{ from: string; subject: string; text: string; autoSubmitted: string }>) => ({ from: "ana@acme.example", subject: "Re: portal speed", text: "Sounds good, when?", ...o });

test("bounces, auto-replies, opt-outs and replies", () => {
  assert.equal(classifyInbound(m({ from: "MAILER-DAEMON@mx.example" })), "bounce");
  assert.equal(classifyInbound(m({ subject: "Undeliverable: portal speed" })), "bounce");
  assert.equal(classifyInbound(m({ subject: "Out of office until Monday" })), "auto_reply");
  assert.equal(classifyInbound(m({ autoSubmitted: "auto-replied" })), "auto_reply");
  assert.equal(classifyInbound(m({ text: "No\n\n> On Tue you wrote" })), "unsubscribe");
  assert.equal(classifyInbound(m({ text: "Please remove me from your list." })), "unsubscribe");
  assert.equal(classifyInbound(m({ text: "No idea how you found this, but yes, send the check." })), "reply");
  assert.equal(classifyInbound(m({})), "reply");
});

test("finds the bounced recipient in the report", () => {
  assert.equal(bouncedAddress("Delivery to ANA@acme.example failed permanently", ["bo@x.example", "ana@acme.example"]), "ana@acme.example");
  assert.equal(bouncedAddress("nothing here", ["ana@acme.example"]), null);
});
