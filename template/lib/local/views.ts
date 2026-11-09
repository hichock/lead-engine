import { scoreCompany } from "../scoring";
import { readScoring } from "../pipeline/score";
import { runChecks, type CheckLead } from "../sender/checks";
import type { SignalKind } from "../types";
import type { LocalStore } from "./store";

// Work lists, scoring and queueing for the local mode. Same view names and row shapes as GET /api/agent/read, so the
// skills run unchanged: to-qualify, to-contact, to-verify, to-write, drafts, replies, company, funnel.

type Out = { rows: unknown[]; capped: boolean };
const cap = (rows: unknown[], limit: number): Out => ({ rows, capped: rows.length >= limit });
type Row = Record<string, unknown>;

export const LOCAL_VIEWS = ["to-qualify", "to-contact", "to-verify", "to-write", "drafts", "replies", "company", "funnel"] as const;

async function withPeople(s: LocalStore, companies: Row[]) {
  const out: Row[] = [];
  for (const c of companies) out.push({ ...c, people: await s.all("select id, name, role, email from people where company_id = ?", [String(c.id)]) });
  return out;
}

async function funnel(s: LocalStore) {
  const count = async (q: string) => Object.fromEntries((await s.all(q)).map((r) => [String(r.k), Number(r.n)]));
  return {
    sources: await s.all("select source, count(*) as runs, sum(rows_in) as rows_in, sum(rows_kept) as rows_kept, sum(cost_usd) as cost_usd from sources_runs where status in ('ok','pending') group by source"),
    companiesByStatus: await count("select status as k, count(*) as n from companies group by status"),
    sentByStep: await count("select 'step ' || step as k, count(*) as n from messages where direction = 'out' and status = 'sent' group by step"),
    sentByMailbox: await count("select coalesce(mailbox, '?') as k, count(*) as n from messages where direction = 'out' and status = 'sent' group by mailbox"),
    inboundByClass: await count("select coalesce(class, '?') as k, count(*) as n from messages where direction = 'in' group by class"),
  };
}

export async function readLocalView(s: LocalStore, view: string, p: URLSearchParams): Promise<Out | Row> {
  const limit = Math.min(Number(p.get("limit") ?? 50) || 50, 500);
  switch (view) {
    case "to-qualify":
      return cap(await s.all("select id, domain, name, country, tech, source, created_at from companies where qualified is null and excluded = 0 order by created_at limit ?", [limit]), limit);
    case "to-contact": {
      const rows = await s.all(`select id, domain, name, country, evidence from companies c where qualified = 1 and excluded = 0
        and not exists (select 1 from people p where p.company_id = c.id and p.email is not null) order by coalesce(score, -1) desc limit ?`, [limit]);
      return cap(await withPeople(s, rows), limit);
    }
    case "to-verify":
      return cap(await s.all(`select p.id, p.name, p.email, p.verify_status, p.verified_at, c.id as company_id, c.domain from people p join companies c on c.id = p.company_id
        where p.email is not null and p.verify_status in ('unverified','unknown') and c.qualified = 1 and c.evidence is not null limit ?`, [limit]), limit);
    case "to-write":
      return cap(await s.all(`select p.id, p.name, p.role, p.email, p.interests, p.offer_key, c.id as company_id, c.domain, c.name as company_name, c.country, c.evidence, c.evidence_url, c.why, c.score
        from people p join companies c on c.id = p.company_id where p.verify_status = 'ok' and p.suppressed = 0 and c.qualified = 1
        and not exists (select 1 from messages m where m.person_id = p.id) order by coalesce(c.score, -1) desc limit ?`, [limit]), limit);
    case "drafts":
      return cap(await s.all(`select m.id, m.person_id, m.step, m.subject, m.body, p.name, p.email, c.domain, c.evidence from messages m
        join people p on p.id = m.person_id join companies c on c.id = m.company_id where m.direction = 'out' and m.status = 'draft' order by m.created_at limit ?`, [limit]), limit);
    case "replies":
      return cap(await s.all(`select m.id, m.person_id, m.subject, m.body, m.sent_at, m.class, p.name, p.email, c.domain, c.name as company_name from messages m
        join people p on p.id = m.person_id join companies c on c.id = m.company_id where m.direction = 'in' and m.class = 'reply' order by m.sent_at desc limit ?`, [limit]), limit);
    case "company": {
      const c = await s.get("select * from companies where domain = ?", [String(p.get("domain") ?? "").toLowerCase()]);
      if (!c) return { company: null };
      const id = String(c.id);
      return { company: { ...c, people: await s.all("select * from people where company_id = ?", [id]), signals: await s.all("select * from signals where company_id = ?", [id]),
        messages: await s.all("select id, step, direction, status, class, subject, sent_at from messages where company_id = ?", [id]) } };
    }
    case "funnel":
      return funnel(s);
    default:
      throw new Error(`view: ${LOCAL_VIEWS.join(" | ")}`);
  }
}

