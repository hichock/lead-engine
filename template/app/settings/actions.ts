"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { context } from "@/lib/data/load";
import { encrypt } from "@/lib/crypto";
import { serviceConfigured, isDemo } from "@/lib/env";
import { adminClient } from "@/lib/supabase/admin";
import { fieldsOf, parseCaps, parseEnabled, parseMailbox, parseSend, type Parsed } from "@/lib/forms/settings-form";

// Server actions: parse → load (who is asking) → decide → write → message. Each step is its own function.

const back = (q: string) => redirect(`/settings?${q}`);

async function team() {
  if (isDemo()) back("error=Demo mode: nothing is saved");
  const c = await context();
  if ("mode" in c) back(`error=${encodeURIComponent("Sign in as a team member to change settings")}`);
  return c as Exclude<Awaited<ReturnType<typeof context>>, { mode: string }>;
}

async function saveSetting<T>(key: string, parsed: Parsed<T>) {
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.error)}`);
  const { db } = await team();
  const { error } = await db.from("settings").upsert({ key, value: (parsed as { value: T }).value, updated_at: new Date().toISOString() });
  if (error) back(`error=${encodeURIComponent(`Could not save: ${error.message}`)}`);
  revalidatePath("/", "layout");
  back(`saved=${key}`);
}

export async function saveCaps(fd: FormData) { await saveSetting("caps", parseCaps(fieldsOf(fd))); }
export async function saveSend(fd: FormData) { await saveSetting("send", parseSend(fieldsOf(fd))); }
export async function saveSources(fd: FormData) { await saveSetting("sources_enabled", { ok: true, value: parseEnabled(fieldsOf(fd)) }); }

export async function saveForwardTo(fd: FormData) {
  const v = fieldsOf(fd).forwardTo ?? "";
  const ok = v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  await saveSetting("forward_to", ok ? { ok: true, value: v } : { ok: false, error: "Forward replies to: enter an email address" });
}

export async function addMailbox(fd: FormData) {
  const parsed = parseMailbox(fieldsOf(fd));
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.error)}`);
  await team();
  if (!serviceConfigured()) back("error=Set SUPABASE_SERVICE_ROLE_KEY and MAILBOX_ENCRYPTION_KEY on the server first");
  const m = (parsed as { value: ReturnType<typeof parseMailbox> extends Parsed<infer T> ? T : never }).value;
  const db = adminClient(); // passwords go to mailbox_secrets, which only the service role can write
  const { data, error } = await db.from("mailboxes").upsert({ email: m.email, from_name: m.fromName, daily_cap: m.dailyCap, smtp_host: m.smtpHost, imap_host: m.imapHost }, { onConflict: "email" }).select("id").single();
  if (error || !data) back(`error=${encodeURIComponent(`Could not save mailbox: ${error?.message}`)}`);
  const { error: e2 } = await db.from("mailbox_secrets").upsert({ mailbox_id: data!.id, app_password_enc: encrypt(m.password) });
  if (e2) back(`error=${encodeURIComponent(`Could not save password: ${e2.message}`)}`);
  revalidatePath("/settings");
  back("saved=mailbox");
}

export async function toggleMailbox(fd: FormData) {
  const f = fieldsOf(fd);
  const { db } = await team();
  const { error } = await db.from("mailboxes").update({ active: f.active === "true" }).eq("email", f.email ?? "");
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings");
  back("saved=mailbox");
}
