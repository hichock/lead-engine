import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bouncedAddress, classifyInbound } from "./classify";
import { passwordFor, smtpSend, type MailboxRow } from "./mailbox";

// Reads new mail in every mailbox (IMAP). A reply, bounce or opt-out from a lead stops that person's sequence at once.
// Opt-outs are suppressed everywhere. Replies are forwarded to the owner (settings.forward_to) and wait for the
// outreach-review skill, which classifies them and drafts answers. Auto-replies are only recorded.

type Match = { personId: string; companyId: string } | null;

async function matchByThread(db: SupabaseClient, ids: string[]): Promise<Match> {
  if (!ids.length) return null;
  const { data } = await db.from("messages").select("person_id, company_id").in("message_id", ids).eq("direction", "out").limit(1);
  return data?.[0] ? { personId: data[0].person_id as string, companyId: data[0].company_id as string } : null;
}

async function matchByEmail(db: SupabaseClient, email: string): Promise<Match> {
  if (!email) return null;
  const { data } = await db.from("people").select("id, company_id").eq("email", email.toLowerCase()).maybeSingle();
  return data ? { personId: data.id as string, companyId: data.company_id as string } : null;
}

async function matchBounce(db: SupabaseClient, mailbox: string, text: string): Promise<Match> {
  const { data } = await db.from("messages").select("person_id, company_id, people!inner(email)").eq("mailbox", mailbox).eq("direction", "out").eq("status", "sent").limit(2000);
  const rows = (data ?? []) as unknown as { person_id: string; company_id: string; people: { email: string } }[];
  const hit = bouncedAddress(text, rows.map((r) => r.people.email));
  const row = rows.find((r) => r.people.email === hit);
  return row ? { personId: row.person_id, companyId: row.company_id } : null;
}

async function stopPerson(db: SupabaseClient, m: NonNullable<Match>, kind: string, email: string) {
  await db.from("messages").update({ status: "stopped" }).eq("person_id", m.personId).eq("direction", "out").in("status", ["queued", "draft"]);
  if (kind === "unsubscribe") {
    await db.from("people").update({ suppressed: true }).eq("id", m.personId);
    await db.from("suppression").upsert({ email, reason: "opt-out reply" }, { onConflict: "email" });
  }
  if (kind === "reply" || kind === "unsubscribe") await db.from("companies").update({ status: "replied" }).eq("id", m.companyId);
}

async function forward(db: SupabaseClient, mb: MailboxRow, password: string, from: string, subject: string, text: string) {
  const { data } = await db.from("settings").select("value").eq("key", "forward_to").maybeSingle();
  const to = typeof data?.value === "string" ? data.value : null;
  if (!to) return;
  await smtpSend(mb, password, { to, subject: `[reply] ${from}: ${subject}`, text: `Reply from ${from} to ${mb.email}. Answer from that mailbox.\n\n${text}` });
}

async function pollMailbox(db: SupabaseClient, mb: MailboxRow, report: string[]) {
  const password = await passwordFor(db, mb.id);
  const client = new ImapFlow({ host: mb.imap_host, port: mb.imap_port, secure: true, auth: { user: mb.email, pass: password }, logger: false });
  await client.connect();
  let maxUid = mb.imap_last_uid;
  const lock = await client.getMailboxLock("INBOX");
  try {
    for await (const msg of client.fetch(`${mb.imap_last_uid + 1}:*`, { uid: true, source: true }, { uid: true })) {
      if (msg.uid <= mb.imap_last_uid || !msg.source) continue;
      maxUid = Math.max(maxUid, msg.uid);
      const p = await simpleParser(msg.source);
      const from = (p.from?.value?.[0]?.address ?? "").toLowerCase();
      const subject = p.subject ?? "";
      const text = (p.text ?? "").slice(0, 8000);
      const kind = classifyInbound({ from, subject, text, autoSubmitted: String(p.headers.get("auto-submitted") ?? "") });
      const refs = ([] as string[]).concat((p.references as string[] | string | undefined) ?? []);
      const ids = [p.inReplyTo as string | undefined, ...refs].filter((x): x is string => !!x);
      const match = (await matchByThread(db, ids)) ?? (kind === "bounce" ? await matchBounce(db, mb.email, text) : await matchByEmail(db, from));
      if (!match) continue; // warm-up traffic and unrelated mail
      await db.from("messages").insert({
        person_id: match.personId, company_id: match.companyId, direction: "in", step: 0, mailbox: mb.email, subject, body: text,
        message_id: p.messageId ?? null, in_reply_to: (p.inReplyTo as string | undefined) ?? null, class: kind, status: "received",
        sent_at: (p.date ?? new Date()).toISOString(),
      });
      if (kind !== "auto_reply") await stopPerson(db, match, kind, from);
      if (kind === "reply") await forward(db, mb, password, from, subject, text).catch((e) => report.push(`forward failed: ${(e as Error).message}`));
      report.push(`${kind} from ${from} to ${mb.email}`);
    }
  } finally {
    lock.release();
  }
  if (maxUid > mb.imap_last_uid) await db.from("mailboxes").update({ imap_last_uid: maxUid }).eq("id", mb.id);
  await client.logout();
}

export async function pollReplies(db: SupabaseClient) {
  const { data, error } = await db.from("mailboxes").select("*").order("email");
  if (error) throw new Error(`Could not load mailboxes: ${error.message}`);
  const report: string[] = [];
  for (const mb of (data ?? []) as MailboxRow[]) {
    try { await pollMailbox(db, mb, report); } catch (e) { report.push(`IMAP ${mb.email}: ${(e as Error).message.slice(0, 160)}`); }
  }
  return report;
}
