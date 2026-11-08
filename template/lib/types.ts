// Shared row shapes. They mirror supabase/migrations/20261108000000_init.sql.
// Loaders normalise database rows into these shapes once, so views never repeat `?.` / `??` chains.

export type SignalKind = "tech" | "register" | "job" | "ad" | "review" | "comment" | "request";
export type CompanyStatus = "new" | "qualified" | "rejected" | "contacted" | "replied" | "won" | "lost";
export type VerifyStatus = "unverified" | "ok" | "catch_all" | "unknown" | "invalid" | "disposable";
export type MessageStatus = "draft" | "queued" | "sent" | "stopped" | "failed";

export type Company = {
  id: string;
  domain: string;
  name: string;
  country: string | null;
  sizeBand: string | null;
  tech: string[];
  source: string;
  evidence: string | null;
  qualified: boolean | null;
  qualifyReason: string | null;
  score: number | null;
  why: string[];
  status: CompanyStatus;
  createdAt: string;
};

export type Person = {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
  email: string | null;
  verifyStatus: VerifyStatus;
  verifySource: string | null;
  linkedinUrl: string | null;
  offerKey: string | null;
  suppressed: boolean;
};

export type Signal = {
  id: string;
  companyId: string;
  personId: string | null;
  kind: SignalKind;
  value: string;
  url: string | null;
  observedAt: string;
};

export type SourceRun = {
  id: string;
  source: string;
  inputHash: string;
  startedAt: string;
  rowsIn: number;
  rowsKept: number;
  costUsd: number;
  units: number;
  status: "pending" | "ok" | "failed" | "refused";
  note: string | null;
};

export type Message = {
  id: string;
  personId: string;
  companyId: string;
  channel: "email" | "doc" | "linkedin";
  mailbox: string | null;
  step: number;
  subject: string;
  body: string;
  direction: "out" | "in";
  class: string | null;
  status: MessageStatus;
  sendAfter: string | null;
  sentAt: string | null;
};

export type Mailbox = {
  id: string;
  email: string;
  fromName: string;
  dailyCap: number;
  active: boolean;
  lastSentAt: string | null;
  sentToday: number;
};
