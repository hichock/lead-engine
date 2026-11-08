import { DEFAULT_CAPS, readCaps, readSend, type Caps, type SendSettings } from "../caps";
import { SOURCES } from "../sources/registry";

// Pure parsers for the Settings forms: form fields in, a checked value or an error message out.

type Fields = Record<string, string>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function fieldsOf(fd: FormData): Fields {
  const out: Fields = {};
  fd.forEach((v, k) => { if (typeof v === "string") out[k] = v.trim(); });
  return out;
}

export function parseCaps(f: Fields): Parsed<Caps> {
  const raw: Record<string, number> = {};
  for (const k of Object.keys(DEFAULT_CAPS) as (keyof Caps)[]) {
    const n = Number(f[k]);
    if (f[k] === undefined || f[k] === "" || !Number.isFinite(n) || n < 0) return { ok: false, error: `${k}: enter a number of 0 or more` };
    raw[k] = n;
  }
  if (raw.bigqueryGbPerQuery > 1000) return { ok: false, error: "bigqueryGbPerQuery: 1,000 GB is the free monthly tier; keep one query well under it" };
  return { ok: true, value: readCaps(raw) };
}

export function parseSend(f: Fields): Parsed<SendSettings> {
  const start = Number(f.windowStartHour);
  const end = Number(f.windowEndHour);
  if (!(start >= 0 && end <= 24 && start < end)) return { ok: false, error: "Send window: start hour must be before end hour (0–24)" };
  const delays = (f.stepDelays ?? "").split(/[,\s]+/).filter(Boolean).map(Number);
  if (!delays.length || delays.some((d) => !(d >= 1 && d <= 30))) return { ok: false, error: "Follow-up delays: business days between 1 and 30, e.g. 3, 5" };
  const gap = Number(f.minGapMinutes);
  if (!(gap >= 2)) return { ok: false, error: "Gap between sends: at least 2 minutes" };
  const perDay = Number(f.newPerDay);
  if (!(perDay >= 0 && perDay <= 200)) return { ok: false, error: "New leads per day: 0–200" };
  return {
    ok: true,
    value: readSend({ windowStartHour: start, windowEndHour: end, minGapMinutes: gap, stepDelays: delays, newPerDay: perDay, optOutLine: f.optOutLine ?? "", autoQueue: f.autoQueue === "on" }),
  };
}

export function parseEnabled(f: Fields): Record<string, boolean> {
  return Object.fromEntries(Object.keys(SOURCES).map((k) => [k, f[`src_${k}`] === "on"]));
}

export type NewMailbox = { email: string; fromName: string; password: string; dailyCap: number; smtpHost: string; imapHost: string };

export function parseMailbox(f: Fields): Parsed<NewMailbox> {
  const email = (f.email ?? "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Mailbox: enter a valid email address" };
  if (!f.fromName) return { ok: false, error: "Mailbox: enter the sender name people will see" };
  const password = (f.password ?? "").replace(/\s+/g, "");
  if (password.length < 8) return { ok: false, error: "Mailbox: paste the app password (16 characters for Google)" };
  const cap = Number(f.dailyCap);
  if (!(cap >= 1 && cap <= 50)) return { ok: false, error: "Mailbox: daily cap 1–50 (start at 10–15 on a new mailbox)" };
  return { ok: true, value: { email, fromName: f.fromName, password, dailyCap: cap, smtpHost: f.smtpHost || "smtp.gmail.com", imapHost: f.imapHost || "imap.gmail.com" } };
}
