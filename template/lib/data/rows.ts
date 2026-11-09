import type { Company, Message, Person, Signal, SourceRun } from "../types";

// Row mappers: normalise database rows once, where they enter (pages, the local store, exports). Pure.
export type R = Record<string, unknown>;
export const str = (v: unknown) => (typeof v === "string" ? v : null);
export const num = (v: unknown) => (v == null ? 0 : Number(v));

export const toCompany = (r: R): Company => ({
  id: String(r.id), domain: String(r.domain), name: str(r.name) ?? "", country: str(r.country), sizeBand: str(r.size_band),
  tech: Array.isArray(r.tech) ? r.tech.map(String) : [], source: str(r.source) ?? "manual", evidence: str(r.evidence),
  qualified: typeof r.qualified === "boolean" ? r.qualified : null, qualifyReason: str(r.qualify_reason),
  score: r.score == null ? null : Number(r.score), why: Array.isArray(r.why) ? r.why.map(String) : [],
  status: (str(r.status) ?? "new") as Company["status"], createdAt: String(r.created_at),
});
export const toSignal = (r: R): Signal => ({
  id: String(r.id), companyId: String(r.company_id), personId: str(r.person_id), kind: r.kind as Signal["kind"],
  value: String(r.value), url: str(r.url), observedAt: String(r.observed_at),
});
export const toPerson = (r: R): Person => ({
  id: String(r.id), companyId: String(r.company_id), name: str(r.name) ?? "", role: str(r.role), email: str(r.email),
  verifyStatus: (str(r.verify_status) ?? "unverified") as Person["verifyStatus"], verifySource: str(r.verify_source),
  linkedinUrl: str(r.linkedin_url), offerKey: str(r.offer_key), suppressed: r.suppressed === true,
});
export const toMessage = (r: R): Message => ({
  id: String(r.id), personId: String(r.person_id), companyId: String(r.company_id), channel: (str(r.channel) ?? "email") as Message["channel"],
  mailbox: str(r.mailbox), step: num(r.step), subject: str(r.subject) ?? "", body: str(r.body) ?? "",
  direction: (str(r.direction) ?? "out") as Message["direction"], class: str(r.class), status: (str(r.status) ?? "draft") as Message["status"],
  sendAfter: str(r.send_after), sentAt: str(r.sent_at),
});
export const toRun = (r: R): SourceRun => ({
  id: String(r.id), source: String(r.source), inputHash: String(r.input_hash), startedAt: String(r.started_at),
  rowsIn: num(r.rows_in), rowsKept: num(r.rows_kept), costUsd: num(r.cost_usd), units: num(r.units),
  status: (str(r.status) ?? "ok") as SourceRun["status"], note: str(r.note),
});

