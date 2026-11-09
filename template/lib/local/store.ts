import { randomUUID } from "node:crypto";
import { apexOf, isDomain } from "../pipeline/domain";
import { toCompany, toMessage, toPerson, toRun, toSignal } from "../data/rows";
import type { Company, Message, Person, Signal, SourceRun } from "../types";
import { migrate } from "./schema";
import { openSql, type Param, type Row, type Sql } from "./sql";

// The local store (mode "local": no Supabase, no Vercel). Same writes as the app's /api/agent/ingest: companies by
// domain, people by email, signals by (company, kind, value), drafts by (person, channel, step). Idempotent; a row
// that fails is reported, never dropped silently; sent messages are never overwritten.

type P = Record<string, unknown>;
export type IngestReport = { written: Record<string, number>; skipped: { kind: string; key: string; reason: string }[] };

const JSON_COLS = ["tech", "why", "interests", "params"];
const BOOL_COLS = ["qualified", "excluded", "suppressed"];

// Database row → the shape the app's row mappers expect (arrays, booleans, numbers).
export function norm(r: Row): Row {
  const out: Row = { ...r };
  for (const k of JSON_COLS) if (typeof out[k] === "string" && /^[[{]/.test(out[k] as string)) { try { out[k] = JSON.parse(out[k] as string); } catch { /* keep text */ } }
  for (const k of BOOL_COLS) if (k in out && out[k] != null) out[k] = Number(out[k]) === 1;
  if ("trigger_" in out) { out.trigger = out.trigger_; delete out.trigger_; }
  return out;
}

const bool = (v: unknown): Param => (v == null ? null : v === true || v === 1 || v === "true" ? 1 : 0);
const now = () => new Date().toISOString();

const COMPANY_FIELDS = ["name", "country", "timezone", "size_band", "tech", "source", "evidence", "evidence_url", "qualified", "qualify_reason", "excluded", "status"] as const;
const PERSON_FIELDS = ["name", "role", "linkedin_url", "interests", "offer_key"] as const;
const KINDS = ["tech", "register", "job", "ad", "review", "comment", "request"];
const REPLY_CLASSES = ["positive", "question", "objection", "not_now", "unsubscribe", "hostile", "auto_reply", "bounce", "reply"];

function fieldValue(k: string, v: unknown): Param {
  if (k === "qualified" || k === "excluded") return bool(v);
  if (k === "tech" || k === "interests") return JSON.stringify(v ?? (k === "tech" ? [] : null));
  return v == null ? null : typeof v === "number" ? v : String(v);
}

export class LocalStore {
  constructor(readonly sql: Sql) {}

  static async open(target: string): Promise<LocalStore> {
    const sql = await openSql(target);
    await migrate(sql);
    return new LocalStore(sql);
  }

  close() { return this.sql.close(); }
  all(q: string, p?: Param[]) { return this.sql.all(q, p).then((rows) => rows.map(norm)); }
  async get(q: string, p?: Param[]) { const r = await this.sql.get(q, p); return r ? norm(r) : undefined; }

  async setting(key: string): Promise<unknown> {
    const r = await this.sql.get("select value from settings where key = ?", [key]);
    return r ? JSON.parse(String(r.value)) : null;
  }
  async setSetting(key: string, value: unknown) {
    await this.sql.run("insert into settings (key, value) values (?, ?) on conflict (key) do update set value = excluded.value", [key, JSON.stringify(value)]);
  }

  async companyId(domain: string): Promise<string | null> {
    const r = await this.sql.get("select id from companies where domain = ?", [apexOf(domain)]);
    return r ? String(r.id) : null;
  }

  // --- ingest ------------------------------------------------------------------------------------------------------
  async ingest(body: P): Promise<IngestReport> {
    const rep: IngestReport = { written: { companies: 0, people: 0, signals: 0, drafts: 0, reply_classes: 0, suppression: 0, settings: 0 }, skipped: [] };
    const list = (k: string) => (Array.isArray(body[k]) ? (body[k] as P[]).slice(0, 1000) : []);
    for (const r of list("companies")) await this.writeCompany(r, rep);
    for (const r of list("people")) await this.writePerson(r, rep);
    for (const r of list("signals")) await this.writeSignal(r, rep);
    for (const r of list("drafts")) await this.writeDraft(r, rep);
    for (const r of list("reply_classes")) await this.writeReplyClass(r, rep);
    for (const r of list("suppression")) await this.writeSuppression(r, rep);
    if (body.scoring && typeof body.scoring === "object") { await this.setSetting("scoring", body.scoring); rep.written.settings++; }
    if (Array.isArray(body.cron_urlscan)) { await this.setSetting("cron_jobs", { urlscan: body.cron_urlscan.slice(0, 10) }); rep.written.settings++; }
    // No Settings page locally: caps, sources on/off, send settings and the forward-to address are set here.
    for (const k of ["caps", "sources_enabled", "send", "forward_to"]) {
      if (body[k] === undefined) continue;
      const prev = await this.setting(k);
      const merged = body[k] && typeof body[k] === "object" && prev && typeof prev === "object" ? { ...(prev as P), ...(body[k] as P) } : body[k];
      await this.setSetting(k, merged);
      rep.written.settings++;
    }
    return rep;
  }

  private async writeCompany(row: P, rep: IngestReport) {
    const domain = apexOf(String(row.domain ?? ""));
    if (!isDomain(domain)) return void rep.skipped.push({ kind: "company", key: String(row.domain), reason: "bad domain" });
    const fields = COMPANY_FIELDS.filter((f) => row[f] !== undefined);
    const cols = ["id", "domain", "created_at", "updated_at", ...fields];
    const vals: Param[] = [randomUUID(), domain, now(), now(), ...fields.map((f) => fieldValue(f, row[f]))];
    const set = ["updated_at = excluded.updated_at", ...fields.map((f) => `${f} = excluded.${f}`)].join(", ");
    await this.sql.run(`insert into companies (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")}) on conflict (domain) do update set ${set}`, vals);
    rep.written.companies++;
  }

  private async writePerson(row: P, rep: IngestReport) {
    const cid = await this.companyId(String(row.domain ?? ""));
    const email = typeof row.email === "string" && row.email.includes("@") ? row.email.trim().toLowerCase() : null;
    const key = email ?? String(row.name ?? "");
    if (!cid) return void rep.skipped.push({ kind: "person", key, reason: "company not found (ingest the company first)" });
    const fields: [string, Param][] = PERSON_FIELDS.filter((f) => row[f] !== undefined).map((f) => [f, fieldValue(f, row[f])]);
    if (typeof row.verify_status === "string" && typeof row.verify_source === "string" && row.verify_source)
      fields.push(["verify_status", row.verify_status], ["verify_source", row.verify_source], ["verified_at", now()]);
    const cols = ["id", "company_id", "email", "created_at", ...fields.map((f) => f[0])];
    const vals: Param[] = [randomUUID(), cid, email, now(), ...fields.map((f) => f[1])];
    const conflict = email ? ` on conflict (email) do update set company_id = excluded.company_id${fields.map(([f]) => `, ${f} = excluded.${f}`).join("")}` : "";
    await this.sql.run(`insert into people (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")})${conflict}`, vals);
    rep.written.people++;
  }

  private async writeSignal(row: P, rep: IngestReport) {
    const cid = await this.companyId(String(row.domain ?? ""));
    const kind = String(row.kind ?? "");
    const value = String(row.value ?? "").slice(0, 500);
    if (!cid || !KINDS.includes(kind) || !value) return void rep.skipped.push({ kind: "signal", key: `${row.domain}:${kind}`, reason: "needs a known company, a valid kind and a value" });
    const observed = typeof row.observed_at === "string" ? new Date(row.observed_at).toISOString() : now();
    await this.sql.run(`insert into signals (id, company_id, kind, value, url, source, observed_at, fetched_at) values (?, ?, ?, ?, ?, ?, ?, ?)
      on conflict (company_id, kind, value) do update set url = excluded.url, source = excluded.source, observed_at = excluded.observed_at, fetched_at = excluded.fetched_at`,
    [randomUUID(), cid, kind, value, (row.url as string) ?? null, (row.source as string) ?? null, observed, now()]);
    rep.written.signals++;
  }

  private async writeDraft(row: P, rep: IngestReport) {
    const email = String(row.email ?? "").toLowerCase();
    const step = Number(row.step);
    const channel = String(row.channel ?? "email");
    const person = await this.sql.get("select id, company_id from people where email = ?", [email]);
    if (!person || !(step >= 1 && step <= 5)) return void rep.skipped.push({ kind: "draft", key: `${email}#${row.step}`, reason: "person not found or bad step" });
    const existing = await this.sql.get("select id, status from messages where person_id = ? and channel = ? and step = ? and direction = 'out'", [String(person.id), channel, step]);
    if (existing && existing.status !== "draft") return void rep.skipped.push({ kind: "draft", key: `${email}#${step}`, reason: `already ${existing.status}` });
    const subject = String(row.subject ?? ""), body = String(row.body ?? "");
    if (existing) await this.sql.run("update messages set subject = ?, body = ? where id = ?", [subject, body, String(existing.id)]);
    else await this.sql.run("insert into messages (id, person_id, company_id, channel, step, direction, subject, body, status, created_at) values (?, ?, ?, ?, ?, 'out', ?, ?, 'draft', ?)",
      [randomUUID(), String(person.id), String(person.company_id), channel, step, subject, body, now()]);
    rep.written.drafts++;
  }

  private async writeReplyClass(row: P, rep: IngestReport) {
    const id = String(row.message_id ?? "");
    const cls = String(row.class ?? "");
    if (!REPLY_CLASSES.includes(cls)) return void rep.skipped.push({ kind: "reply_class", key: id, reason: `class must be one of ${REPLY_CLASSES.join(", ")}` });
    const msg = await this.sql.get("select person_id from messages where id = ? and direction = 'in'", [id]);
    if (!msg) return void rep.skipped.push({ kind: "reply_class", key: id, reason: "inbound message not found" });
    await this.sql.run("update messages set class = ? where id = ?", [cls, id]);
    if (cls === "unsubscribe" || cls === "hostile") await this.suppressPerson(String(msg.person_id), cls);
    rep.written.reply_classes++;
  }

  async suppressPerson(personId: string, reason: string) {
    await this.sql.run("update people set suppressed = 1 where id = ?", [personId]);
    const p = await this.sql.get("select email from people where id = ?", [personId]);
    if (p?.email) await this.sql.run("insert into suppression (id, email, reason, created_at) values (?, ?, ?, ?) on conflict (email) do nothing", [randomUUID(), String(p.email), reason, now()]);
  }

  private async writeSuppression(row: P, rep: IngestReport) {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : null;
    const domain = typeof row.domain === "string" ? apexOf(row.domain) : null;
    if (!email && !domain) return void rep.skipped.push({ kind: "suppression", key: "?", reason: "email or domain needed" });
    const col = email ? "email" : "domain";
    await this.sql.run(`insert into suppression (id, ${col}, reason, created_at) values (?, ?, ?, ?) on conflict (${col}) do update set reason = excluded.reason`,
      [randomUUID(), email ?? domain, String(row.reason ?? "manual"), now()]);
    rep.written.suppression++;
  }

  // --- whole-store snapshot (report, export) -----------------------------------------------------------------------
  async snapshot(): Promise<{ companies: Company[]; people: Person[]; signals: Signal[]; messages: Message[]; runs: SourceRun[] }> {
    return {
      companies: (await this.all("select * from companies order by domain")).map(toCompany),
      people: (await this.all("select * from people order by email")).map(toPerson),
      signals: (await this.all("select * from signals order by observed_at")).map(toSignal),
      messages: (await this.all("select * from messages order by created_at")).map(toMessage),
      runs: (await this.all("select * from sources_runs order by started_at")).map(toRun),
    };
  }
}
