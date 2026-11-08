import type { SupabaseClient } from "@supabase/supabase-js";
import { readSend } from "../caps";
import { withOptOut } from "./checks";
import { passwordFor, smtpSend, type MailboxRow } from "./mailbox";
import { planSends, type PlanCandidate } from "./plan";
import { startOfRunDay, tzFor } from "./window";

// One send tick (cron every 5 minutes): load → plan (pure) → send → write. One email per mailbox per tick.

type QueuedRow = {
  id: string; person_id: string; step: number; subject: string; body: string;
  people: { email: string | null; suppressed: boolean; verify_status: string };
  companies: { country: string | null; timezone: string | null };
};
type SentRow = { person_id: string; step: number; mailbox: string | null; message_id: string | null; sent_at: string; subject: string };

const STOP_CLASSES = ["bounce", "unsubscribe", "reply", "positive", "question", "objection", "not_now", "hostile"];

async function loadMailboxes(db: SupabaseClient, now: Date) {
  const { data, error } = await db.from("mailboxes").select("*").eq("active", true).order("email");
  if (error) throw new Error(`Could not load mailboxes: ${error.message}`);
  const boxes = (data ?? []) as MailboxRow[];
  const { data: today, error: e2 } = await db.from("messages").select("mailbox").eq("direction", "out").eq("status", "sent").gte("sent_at", startOfRunDay(now).toISOString());
  if (e2) throw new Error(`Could not count sends: ${e2.message}`);
  const counts = new Map<string, number>();
  for (const r of today ?? []) counts.set(String(r.mailbox), (counts.get(String(r.mailbox)) ?? 0) + 1);
  return boxes.map((b) => ({ row: b, plan: { email: b.email, dailyCap: b.daily_cap, active: b.active, lastSentAt: b.last_sent_at, sentToday: counts.get(b.email) ?? 0 } }));
}

async function loadCandidates(db: SupabaseClient) {
  const { data, error } = await db.from("messages")
    .select("id, person_id, step, subject, body, people!inner(email, suppressed, verify_status), companies!inner(country, timezone)")
    .eq("direction", "out").eq("status", "queued").eq("channel", "email").order("step").limit(500);
  if (error) throw new Error(`Could not load queue: ${error.message}`);
  const queued = (data ?? []) as unknown as QueuedRow[];
  const personIds = [...new Set(queued.map((q) => q.person_id))];
  const { data: sent } = await db.from("messages").select("person_id, step, mailbox, message_id, sent_at, subject")
    .in("person_id", personIds).eq("direction", "out").eq("status", "sent").order("step");
  const { data: inbound } = await db.from("messages").select("person_id, class").in("person_id", personIds).eq("direction", "in");
  const stopped = new Set((inbound ?? []).filter((m) => STOP_CLASSES.includes(String(m.class))).map((m) => String(m.person_id)));
  return { queued, sent: (sent ?? []) as SentRow[], stopped };
}

// The next queued step per person only (step 2 waits until step 1 is sent).
function nextPerPerson(queued: QueuedRow[], sent: SentRow[]): QueuedRow[] {
  const sentSteps = new Map<string, number>();
  for (const s of sent) sentSteps.set(s.person_id, Math.max(sentSteps.get(s.person_id) ?? 0, s.step));
  const seen = new Set<string>();
  return queued.filter((q) => {
    if (seen.has(q.person_id) || q.step !== (sentSteps.get(q.person_id) ?? 0) + 1) return false;
    seen.add(q.person_id);
    return true;
  });
}

export async function sendTick(db: SupabaseClient, now = new Date()) {
  const { data: sendRow } = await db.from("settings").select("value").eq("key", "send").maybeSingle();
  const settings = readSend(sendRow?.value);
  const boxes = await loadMailboxes(db, now);
  const { queued, sent, stopped } = await loadCandidates(db);
  const next = nextPerPerson(queued, sent);
  const prevOf = (pid: string) => sent.filter((s) => s.person_id === pid);
  const candidates: PlanCandidate[] = next.map((q) => {
    const prev = prevOf(q.person_id);
    return {
      messageId: q.id, personId: q.person_id, step: q.step, tz: tzFor(q.companies.country, q.companies.timezone),
      mailbox: prev[0]?.mailbox ?? null, prevSentAt: prev.at(-1)?.sent_at ?? null,
      stopped: stopped.has(q.person_id) || q.people.suppressed || q.people.verify_status !== "ok" || !q.people.email,
    };
  });
  const firstEmailsToday = sent.filter((s) => s.step === 1 && s.sent_at >= startOfRunDay(now).toISOString()).length;
  const plan = planSends({ now, mailboxes: boxes.map((b) => b.plan), candidates, firstEmailsToday, settings, jitterMinutes: Math.random() * 6 });

  const log: string[] = [];
  for (const s of plan.sends) {
    const q = next.find((x) => x.id === s.messageId)!;
    const mb = boxes.find((b) => b.row.email === s.mailbox)!.row;
    const prev = prevOf(q.person_id);
    const refs = prev.map((p) => p.message_id).filter((x): x is string => !!x);
    const subject = s.step === 1 ? q.subject : `Re: ${prev[0]?.subject || q.subject}`;
    const text = withOptOut(q.body, settings.optOutLine);
    try {
      const messageId = await smtpSend(mb, await passwordFor(db, mb.id), { to: q.people.email!, subject, text, inReplyTo: refs.at(-1), references: refs });
      const at = new Date().toISOString();
      await db.from("messages").update({ status: "sent", sent_at: at, mailbox: mb.email, message_id: messageId, in_reply_to: refs.at(-1) ?? null, subject, body: text }).eq("id", q.id);
      await db.from("mailboxes").update({ last_sent_at: at }).eq("id", mb.id);
      if (s.step === 1) await db.from("companies").update({ status: "contacted" }).eq("id", (await companyOf(db, q.id)) ?? "");
      log.push(`sent step ${s.step} from ${mb.email}`);
    } catch (e) {
      await db.from("messages").update({ status: "failed", error: (e as Error).message.slice(0, 300) }).eq("id", q.id);
      log.push(`FAILED from ${mb.email}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  return { sent: plan.sends.length, skipped: plan.skipped, log };
}

async function companyOf(db: SupabaseClient, messageId: string): Promise<string | null> {
  const { data } = await db.from("messages").select("company_id").eq("id", messageId).maybeSingle();
  return (data?.company_id as string | undefined) ?? null;
}
