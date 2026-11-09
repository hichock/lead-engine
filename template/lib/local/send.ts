import { randomUUID } from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { readSend } from "../caps";
import { withOptOut } from "../sender/checks";
import { classifyInbound } from "../sender/classify";
import { smtpSend, type MailboxRow } from "../sender/mailbox";
import { planSends, type PlanCandidate, type PlanMailbox } from "../sender/plan";
import { startOfRunDay, tzFor } from "../sender/window";
import type { LocalStore } from "./store";

// The own sender in the local mode: the same planner as the app (window in the lead's time zone, one email per
// mailbox per run, gap, daily caps, follow-ups threaded from the same mailbox), run by `le send` from a scheduled
// task or the computer's cron, and `le replies` to read replies over IMAP and stop sequences.
// Mailboxes come from .env.local (never from kb/ or git):
//   MAILBOX_1=you@send-domain.com|Your Name|smtp.gmail.com:465|imap.gmail.com:993|15
//   MAILBOX_1_PASSWORD=<app password>

export type LocalMailbox = { row: MailboxRow; password: string };

export function parseMailboxes(env: Record<string, string | undefined>): LocalMailbox[] {
  const out: LocalMailbox[] = [];
  for (let i = 1; i <= 50; i++) {
    const spec = env[`MAILBOX_${i}`];
    if (!spec) continue;
    const [email, fromName, smtp, imap, cap] = spec.split("|").map((x) => x.trim());
    const [smtpHost, smtpPort] = (smtp ?? "").split(":");
    const [imapHost, imapPort] = (imap ?? "").split(":");
    const password = env[`MAILBOX_${i}_PASSWORD`] ?? "";
    if (!email?.includes("@") || !smtpHost || !password) throw new Error(`MAILBOX_${i}: needs email|name|smtp-host:port|imap-host:port|daily-cap and MAILBOX_${i}_PASSWORD`);
    out.push({ password, row: {
      id: `mb${i}`, email: email.toLowerCase(), from_name: fromName || email, smtp_host: smtpHost, smtp_port: Number(smtpPort) || 465,
      imap_host: imapHost || smtpHost.replace(/^smtp\./, "imap."), imap_port: Number(imapPort) || 993,
      daily_cap: Math.min(Number(cap) || 15, 50), active: true, last_sent_at: null, imap_last_uid: 0,
    } });
  }
  return out;
}

const STOP = ["bounce", "unsubscribe", "reply", "positive", "question", "objection", "not_now", "hostile"];

async function candidates(s: LocalStore) {
  const queued = await s.all(`select m.id, m.person_id, m.company_id, m.step, m.subject, m.body, p.email, p.suppressed, p.verify_status, c.country, c.timezone
    from messages m join people p on p.id = m.person_id join companies c on c.id = m.company_id
    where m.direction = 'out' and m.status = 'queued' and m.channel = 'email' order by m.step limit 500`);
  const sent = await s.all("select person_id, step, mailbox, message_id, sent_at, subject from messages where direction = 'out' and status = 'sent' order by step");
  const stopped = new Set((await s.all("select person_id, class from messages where direction = 'in'")).filter((m) => STOP.includes(String(m.class))).map((m) => String(m.person_id)));
  const lastStep = new Map<string, number>();
  for (const x of sent) lastStep.set(String(x.person_id), Math.max(lastStep.get(String(x.person_id)) ?? 0, Number(x.step)));
  const seen = new Set<string>();
  const next = queued.filter((q) => {
    const pid = String(q.person_id);
    if (seen.has(pid) || Number(q.step) !== (lastStep.get(pid) ?? 0) + 1) return false;
    seen.add(pid);
    return true;
  });
  return { next, sent, stopped };
}

