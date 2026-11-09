import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "./store";
import { queueLocal, readLocalView, rescoreLocal } from "./views";
import { runLocalSource } from "./source";
import { parseMailboxes, sendLocal } from "./send";
import { buildReport } from "./report";
import { toDollar } from "./sql";

// Local mode (no app) on an in-memory SQLite store. Providers must never be called in these tests.
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => { throw new Error("provider must not be called"); }) as typeof fetch;
process.on("exit", () => { globalThis.fetch = realFetch; });

async function seeded() {
  const s = await LocalStore.open(":memory:");
  await s.ingest({
    companies: [
      { domain: "www.Acme.example", name: "Acme", country: "UK", size_band: "11-50", tech: ["Softr"], source: "urlscan" },
      { domain: "beta.example", name: "Beta" },
    ],
    signals: [{ domain: "acme.example", kind: "tech", value: "Softr (portal.acme.example)", observed_at: "2026-11-08T00:00:00Z" }],
  });
  return s;
}

test("ingest is idempotent by domain and normalises the domain", async () => {
  const s = await seeded();
  const again = await s.ingest({ companies: [{ domain: "acme.example", name: "Acme Ltd" }] });
  assert.equal(again.written.companies, 1);
  const rows = await s.all("select domain, name from companies order by domain");
  assert.deepEqual(rows, [{ domain: "acme.example", name: "Acme Ltd" }, { domain: "beta.example", name: "Beta" }]);
  const bad = await s.ingest({ signals: [{ domain: "nope.example", kind: "tech", value: "x" }] });
  assert.equal(bad.skipped[0].reason, "needs a known company, a valid kind and a value");
});

test("work lists and scoring match the app's shapes", async () => {
  const s = await seeded();
  const q = await readLocalView(s, "to-qualify", new URLSearchParams()) as { rows: { domain: string; tech: string[] }[] };
  assert.deepEqual(q.rows.map((r) => r.domain), ["acme.example", "beta.example"]);
  assert.deepEqual(q.rows[0].tech, ["Softr"]);
  await s.ingest({ companies: [{ domain: "acme.example", qualified: true, evidence: "Client portal on Softr", status: "qualified" }] });
  await rescoreLocal(s, null, new Date("2026-11-09T10:00:00Z"));
  const c = await s.get("select score, why from companies where domain = 'acme.example'");
  assert.equal(c?.score, 48);
  assert.deepEqual(c?.why, ["Fit 1: any country; size 11-50 (weight 1); any tool", "Trigger 0.48: tech: Softr (portal.acme.example) (1 d ago, 0.48)"]);
});

test("queue runs the send checks: only verifier ok at a qualified company with an evidence line", async () => {
  const s = await seeded();
  await s.ingest({
    companies: [{ domain: "acme.example", qualified: true, evidence: "Client portal on Softr" }],
    people: [
      { domain: "acme.example", name: "Dana Whitlock", email: "dana@acme.example", verify_status: "ok", verify_source: "millionverifier" },
      { domain: "beta.example", name: "Bo", email: "bo@beta.example", verify_status: "catch_all", verify_source: "millionverifier" },
    ],
  });
  await s.ingest({ drafts: [
    { email: "dana@acme.example", step: 1, subject: "portal speed", body: "Hi Dana,\n\nShort note." },
    { email: "bo@beta.example", step: 1, subject: "hello", body: "Hi Bo" },
  ] });
  const ids = (await s.all("select id, email from people order by email")).map((r) => String(r.id));
  const out = await queueLocal(s, ids);
  assert.equal(out.queued, 1);
  assert.match(out.refused[0].reason, /catch_all|not qualified/);
  const again = await s.ingest({ drafts: [{ email: "dana@acme.example", step: 1, subject: "x", body: "y" }] });
  assert.equal(again.skipped[0].reason, "already queued");
});

test("paid contact finding is refused on an unqualified company, and logged, without calling the provider", async () => {
  const s = await seeded();
  const beta = await s.get("select id from companies where domain = 'beta.example'");
  const out = await runLocalSource(s, { source: "monid", params: { path: "run", maxUsd: 0.1, body: {} }, companyId: String(beta?.id) }, new Date("2026-11-09T10:00:00Z"));
  assert.equal(out.status, 403);
  assert.match(String(out.body.refused), /not qualified/);
  assert.deepEqual(await s.all("select status from sources_runs"), [{ status: "refused" }]);
});

test("the same input inside 24 h is refused by the ledger", async () => {
  const s = await seeded();
  await s.sql.run("insert into sources_runs (id, source, input_hash, status, started_at) values ('r0', 'urlscan', ?, 'ok', '2026-11-09T08:00:00.000Z')",
    [(await import("../ledger")).inputHash("urlscan", { q: "domain:softr-files.com" })]);
  const out = await runLocalSource(s, { source: "urlscan", params: { q: "domain:softr-files.com" }, companyId: null }, new Date("2026-11-09T10:00:00Z"));
  assert.equal(out.status, 409);
});

test("mailboxes come from MAILBOX_n env lines and need a password", () => {
  const boxes = parseMailboxes({ MAILBOX_1: "me@send.example|Mark|smtp.gmail.com:465|imap.gmail.com:993|20", MAILBOX_1_PASSWORD: "x" });
  assert.equal(boxes[0].row.email, "me@send.example");
  assert.equal(boxes[0].row.smtp_port, 465);
  assert.equal(boxes[0].row.daily_cap, 20);
  assert.throws(() => parseMailboxes({ MAILBOX_2: "me@send.example|Mark|smtp.gmail.com:465" }), /MAILBOX_2_PASSWORD/);
});

test("send plans nothing outside the lead's window (dry run)", async () => {
  const s = await seeded();
  await s.ingest({ companies: [{ domain: "acme.example", qualified: true, evidence: "e" }], people: [{ domain: "acme.example", name: "Dana", email: "dana@acme.example", verify_status: "ok", verify_source: "t" }] });
  await s.ingest({ drafts: [{ email: "dana@acme.example", step: 1, subject: "s", body: "b" }] });
  await queueLocal(s, [(await s.all("select id from people")).map((r) => String(r.id))[0]]);
  const boxes = parseMailboxes({ MAILBOX_1: "me@send.example|Me|smtp.example.com:465|imap.example.com:993|15", MAILBOX_1_PASSWORD: "x" });
  const night = await sendLocal(s, boxes, { dryRun: true, now: new Date("2026-11-09T22:00:00Z") });
  assert.deepEqual(night.skipped, { "outside send window": 1 });
  const day = await sendLocal(s, boxes, { dryRun: true, now: new Date("2026-11-10T10:00:00Z") });
  assert.equal(day.planned.length, 1);
});

test("report renders leads and escapes text", async () => {
  const s = await seeded();
  await s.ingest({ companies: [{ domain: "acme.example", name: "Acme <script>" }] });
  const html = buildReport(await s.snapshot(), { title: "Acme leads", css: "", now: new Date("2026-11-09T10:00:00Z"), accent: "#7a3cff" });
  assert.match(html, /<title>Acme leads<\/title>/);
  assert.match(html, /Acme &lt;script&gt;/);
  assert.match(html, /--accent: #7a3cff/);
});

test("postgres placeholders", () => {
  assert.equal(toDollar("select ? , ?"), "select $1 , $2");
});
