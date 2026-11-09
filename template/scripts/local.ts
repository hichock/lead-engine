// Lead Engine local mode: the same commands as scripts/le.mjs, run on this machine with no app.
// The store is a SQLite file (default data/lead-engine.db, gitignored) or your own Postgres (LEAD_ENGINE_DB=postgres://…,
// after `npm i pg`).
// Provider keys come from .env.local. Caps, the 24 h ledger and "paid contact work only on qualified companies" are
// the same code as the app. scripts/le.mjs calls this when LEAD_ENGINE_MODE=local.
//
//   le init                                  create the store (idempotent)
//   le read <view> [limit=50] [domain=x]     work lists, as in the app
//   le src '<json>' | ingest <file|json|->  | score [ids] | queue <person_ids>
//   le send [--dry-run]                      one send tick from MAILBOX_n mailboxes (run it every 10–15 min on weekdays)
//   le replies                               read replies and bounces, stop sequences
//   le export [--for=sequencer] [--out=file.csv]
//   le report [--out=docs/report.html] [--title=...] [--accent=#1c675f] [--data=example.json] [--example]
//   le env

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { LocalStore } from "../lib/local/store";
import { LOCAL_VIEWS, queueLocal, readLocalView, rescoreLocal } from "../lib/local/views";
import { runLocalSource } from "../lib/local/source";
import { parseMailboxes, repliesLocal, sendLocal } from "../lib/local/send";
import { buildReport, type ReportData } from "../lib/local/report";
import { leadsCsv, sequencerCsv } from "../lib/view/export-csv";
import { parseCall } from "../lib/sources/run";
import { readCaps } from "../lib/caps";
import { demoCompanies, demoMessages, demoPeople, demoRuns, demoSignals, demoMailboxes, DEMO_NOW } from "../lib/demo";

function loadEnvFile() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const flag = (args: string[], name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? (args.includes(`--${name}`) ? "1" : undefined);
const print = (v: unknown) => process.stdout.write(`${JSON.stringify(v, null, 2)}\n`);
const readJson = (arg: string) => JSON.parse(arg === "-" ? readFileSync(0, "utf8") : existsSync(arg) ? readFileSync(arg, "utf8") : arg);
const write = (file: string, text: string) => { mkdirSync(dirname(resolve(file)), { recursive: true }); writeFileSync(file, text); };

// LEAD_ENGINE_DB: a SQLite file path (default data/lead-engine.db) or a postgres:// URL for your own database.
// (Not DATABASE_URL: many projects already use that name for something else.)
function target(): string {
  const t = process.env.LEAD_ENGINE_DB || "data/lead-engine.db";
  if (/^postgres(ql)?:\/\//.test(t)) return t;
  const file = t;
  mkdirSync(dirname(resolve(file)), { recursive: true });
  return file;
}

function exampleData(file: string | undefined): ReportData {
  if (!file) return { companies: demoCompanies, people: demoPeople, signals: demoSignals, messages: demoMessages, runs: demoRuns, mailboxes: demoMailboxes };
  const d = readJson(file) as Partial<ReportData>;
  return { companies: d.companies ?? [], people: d.people ?? [], signals: d.signals ?? [], messages: d.messages ?? [], runs: d.runs ?? [], mailboxes: d.mailboxes ?? [] };
}

async function report(args: string[]) {
  const example = !!flag(args, "example") || !!flag(args, "data");
  const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
  const out = flag(args, "out") ?? (example ? "docs/dashboard-mock.html" : "docs/report.html");
  let data: ReportData;
  if (example) data = exampleData(flag(args, "data"));
  else {
    const s = await LocalStore.open(target());
    data = { ...(await s.snapshot()), caps: readCaps(await s.setting("caps")), enabled: { httparchive: true, urlscan: true, apollo: true, monid: true, millionverifier: true, apify: true, ...((await s.setting("sources_enabled")) as Record<string, boolean> | null ?? {}) } };
    await s.close();
  }
  const html = buildReport(data, { title: flag(args, "title") ?? "Lead Engine", css, now: example && !flag(args, "data") ? DEMO_NOW : new Date(), accent: flag(args, "accent"), example, note: example ? "example data" : "local mode" });
  write(out, html);
  print({ written: out, companies: data.companies.length });
}

async function withStore<T>(fn: (s: LocalStore) => Promise<T>): Promise<T> {
  const s = await LocalStore.open(target());
  try { return await fn(s); } finally { await s.close(); }
}

async function main() {
  loadEnvFile();
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "init": return withStore(async () => print({ store: /^postgres/.test(target()) ? "postgres (LEAD_ENGINE_DB)" : target(), ready: true }));
    case "read": return withStore(async (s) => {
      const view = args[0] ?? "";
      if (!(LOCAL_VIEWS as readonly string[]).includes(view)) { print({ error: `view: ${LOCAL_VIEWS.join(" | ")}` }); process.exitCode = 1; return; }
      const qs = new URLSearchParams();
      for (const a of args.slice(1)) { const [k, v] = a.split("="); if (k && v) qs.set(k, v); }
      print(await readLocalView(s, view, qs));
    });
    case "src": return withStore(async (s) => {
      const call = parseCall(readJson(args[0] ?? "{}"));
      if (typeof call === "string") { print({ error: call }); process.exitCode = 1; return; }
      const out = await runLocalSource(s, call);
      print(out.body);
      if (out.status === 403 || out.status === 409) process.exitCode = 3; else if (out.status >= 400) process.exitCode = 1;
    });
    case "ingest": return withStore(async (s) => print(await s.ingest(readJson(args[0] ?? "{}"))));
    case "score": return withStore(async (s) => print(await rescoreLocal(s, args.length ? args : null)));
    case "queue": return withStore(async (s) => print(await queueLocal(s, args)));
    case "send": return withStore(async (s) => print(await sendLocal(s, parseMailboxes(process.env), { dryRun: !!flag(args, "dry-run") })));
    case "replies": return withStore(async (s) => print({ report: await repliesLocal(s, parseMailboxes(process.env)) }));
    case "export": return withStore(async (s) => {
      const d = await s.snapshot();
      const seq = flag(args, "for") === "sequencer";
      const out = flag(args, "out") ?? `data/${seq ? "sequencer" : "leads"}-${new Date().toISOString().slice(0, 10)}.csv`;
      write(out, seq ? sequencerCsv(d.companies, d.people, d.messages) : leadsCsv(d.companies, d.people));
      print({ written: out });
    });
    case "report": return report(args);
    case "env": {
      const names = ["LEAD_ENGINE_MODE", "LEAD_ENGINE_DB", "URLSCAN_API_KEY", "GCP_SA_KEY", "APIFY_TOKEN", "MONID_API_KEY", "MILLIONVERIFIER_API_KEY", "APOLLO_API_KEY", "HACKERTARGET_API_KEY", "MAILBOX_1", "MAILBOX_1_PASSWORD"];
      for (const n of names) console.log(`${process.env[n] ? "set    " : "missing"} ${n}`);
      return;
    }
    default:
      console.log("usage (local mode): le init | read <view> | src <json> | ingest <file|json|-> | score [ids] | queue <person_ids> | send [--dry-run] | replies | export [--for=sequencer] | report [--example] | env");
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
