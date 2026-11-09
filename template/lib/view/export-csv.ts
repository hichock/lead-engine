import type { Company, Message, Person } from "../types";

// CSV exports. Pure. Used by the Leads page button (GET /export/leads), the local mode (`le export`) and setups that
// hand leads to a sequencer instead of the own sender.
//  - leads: one row per company, with its best contact (verifier ok first).
//  - sequencer: one row per sendable person (verifier ok, not suppressed, qualified company) with the drafted emails
//    as custom columns, in the column names Instantly and Smartlead imports map by default (email, first_name, ...).

const FORMULA = /^[=+\-@\t\r]/;

// One CSV cell: quoted when needed; a leading = + - @ is prefixed with ' so spreadsheets never run it as a formula.
export function cell(v: unknown): string {
  let s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (header: string[], rows: unknown[][]): string =>
  [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

const VERIFY_RANK: Record<string, number> = { ok: 0, catch_all: 1, unknown: 2, unverified: 3, invalid: 4, disposable: 5 };

export function bestContact(people: Person[]): Person | null {
  const usable = people.filter((p) => p.email && !p.suppressed);
  return [...usable].sort((a, b) => (VERIFY_RANK[a.verifyStatus] ?? 9) - (VERIFY_RANK[b.verifyStatus] ?? 9))[0] ?? null;
}

const sendable = (p: Person, c: Company | undefined) => !!p.email && !p.suppressed && p.verifyStatus === "ok" && c?.qualified === true;

export function leadsCsv(companies: Company[], people: Person[]): string {
  const byCompany = new Map<string, Person[]>();
  for (const p of people) byCompany.set(p.companyId, [...(byCompany.get(p.companyId) ?? []), p]);
  const rows = [...companies]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.domain.localeCompare(b.domain))
    .map((c) => {
      const p = bestContact(byCompany.get(c.id) ?? []);
      return [c.domain, c.name, c.country, c.sizeBand, c.status, c.qualified == null ? "" : c.qualified ? "yes" : "no", c.score,
        c.evidence, c.why, c.source, p?.name, p?.role, p?.email, p?.verifyStatus];
    });
  return toCsv(["domain", "company", "country", "size_band", "status", "qualified", "score", "evidence", "why", "source",
    "contact_name", "contact_role", "contact_email", "verify_status"], rows);
}

const splitName = (name: string) => {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
};

export function sequencerCsv(companies: Company[], people: Person[], messages: Message[]): string {
  const company = new Map(companies.map((c) => [c.id, c]));
  const draft = (personId: string, step: number) =>
    messages.find((m) => m.personId === personId && m.direction === "out" && m.step === step && m.status !== "sent" && m.status !== "stopped");
  const rows = people.filter((p) => sendable(p, company.get(p.companyId))).map((p) => {
    const c = company.get(p.companyId)!;
    const { first, last } = splitName(p.name);
    const d1 = draft(p.id, 1);
    return [p.email, first, last, c.name || c.domain, `https://${c.domain}`, c.country, p.role, c.evidence,
      d1?.subject, d1?.body, draft(p.id, 2)?.body, draft(p.id, 3)?.body];
  });
  return toCsv(["email", "first_name", "last_name", "company_name", "website", "country", "job_title", "evidence",
    "subject_1", "body_1", "body_2", "body_3"], rows);
}
