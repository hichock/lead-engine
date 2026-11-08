import type { Company, Message, Person, Signal } from "../types";
import { ago, scoreTone, toneOf, type Tone } from "./format";

// Company detail view model. Pure.

export type CompanyView = {
  name: string; domain: string; country: string; sizeBand: string; tech: string[]; source: string;
  status: string; statusTone: Tone; score: string; scoreValue: number; scoreTone: Tone;
  qualified: { label: string; tone: Tone; reason: string };
  evidence: string | null;
  why: { label: string; value: string; parts: string[] }[];
  timeline: { id: string; kind: string; value: string; when: string; date: string; url: string | null }[];
  people: { id: string; name: string; role: string; email: string; verify: string; verifyTone: Tone; sendable: boolean }[];
  thread: { id: string; dir: "out" | "in"; step: string; subject: string; body: string; status: string; tone: Tone; when: string; mailbox: string }[];
};

function qualifiedOf(c: Company) {
  if (c.qualified === true) return { label: "Qualified", tone: "good" as Tone, reason: c.qualifyReason ?? "" };
  if (c.qualified === false) return { label: "Rejected", tone: "bad" as Tone, reason: c.qualifyReason ?? "" };
  return { label: "Not checked yet", tone: "neutral" as Tone, reason: "The qualify skill checks the live site, size and fit before any paid lookup." };
}

// "Fit 1: a; b; c" → { label: "Fit", value: "1", parts: [a, b, c] }
function parseWhy(line: string) {
  const m = line.match(/^(\w+) ([\d.]+): (.*)$/);
  return m ? { label: m[1], value: m[2], parts: m[3].split("; ") } : { label: "Note", value: "", parts: [line] };
}

const stepLabel = (m: Message) => (m.direction === "in" ? "Reply" : m.step === 1 ? "Email 1" : `Follow-up ${m.step - 1}`);

export function toCompanyView(c: Company, signals: Signal[], people: Person[], messages: Message[], now: Date): CompanyView {
  const pName = new Map(people.map((p) => [p.id, p.name]));
  return {
    name: c.name || c.domain, domain: c.domain, country: c.country ?? "–", sizeBand: c.sizeBand ?? "–", tech: c.tech, source: c.source,
    status: c.status, statusTone: toneOf(c.status),
    score: c.score == null ? "–" : String(c.score), scoreValue: c.score ?? 0, scoreTone: scoreTone(c.score),
    qualified: qualifiedOf(c),
    evidence: c.evidence,
    why: c.why.map(parseWhy),
    timeline: [...signals].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map((s) => ({
      id: s.id, kind: s.kind, value: s.value, when: ago(s.observedAt, now), date: s.observedAt.slice(0, 10), url: s.url,
    })),
    people: people.map((p) => ({
      id: p.id, name: p.name, role: p.role ?? "–", email: p.email ?? "no email yet", verify: p.verifyStatus, verifyTone: toneOf(p.verifyStatus),
      sendable: p.verifyStatus === "ok" && !p.suppressed && c.qualified === true,
    })),
    thread: [...messages]
      .sort((a, b) => (a.sentAt ?? "9999").localeCompare(b.sentAt ?? "9999") || a.step - b.step)
      .map((m) => ({
        id: m.id, dir: m.direction, step: `${stepLabel(m)} · ${pName.get(m.personId) ?? ""}`, subject: m.subject || "(same thread)",
        body: m.body, status: m.direction === "in" ? m.class ?? "reply" : m.status, tone: toneOf(m.direction === "in" ? m.class ?? "reply" : m.status),
        when: m.sentAt ? ago(m.sentAt, now) : m.status === "queued" ? "waiting for its send window" : "not sent", mailbox: m.mailbox ?? "",
      })),
  };
}
