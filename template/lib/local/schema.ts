import type { Sql } from "./sql";

// The local store's tables. Same names and columns as the app's Supabase schema (supabase/migrations), so skills,
// exports and the report read the same shapes. Portable types: ids and timestamps are TEXT (UUIDs, ISO UTC),
// booleans are 0/1, arrays and JSON are TEXT holding JSON. The 24 h ledger rule is enforced in code (lib/ledger.ts).

const TABLES = (real: string) => `
create table if not exists companies (
  id text primary key, domain text not null unique, name text not null default '', country text, timezone text,
  size_band text, tech text not null default '[]', source text not null default 'manual', evidence text, evidence_url text,
  qualified integer, qualify_reason text, excluded integer not null default 0, score integer, fit ${real}, trigger_ ${real},
  why text not null default '[]', status text not null default 'new', created_at text not null, updated_at text not null
);
create table if not exists people (
  id text primary key, company_id text not null references companies (id) on delete cascade, name text not null default '',
  role text, email text unique, verify_status text not null default 'unverified', verify_source text, verified_at text,
  linkedin_url text, interests text, offer_key text, suppressed integer not null default 0, created_at text not null
);
create table if not exists signals (
  id text primary key, company_id text not null references companies (id) on delete cascade, person_id text,
  kind text not null, value text not null, url text, source text, observed_at text not null, fetched_at text not null,
  unique (company_id, kind, value)
);
create table if not exists sources_runs (
  id text primary key, source text not null, input_hash text not null, params text, company_id text, status text not null,
  rows_in integer not null default 0, rows_kept integer not null default 0, cost_usd ${real} not null default 0,
  units ${real} not null default 0, provider_job_id text, note text, started_at text not null, finished_at text
);
create index if not exists sources_runs_hash_idx on sources_runs (source, input_hash, started_at);
create table if not exists messages (
  id text primary key, person_id text not null references people (id) on delete cascade, company_id text not null,
  channel text not null default 'email', mailbox text, step integer not null, direction text not null default 'out',
  subject text not null default '', body text not null default '', status text not null default 'draft', class text,
  message_id text, in_reply_to text, send_after text, sent_at text, error text, created_at text not null
);
create table if not exists suppression (
  id text primary key, email text unique, domain text unique, reason text, created_at text not null
);
create table if not exists settings (key text primary key, value text not null);
`;

export async function migrate(sql: Sql): Promise<void> {
  const ddl = TABLES(sql.kind === "postgres" ? "double precision" : "real");
  for (const stmt of ddl.split(";").map((s) => s.trim()).filter(Boolean)) await sql.exec(stmt);
}
