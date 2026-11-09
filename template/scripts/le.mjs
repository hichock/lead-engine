#!/usr/bin/env node
// le: the command line the Lead Engine skills use to talk to the deployed app.
// Every paid or rate-limited call goes through the app, which enforces caps, the 24 h ledger and the
// "qualified companies only" rule in code. Keys never leave the server.
//
// Needs LEAD_ENGINE_URL and AGENT_TOKEN (from .env.local, or the cloud environment's variables).
// Local mode (no app): set LEAD_ENGINE_MODE=local in .env.local and every command runs on this machine against a
// SQLite file or your own Postgres (scripts/local.ts), with the same caps, ledger and send checks. Extra local
// commands: init, send, replies, export, report.
//
//   node scripts/le.mjs read to-qualify [limit=50]        work list for a skill (views: to-qualify, to-contact,
//                                                         to-verify, to-write, drafts, replies, funnel, company domain=x)
//   node scripts/le.mjs src '{"source":"urlscan","params":{"q":"domain:softr-files.com","slices":true}}'
//   node scripts/le.mjs ingest rows.json                  idempotent upsert: companies, people, signals, drafts,
//                                                         reply_classes, suppression (use - for stdin)
//   node scripts/le.mjs score [company_id ...]            recompute fit × trigger and the why lines
//   node scripts/le.mjs queue <person_id ...>             queue drafts (only when auto-queue is on in Settings)
//   node scripts/le.mjs sql "select count(*) from companies"   optional: Supabase Management API (local use)
//   node scripts/le.mjs env                               which variables are set (names only, never values)

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function loadEnvFile() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set. Add it to .env.local (local) or to the cloud environment's variables.`);
    process.exit(2);
  }
  return v;
}

async function call(method, path, body) {
  const base = need("LEAD_ENGINE_URL").replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${need("AGENT_TOKEN")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  // 202 = pending job (call again with the same input to resume); 403/409 = refused by a cap or the ledger.
  if (res.status >= 400) process.exitCode = res.status === 403 || res.status === 409 ? 3 : 1;
}

function readJson(arg) {
  const raw = arg === "-" ? readFileSync(0, "utf8") : existsSync(arg) ? readFileSync(arg, "utf8") : arg;
  return JSON.parse(raw);
}

async function sql(query) {
  const ref = need("SUPABASE_PROJECT_REF");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${need("SUPABASE_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log(await res.text());
  if (!res.ok) process.exitCode = 1;
}

const NAMES = ["LEAD_ENGINE_MODE", "LEAD_ENGINE_URL", "AGENT_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "URLSCAN_API_KEY", "GCP_SA_KEY", "APIFY_TOKEN", "MONID_API_KEY", "MILLIONVERIFIER_API_KEY", "APOLLO_API_KEY"];

loadEnvFile();
const [cmd, ...args] = process.argv.slice(2);
if (process.env.LEAD_ENGINE_MODE === "local") {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), "local.ts");
  const r = spawnSync(process.execPath, ["--no-warnings=ExperimentalWarning", "--import", "tsx", script, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
switch (cmd) {
  case "read": {
    const qs = new URLSearchParams({ view: args[0] ?? "" });
    for (const a of args.slice(1)) { const [k, v] = a.split("="); if (k && v) qs.set(k, v); }
    await call("GET", `/api/agent/read?${qs}`);
    break;
  }
  case "src": await call("POST", "/api/agent/source", readJson(args[0])); break;
  case "ingest": await call("POST", "/api/agent/ingest", readJson(args[0])); break;
  case "score": await call("POST", "/api/agent/score", args.length ? { company_ids: args } : {}); break;
  case "queue": await call("POST", "/api/agent/queue", { person_ids: args }); break;
  case "sql": await sql(args.join(" ")); break;
  case "env": for (const n of NAMES) console.log(`${process.env[n] ? "set    " : "missing"} ${n}`); break;
  default:
    console.log("usage: le read <view> | src <json> | ingest <file|-> | score [ids] | queue <person_ids> | sql <query> | env");
    process.exitCode = cmd ? 1 : 0;
}
