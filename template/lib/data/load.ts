import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemo, supabaseConfigured } from "../env";
import { userClient } from "../supabase/server";
import { allRows } from "../supabase/admin";
import { readCaps, readSend, type Caps, type SendSettings } from "../caps";
import { demoCompanies, demoMailboxes, demoMessages, demoPeople, demoRuns, demoSignals, DEMO_NOW } from "../demo";
import type { Company, Mailbox, Message, Person, Signal, SourceRun } from "../types";
import { startOfRunDay } from "../sender/window";

// Loaders for pages: read only, as the signed-in user (RLS applies). Each returns a typed shape with defaults
// applied, or a state the page shows instead ("connect Supabase", "sign in", "no access", "could not load").

export type PageState =
  | { mode: "unconfigured" }
  | { mode: "signed-out" }
  | { mode: "no-access"; email: string }
  | { mode: "error"; message: string };
export type Loaded<T> = { mode: "demo" | "live"; data: T; now: Date } | PageState;

export type Ctx = { db: SupabaseClient; email: string };

export async function context(): Promise<Ctx | PageState> {
  if (!supabaseConfigured()) return { mode: "unconfigured" };
  const db = (await userClient()) as unknown as SupabaseClient;
  const { data } = await db.auth.getUser();
  if (!data.user) return { mode: "signed-out" };
  const email = data.user.email ?? "";
  const { data: member } = await db.from("team_members").select("email").eq("email", email.toLowerCase()).maybeSingle();
  return member ? { db, email } : { mode: "no-access", email };
}

async function load<T>(demo: () => T, live: (c: Ctx) => Promise<T>): Promise<Loaded<T>> {
  if (isDemo()) return { mode: "demo", data: demo(), now: DEMO_NOW };
  try {
    const c = await context();
    if ("mode" in c) return c;
    return { mode: "live", data: await live(c), now: new Date() };
  } catch (e) {
    return { mode: "error", message: (e as Error).message };
  }
}

// Row mappers: normalise once here.
type R = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (v == null ? 0 : Number(v));

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

async function rows(db: SupabaseClient, table: string, select: string, order = "id"): Promise<R[]> {
  return allRows<R>((from, to) => db.from(table).select(select).order(order).range(from, to) as unknown as PromiseLike<{ data: R[] | null; error: { message: string } | null }>);
}

async function setting(db: SupabaseClient, key: string): Promise<unknown> {
  const { data, error } = await db.from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data?.value ?? null;
}

export const loadLeads = () => load(
  () => ({ companies: demoCompanies, signals: demoSignals }),
  async ({ db }) => ({
    companies: (await rows(db, "companies", "*")).map(toCompany),
    signals: (await rows(db, "signals", "id, company_id, person_id, kind, value, url, observed_at")).map(toSignal),
  }),
);

export const loadCompany = (id: string) => load(
  () => {
    const c = demoCompanies.find((x) => x.id === id) ?? null;
    return { company: c, signals: demoSignals.filter((s) => s.companyId === id), people: demoPeople.filter((p) => p.companyId === id), messages: demoMessages.filter((m) => m.companyId === id) };
  },
  async ({ db }) => {
    const { data, error } = await db.from("companies").select("*, signals(*), people(*), messages(*)").eq("id", id).maybeSingle();
    if (error) throw new Error(`Could not load company: ${error.message}`);
    if (!data) return { company: null, signals: [], people: [], messages: [] };
    const r = data as R;
    return {
      company: toCompany(r), signals: ((r.signals as R[]) ?? []).map(toSignal),
      people: ((r.people as R[]) ?? []).map(toPerson), messages: ((r.messages as R[]) ?? []).map(toMessage),
    };
  },
);

export type SourcesData = { runs: SourceRun[]; caps: Caps; enabled: Record<string, boolean> };
export const loadSources = () => load<SourcesData>(
  () => ({ runs: demoRuns, caps: readCaps(null), enabled: { httparchive: true, urlscan: true, apollo: true, monid: true, millionverifier: true } }),
  async ({ db }) => {
    const since = new Date(Date.now() - 62 * 86_400_000).toISOString();
    const runs = await allRows<R>((from, to) => db.from("sources_runs").select("*").gte("started_at", since).order("id").range(from, to) as unknown as PromiseLike<{ data: R[] | null; error: { message: string } | null }>);
    return { runs: runs.map(toRun), caps: readCaps(await setting(db, "caps")), enabled: ((await setting(db, "sources_enabled")) ?? {}) as Record<string, boolean> };
  },
);

async function mailboxesWithCounts(db: SupabaseClient): Promise<Mailbox[]> {
  const boxes = await rows(db, "mailboxes", "id, email, from_name, daily_cap, active, last_sent_at", "email");
  const { data, error } = await db.from("messages").select("mailbox").eq("direction", "out").eq("status", "sent").gte("sent_at", startOfRunDay(new Date()).toISOString());
  if (error) throw new Error(`Could not count sends: ${error.message}`);
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(String(r.mailbox), (counts.get(String(r.mailbox)) ?? 0) + 1);
  return boxes.map((b) => ({ id: String(b.id), email: String(b.email), fromName: String(b.from_name), dailyCap: num(b.daily_cap), active: b.active === true, lastSentAt: str(b.last_sent_at), sentToday: counts.get(String(b.email)) ?? 0 }));
}

export const loadOutreach = () => load(
  () => ({ messages: demoMessages, people: demoPeople, companies: demoCompanies, mailboxes: demoMailboxes }),
  async ({ db }) => {
    const messages = (await rows(db, "messages", "*")).map(toMessage);
    const personIds = [...new Set(messages.map((m) => m.personId))];
    const companyIds = [...new Set(messages.map((m) => m.companyId))];
    const { data: p } = personIds.length ? await db.from("people").select("*").in("id", personIds) : { data: [] };
    const { data: c } = companyIds.length ? await db.from("companies").select("*").in("id", companyIds) : { data: [] };
    return { messages, people: (p ?? []).map(toPerson), companies: (c ?? []).map(toCompany), mailboxes: await mailboxesWithCounts(db) };
  },
);

export type SettingsData = { caps: Caps; send: SendSettings; enabled: Record<string, boolean>; mailboxes: Mailbox[]; forwardTo: string; email: string };
export const loadSettings = () => load<SettingsData>(
  () => ({ caps: readCaps(null), send: readSend(null), enabled: { httparchive: true, urlscan: true, apollo: true, monid: true, millionverifier: true }, mailboxes: demoMailboxes, forwardTo: "you@example.com", email: "demo@example.com" }),
  async ({ db, email }) => ({
    caps: readCaps(await setting(db, "caps")), send: readSend(await setting(db, "send")),
    enabled: ((await setting(db, "sources_enabled")) ?? {}) as Record<string, boolean>,
    mailboxes: await mailboxesWithCounts(db), forwardTo: String((await setting(db, "forward_to")) ?? ""), email,
  }),
);
