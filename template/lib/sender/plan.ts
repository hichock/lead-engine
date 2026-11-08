import { addBusinessDays, inWindow } from "./window";
import type { SendSettings } from "../caps";

// Plans one send tick. Pure: the route loads the rows, this decides, the route sends and writes.
// Rules: at most one email per mailbox per tick; a gap of minGap (+ jitter) minutes per mailbox; a daily cap per
// mailbox (all steps); a daily cap on first emails across all mailboxes; only inside the lead's send window;
// follow-ups only after the step delay in business days and always from the mailbox that sent step 1;
// follow-ups are planned before first emails, so running sequences finish first.

export type PlanMailbox = { email: string; dailyCap: number; active: boolean; lastSentAt: string | null; sentToday: number };

export type PlanCandidate = {
  messageId: string;
  personId: string;
  step: number; // 1, 2, 3
  tz: string;
  mailbox: string | null; // mailbox that sent earlier steps (required for step > 1)
  prevSentAt: string | null; // when the previous step went out (required for step > 1)
  stopped: boolean; // person replied, bounced, opted out or is suppressed
};

export type PlanInput = {
  now: Date;
  mailboxes: PlanMailbox[];
  candidates: PlanCandidate[];
  firstEmailsToday: number;
  settings: SendSettings;
  jitterMinutes?: number; // random 0–6 from the caller; 0 in tests
};

export type PlannedSend = { messageId: string; personId: string; mailbox: string; step: number };
export type Plan = { sends: PlannedSend[]; skipped: Record<string, number> };

function freeMailboxes(i: PlanInput): PlanMailbox[] {
  const gapMs = (i.settings.minGapMinutes + (i.jitterMinutes ?? 0)) * 60_000;
  return i.mailboxes.filter((m) =>
    m.active && m.sentToday < m.dailyCap && (!m.lastSentAt || i.now.getTime() - new Date(m.lastSentAt).getTime() >= gapMs));
}

export function followUpDue(c: PlanCandidate, now: Date, delays: number[]): boolean {
  if (c.step === 1) return true;
  const delay = delays[c.step - 2];
  if (delay == null || !c.prevSentAt) return false;
  return addBusinessDays(new Date(c.prevSentAt), delay).getTime() <= now.getTime();
}

function skipReason(c: PlanCandidate, i: PlanInput): string | null {
  if (c.stopped) return "stopped";
  if (!inWindow(i.now, c.tz, i.settings.windowStartHour, i.settings.windowEndHour)) return "outside send window";
  if (!followUpDue(c, i.now, i.settings.stepDelays)) return "follow-up not due";
  if (c.step > 1 && !c.mailbox) return "follow-up without its mailbox";
  return null;
}

export function planSends(i: PlanInput): Plan {
  const free = freeMailboxes(i);
  const sends: PlannedSend[] = [];
  const skipped: Record<string, number> = {};
  const skip = (r: string) => { skipped[r] = (skipped[r] ?? 0) + 1; };
  let newLeft = i.settings.newPerDay - i.firstEmailsToday;
  const ordered = [...i.candidates].sort((a, b) => b.step - a.step);
  for (const c of ordered) {
    if (!free.length) { skip("no mailbox free this tick"); continue; }
    const reason = skipReason(c, i);
    if (reason) { skip(reason); continue; }
    if (c.step === 1 && newLeft <= 0) { skip("daily first-email cap reached"); continue; }
    const idx = c.step > 1 ? free.findIndex((m) => m.email === c.mailbox) : 0;
    if (idx < 0) { skip("its mailbox is busy, capped or off"); continue; }
    const [mb] = free.splice(idx, 1);
    sends.push({ messageId: c.messageId, personId: c.personId, mailbox: mb.email, step: c.step });
    if (c.step === 1) newLeft--;
  }
  return { sends, skipped };
}
