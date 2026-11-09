import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemo, supabaseConfigured } from "../env";
import { userClient } from "../supabase/server";
import { allRows } from "../supabase/admin";
import { readCaps, readSend, type Caps, type SendSettings } from "../caps";
import { demoCompanies, demoMailboxes, demoMessages, demoPeople, demoRuns, demoSignals, DEMO_NOW } from "../demo";
import type { Mailbox, SourceRun } from "../types";
import { num, str, toCompany, toMessage, toPerson, toRun, toSignal, type R } from "./rows";
import { startOfRunDay } from "../sender/window";

export { toCompany, toMessage, toPerson, toRun, toSignal };

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

// CSV export (Leads page button): companies, people and messages as the signed-in user.
export const loadExport = () => load(
  () => ({ companies: demoCompanies, people: demoPeople, messages: demoMessages }),
  async ({ db }) => ({
    companies: (await rows(db, "companies", "*")).map(toCompany),
    people: (await rows(db, "people", "*")).map(toPerson),
    messages: (await rows(db, "messages", "id, person_id, company_id, channel, mailbox, step, subject, body, direction, class, status, send_after, sent_at")).map(toMessage),
  }),
);
