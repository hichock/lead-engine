import type { Company, Mailbox, Message, Person } from "../types";
import { ago, toneOf, type Tone } from "./format";

// Outreach view model. Pure.

export type OutreachItem = {
  id: string; personId: string; company: string; companyId: string; person: string; email: string;
  step: string; subject: string; preview: string; status: string; tone: Tone; when: string; mailbox: string;
};

export type OutreachView = {
  mailboxes: { email: string; name: string; active: boolean; sent: number; cap: number; ratio: number; tone: Tone; last: string }[];
  drafts: OutreachItem[]; // step-1 drafts waiting for approval (one per person)
  queue: OutreachItem[];
  sent: OutreachItem[];
  replies: OutreachItem[];
  totals: { sentToday: number; capToday: number; drafts: number; queued: number; replies: number };
};

const preview = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 140);

export function toOutreachView(messages: Message[], people: Person[], companies: Company[], mailboxes: Mailbox[], now: Date): OutreachView {
  const person = new Map(people.map((p) => [p.id, p]));
  const company = new Map(companies.map((c) => [c.id, c]));
  const item = (m: Message): OutreachItem => {
    const p = person.get(m.personId);
    const c = company.get(m.companyId);
    const status = m.direction === "in" ? m.class ?? "reply" : m.status;
    return {
      id: m.id, personId: m.personId, company: c?.name ?? "–", companyId: m.companyId, person: p?.name ?? "–", email: p?.email ?? "–",
      step: m.direction === "in" ? "Reply" : m.step === 1 ? "Email 1" : `Follow-up ${m.step - 1}`,
      subject: m.subject || "(same thread)", preview: preview(m.body), status, tone: toneOf(status),
      when: m.sentAt ? ago(m.sentAt, now) : m.status === "queued" ? "next send window" : "–", mailbox: m.mailbox ?? "any free mailbox",
    };
  };
  const out = messages.filter((m) => m.direction === "out");
  const bySent = (a: Message, b: Message) => (b.sentAt ?? "").localeCompare(a.sentAt ?? "");
  const active = mailboxes.filter((m) => m.active);
  return {
    mailboxes: mailboxes.map((m) => {
      const ratio = m.dailyCap ? m.sentToday / m.dailyCap : 1;
      return { email: m.email, name: m.fromName, active: m.active, sent: m.sentToday, cap: m.dailyCap, ratio: Math.min(1, ratio),
        tone: !m.active ? "neutral" : ratio >= 1 ? "warn" : "good", last: ago(m.lastSentAt, now) };
    }),
    drafts: out.filter((m) => m.status === "draft" && m.step === 1).map(item),
    queue: out.filter((m) => m.status === "queued").sort((a, b) => b.step - a.step).map(item),
    sent: out.filter((m) => m.status === "sent").sort(bySent).map(item),
    replies: messages.filter((m) => m.direction === "in").sort(bySent).map(item),
    totals: {
      sentToday: active.reduce((s, m) => s + m.sentToday, 0), capToday: active.reduce((s, m) => s + m.dailyCap, 0),
      drafts: out.filter((m) => m.status === "draft" && m.step === 1).length, queued: out.filter((m) => m.status === "queued").length,
      replies: messages.filter((m) => m.direction === "in").length,
    },
  };
}
