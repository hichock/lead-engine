import type { SupabaseClient } from "@supabase/supabase-js";
import { apexOf, isDomain } from "./domain";
import { readJobs } from "./jobs";
import { readScoring } from "./score";

// Idempotent writes from skills and cron: companies by domain, people by email, signals by (company, kind, value),
// drafts by (person, channel, step). Only listed fields are accepted. A row that fails is reported, never silently
// dropped. Sent messages are never overwritten.

type P = Record<string, unknown>;
export type IngestReport = { written: Record<string, number>; skipped: { kind: string; key: string; reason: string }[] };

const COMPANY_FIELDS = ["name", "country", "timezone", "size_band", "tech", "source", "evidence", "evidence_url", "qualified", "qualify_reason", "excluded", "status"] as const;
const PERSON_FIELDS = ["name", "role", "linkedin_url", "interests", "offer_key"] as const;
const KINDS = ["tech", "register", "job", "ad", "review", "comment", "request"];

function pick(row: P, fields: readonly string[]): P {
  return Object.fromEntries(fields.filter((f) => row[f] !== undefined).map((f) => [f, row[f]]));
}

async function companyId(db: SupabaseClient, domain: string): Promise<string | null> {
  const { data } = await db.from("companies").select("id").eq("domain", apexOf(domain)).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function writeCompany(db: SupabaseClient, row: P, rep: IngestReport) {
  const domain = apexOf(String(row.domain ?? ""));
  if (!isDomain(domain)) return rep.skipped.push({ kind: "company", key: String(row.domain), reason: "bad domain" });
  const { error } = await db.from("companies").upsert({ domain, ...pick(row, COMPANY_FIELDS) }, { onConflict: "domain" });
  if (error) return rep.skipped.push({ kind: "company", key: domain, reason: error.message });
  rep.written.companies++;
}

async function writePerson(db: SupabaseClient, row: P, rep: IngestReport) {
  const cid = await companyId(db, String(row.domain ?? ""));
  const email = typeof row.email === "string" && row.email.includes("@") ? row.email.trim().toLowerCase() : null;
  const key = email ?? String(row.name ?? "");
  if (!cid) return rep.skipped.push({ kind: "person", key, reason: "company not found (ingest the company first)" });
  // A verify result from a fallback verifier (e.g. Monid Hunter) must name its source.
  const verify: P = typeof row.verify_status === "string" && typeof row.verify_source === "string" && row.verify_source
    ? { verify_status: row.verify_status, verify_source: row.verify_source, verified_at: new Date().toISOString() } : {};
  const fields: P = { company_id: cid, ...pick(row, PERSON_FIELDS), ...verify, ...(email ? { email } : {}) };
  const { error } = email
    ? await db.from("people").upsert(fields, { onConflict: "email" })
    : await db.from("people").insert(fields);
  if (error) return rep.skipped.push({ kind: "person", key, reason: error.message });
  rep.written.people++;
}

async function writeSignal(db: SupabaseClient, row: P, rep: IngestReport) {
  const cid = await companyId(db, String(row.domain ?? ""));
  const kind = String(row.kind ?? "");
  const value = String(row.value ?? "").slice(0, 500);
  if (!cid || !KINDS.includes(kind) || !value) return rep.skipped.push({ kind: "signal", key: `${row.domain}:${kind}`, reason: "needs a known company, a valid kind and a value" });
  const { error } = await db.from("signals").upsert(
    { company_id: cid, kind, value, url: row.url ?? null, source: row.source ?? null, observed_at: row.observed_at ?? new Date().toISOString() },
    { onConflict: "company_id,kind,value" },
  );
  if (error) return rep.skipped.push({ kind: "signal", key: value, reason: error.message });
  rep.written.signals++;
}

async function writeDraft(db: SupabaseClient, row: P, rep: IngestReport) {
  const email = String(row.email ?? "").toLowerCase();
  const step = Number(row.step);
  const channel = String(row.channel ?? "email");
  const { data: person } = await db.from("people").select("id, company_id").eq("email", email).maybeSingle();
  if (!person || !(step >= 1 && step <= 5)) return rep.skipped.push({ kind: "draft", key: `${email}#${row.step}`, reason: "person not found or bad step" });
  const { data: existing } = await db.from("messages").select("id, status").eq("person_id", person.id).eq("channel", channel).eq("step", step).eq("direction", "out").maybeSingle();
  if (existing && existing.status !== "draft") return rep.skipped.push({ kind: "draft", key: `${email}#${step}`, reason: `already ${existing.status}` });
  const fields = { person_id: person.id, company_id: person.company_id, channel, step, direction: "out", subject: String(row.subject ?? ""), body: String(row.body ?? ""), status: "draft" };
  const { error } = existing ? await db.from("messages").update(fields).eq("id", existing.id) : await db.from("messages").insert(fields);
  if (error) return rep.skipped.push({ kind: "draft", key: `${email}#${step}`, reason: error.message });
  rep.written.drafts++;
}

const REPLY_CLASSES = ["positive", "question", "objection", "not_now", "unsubscribe", "hostile", "auto_reply", "bounce", "reply"];

// outreach-review writes its reply classes here; unsubscribe and hostile also suppress the person.
async function writeReplyClass(db: SupabaseClient, row: P, rep: IngestReport) {
  const id = String(row.message_id ?? "");
  const cls = String(row.class ?? "");
  if (!REPLY_CLASSES.includes(cls)) return rep.skipped.push({ kind: "reply_class", key: id, reason: `class must be one of ${REPLY_CLASSES.join(", ")}` });
  const { data, error } = await db.from("messages").update({ class: cls }).eq("id", id).eq("direction", "in").select("person_id").maybeSingle();
  if (error || !data) return rep.skipped.push({ kind: "reply_class", key: id, reason: error?.message ?? "inbound message not found" });
  if (cls === "unsubscribe" || cls === "hostile") {
    const { data: person } = await db.from("people").update({ suppressed: true }).eq("id", data.person_id).select("email").maybeSingle();
    if (person?.email) await db.from("suppression").upsert({ email: person.email, reason: cls }, { onConflict: "email" });
  }
  rep.written.reply_classes++;
}

async function writeSuppression(db: SupabaseClient, row: P, rep: IngestReport) {
  const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : null;
  const domain = typeof row.domain === "string" ? apexOf(row.domain) : null;
  if (!email && !domain) return rep.skipped.push({ kind: "suppression", key: "?", reason: "email or domain needed" });
  const { error } = await db.from("suppression").upsert({ ...(email ? { email } : { domain }), reason: String(row.reason ?? "manual") }, { onConflict: email ? "email" : "domain" });
  if (error) return rep.skipped.push({ kind: "suppression", key: email ?? domain ?? "", reason: error.message });
  rep.written.suppression++;
}

// Scheduled urlscan pulls (source-tech): merged by query, at most 10.
async function writeCronJobs(db: SupabaseClient, jobs: unknown, rep: IngestReport) {
  const { data } = await db.from("settings").select("value").eq("key", "cron_jobs").maybeSingle();
  const current = readJobs(data?.value);
  const merged = [...new Map([...current, ...readJobs({ urlscan: jobs })].map((j) => [j.q, j])).values()].slice(0, 10);
  const { error } = await db.from("settings").upsert({ key: "cron_jobs", value: { ...((data?.value as P) ?? {}), urlscan: merged } });
  if (error) return rep.skipped.push({ kind: "cron_urlscan", key: "settings", reason: error.message });
  rep.written.settings++;
}

// Score weights (score skill), normalised by the same reader the score code uses.
async function writeScoring(db: SupabaseClient, value: unknown, rep: IngestReport) {
  const cfg = readScoring(value);
  const { error } = await db.from("settings").upsert({ key: "scoring", value: { countries: cfg.countries, tools: cfg.tools, sizeBands: cfg.sizeBands, kindWeights: cfg.kindWeights, halfLifeDays: cfg.halfLifeDays } });
  if (error) return rep.skipped.push({ kind: "scoring", key: "settings", reason: error.message });
  rep.written.settings++;
}

export async function ingest(db: SupabaseClient, body: P): Promise<IngestReport> {
  const rep: IngestReport = { written: { companies: 0, people: 0, signals: 0, drafts: 0, reply_classes: 0, suppression: 0, settings: 0 }, skipped: [] };
  const list = (k: string) => (Array.isArray(body[k]) ? (body[k] as P[]).slice(0, 1000) : []);
  for (const r of list("companies")) await writeCompany(db, r, rep);
  for (const r of list("people")) await writePerson(db, r, rep);
  for (const r of list("signals")) await writeSignal(db, r, rep);
  for (const r of list("drafts")) await writeDraft(db, r, rep);
  for (const r of list("reply_classes")) await writeReplyClass(db, r, rep);
  for (const r of list("suppression")) await writeSuppression(db, r, rep);
  if (Array.isArray(body.cron_urlscan)) await writeCronJobs(db, body.cron_urlscan, rep);
  if (body.scoring && typeof body.scoring === "object") await writeScoring(db, body.scoring, rep);
  return rep;
}
