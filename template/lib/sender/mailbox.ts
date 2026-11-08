import nodemailer from "nodemailer";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../crypto";

// Mailbox access for the own sender: SMTP to send, IMAP to read (see replies.ts). App passwords are decrypted only
// here, on the server, from table mailbox_secrets (no API access).

export type MailboxRow = {
  id: string; email: string; from_name: string; smtp_host: string; smtp_port: number; imap_host: string; imap_port: number;
  daily_cap: number; active: boolean; last_sent_at: string | null; imap_last_uid: number;
};

export async function passwordFor(db: SupabaseClient, mailboxId: string): Promise<string> {
  const { data, error } = await db.from("mailbox_secrets").select("app_password_enc").eq("mailbox_id", mailboxId).single();
  if (error || !data) throw new Error(`No password stored for mailbox ${mailboxId}`);
  return decrypt(data.app_password_enc as string);
}

export type OutMail = { to: string; subject: string; text: string; inReplyTo?: string | null; references?: string[] };

// One plain-text email (no HTML, no tracking). Follow-ups thread under the earlier Message-IDs.
export async function smtpSend(mb: MailboxRow, password: string, m: OutMail): Promise<string> {
  const messageId = `<${Date.now().toString(36)}.${randomBytes(6).toString("hex")}@${mb.email.split("@")[1]}>`;
  const transport = nodemailer.createTransport({ host: mb.smtp_host, port: mb.smtp_port, secure: mb.smtp_port === 465, auth: { user: mb.email, pass: password } });
  await transport.sendMail({
    from: { name: mb.from_name, address: mb.email },
    to: m.to,
    subject: m.subject,
    text: m.text,
    messageId,
    ...(m.inReplyTo ? { inReplyTo: m.inReplyTo, references: m.references?.length ? m.references : [m.inReplyTo] } : {}),
  });
  return messageId;
}