export async function rescoreLocal(s: LocalStore, ids: string[] | null, now = new Date()) {
  const cfg = readScoring(await s.setting("scoring"));
  const companies = (await s.all("select id, country, size_band, tech, qualified from companies")).filter((c) => !ids?.length || ids.includes(String(c.id)));
  let updated = 0;
  for (const c of companies) {
    const signals = await s.all("select kind, value, observed_at from signals where company_id = ?", [String(c.id)]);
    const r = scoreCompany({ country: (c.country as string) ?? null, sizeBand: (c.size_band as string) ?? null, tech: (c.tech as string[]) ?? [],
      qualified: (c.qualified as boolean | null) ?? null, signals: signals.map((x) => ({ kind: x.kind as SignalKind, value: String(x.value), observedAt: String(x.observed_at) })) }, now, cfg);
    await s.sql.run("update companies set score = ?, fit = ?, trigger_ = ?, why = ? where id = ?", [r.score, r.fit, r.trigger, JSON.stringify(r.why), String(c.id)]);
    updated++;
  }
  return { updated };
}

// The owner approves in the Claude session ("queue these"), then this runs the same send checks as the app.
export async function queueLocal(s: LocalStore, personIds: string[]) {
  const set = async (q: string) => new Set((await s.all(q)).map((r) => String(r.v).toLowerCase()));
  const ctx = {
    suppressedEmails: await set("select email as v from suppression where email is not null"),
    suppressedDomains: await set("select domain as v from suppression where domain is not null"),
    contactedEmails: await set("select p.email as v from messages m join people p on p.id = m.person_id where m.direction = 'out' and m.status = 'sent' and p.email is not null"),
    contactedDomains: await set("select c.domain as v from messages m join companies c on c.id = m.company_id where m.direction = 'out' and m.status = 'sent'"),
    maxWords: 90,
  };
  const leads: CheckLead[] = [];
  for (const id of personIds) {
    const p = await s.get(`select p.id, p.email, p.verify_status, p.suppressed, c.domain, c.qualified, c.evidence, c.excluded,
      m.subject, m.body from people p join companies c on c.id = p.company_id left join messages m on m.person_id = p.id and m.step = 1 and m.direction = 'out' and m.status = 'draft' where p.id = ?`, [id]);
    if (!p) continue;
    leads.push({ personId: id, email: (p.email as string) ?? null, verifyStatus: String(p.verify_status), suppressed: p.suppressed === true,
      companyDomain: String(p.domain), companyQualified: (p.qualified as boolean | null) ?? null, evidence: (p.evidence as string) ?? null,
      excluded: p.excluded === true, subject: String(p.subject ?? ""), body: String(p.body ?? "") });
  }
  const { pass, fail } = runChecks(leads, ctx);
  const at = new Date().toISOString();
  for (const l of pass) await s.sql.run("update messages set status = 'queued', send_after = case when step = 1 then ? else send_after end where person_id = ? and direction = 'out' and status = 'draft'", [at, l.personId]);
  return { queued: pass.length, refused: fail };
}