export async function sendLocal(s: LocalStore, boxes: LocalMailbox[], opts: { dryRun?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const settings = readSend(await s.setting("send"));
  const day = startOfRunDay(now).toISOString();
  const { next, sent, stopped } = await candidates(s);
  const today = sent.filter((x) => String(x.sent_at) >= day);
  const plans: PlanMailbox[] = boxes.map((b) => ({
    email: b.row.email, dailyCap: b.row.daily_cap, active: true, sentToday: today.filter((x) => x.mailbox === b.row.email).length,
    lastSentAt: sent.filter((x) => x.mailbox === b.row.email).map((x) => String(x.sent_at)).sort().at(-1) ?? null,
  }));
  const prevOf = (pid: string) => sent.filter((x) => String(x.person_id) === pid);
  const cands: PlanCandidate[] = next.map((q) => {
    const prev = prevOf(String(q.person_id));
    return { messageId: String(q.id), personId: String(q.person_id), step: Number(q.step), tz: tzFor((q.country as string) ?? null, (q.timezone as string) ?? null),
      mailbox: (prev[0]?.mailbox as string) ?? null, prevSentAt: (prev.at(-1)?.sent_at as string) ?? null,
      stopped: stopped.has(String(q.person_id)) || q.suppressed === true || q.verify_status !== "ok" || !q.email };
  });
  const plan = planSends({ now, mailboxes: plans, candidates: cands, firstEmailsToday: today.filter((x) => Number(x.step) === 1).length, settings, jitterMinutes: Math.random() * 6 });
  if (opts.dryRun) return { planned: plan.sends, skipped: plan.skipped, sent: 0, log: [] as string[] };
  const log: string[] = [];
  for (const p of plan.sends) {
    const q = next.find((x) => x.id === p.messageId)!;
    const mb = boxes.find((b) => b.row.email === p.mailbox)!;
    const prev = prevOf(p.personId);
    const refs = prev.map((x) => x.message_id as string | null).filter((x): x is string => !!x);
    const subject = p.step === 1 ? String(q.subject) : `Re: ${prev[0]?.subject || q.subject}`;
    const text = withOptOut(String(q.body), settings.optOutLine);
    try {
      const messageId = await smtpSend(mb.row, mb.password, { to: String(q.email), subject, text, inReplyTo: refs.at(-1), references: refs });
      await s.sql.run("update messages set status = 'sent', sent_at = ?, mailbox = ?, message_id = ?, in_reply_to = ?, subject = ?, body = ? where id = ?",
        [new Date().toISOString(), mb.row.email, messageId, refs.at(-1) ?? null, subject, text, p.messageId]);
      if (p.step === 1) await s.sql.run("update companies set status = 'contacted' where id = ?", [String(q.company_id)]);
      log.push(`sent step ${p.step} from ${mb.row.email}`);
    } catch (e) {
      await s.sql.run("update messages set status = 'failed', error = ? where id = ?", [(e as Error).message.slice(0, 300), p.messageId]);
      log.push(`FAILED from ${mb.row.email}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  return { planned: plan.sends, skipped: plan.skipped, sent: log.filter((l) => l.startsWith("sent")).length, log };
}

async function match(s: LocalStore, ids: string[], from: string) {
  for (const id of ids) {
    const m = await s.get("select person_id, company_id from messages where message_id = ? and direction = 'out'", [id]);
    if (m) return { personId: String(m.person_id), companyId: String(m.company_id) };
  }
  const p = await s.get("select id, company_id from people where email = ?", [from]);
  return p ? { personId: String(p.id), companyId: String(p.company_id) } : null;
}

async function record(s: LocalStore, mb: string, m: { personId: string; companyId: string }, kind: string, mail: { subject: string; text: string; id: string | null; at: Date }) {
  await s.sql.run("insert into messages (id, person_id, company_id, channel, mailbox, step, direction, subject, body, status, class, message_id, sent_at, created_at) values (?, ?, ?, 'email', ?, 0, 'in', ?, ?, 'received', ?, ?, ?, ?)",
    [randomUUID(), m.personId, m.companyId, mb, mail.subject, mail.text, kind, mail.id, mail.at.toISOString(), new Date().toISOString()]);
  if (kind === "auto_reply") return;
  await s.sql.run("update messages set status = 'stopped' where person_id = ? and direction = 'out' and status in ('queued','draft')", [m.personId]);
  if (kind === "unsubscribe") await s.suppressPerson(m.personId, "opt-out reply");
  if (kind === "reply" || kind === "unsubscribe") await s.sql.run("update companies set status = 'replied' where id = ?", [m.companyId]);
}

// Reads new mail per mailbox since the last run. Bounces are matched by thread headers; unrelated mail is skipped.
export async function repliesLocal(s: LocalStore, boxes: LocalMailbox[]) {
  const report: string[] = [];
  const uids = ((await s.setting("imap_uid")) ?? {}) as Record<string, number>;
  for (const { row, password } of boxes) {
    const client = new ImapFlow({ host: row.imap_host, port: row.imap_port, secure: true, auth: { user: row.email, pass: password }, logger: false });
    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      const last = uids[row.email] ?? 0;
      let max = last;
      try {
        for await (const msg of client.fetch(`${last + 1}:*`, { uid: true, source: true }, { uid: true })) {
          if (msg.uid <= last || !msg.source) continue;
          max = Math.max(max, msg.uid);
          const p = await simpleParser(msg.source);
          const from = (p.from?.value?.[0]?.address ?? "").toLowerCase();
          const subject = p.subject ?? "", text = (p.text ?? "").slice(0, 8000);
          const kind = classifyInbound({ from, subject, text, autoSubmitted: String(p.headers.get("auto-submitted") ?? "") });
          const refs = ([] as string[]).concat((p.references as string[] | string | undefined) ?? []);
          const m = await match(s, [p.inReplyTo as string | undefined, ...refs].filter((x): x is string => !!x), from);
          if (!m) continue;
          await record(s, row.email, m, kind, { subject, text, id: p.messageId ?? null, at: p.date ?? new Date() });
          report.push(`${kind} from ${from} to ${row.email}`);
        }
      } finally { lock.release(); }
      uids[row.email] = max;
      await client.logout();
    } catch (e) {
      report.push(`IMAP ${row.email}: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  await s.setSetting("imap_uid", uids);
  return report;
}
