// First-pass classification of inbound mail, done in code so stops happen at once. Pure.
// bounce and auto_reply are certain enough to act on; "unsubscribe" suppresses the sender everywhere;
// everything else is "reply" and waits for the outreach-review skill (positive / question / objection / not now).

export type InboundClass = "bounce" | "auto_reply" | "unsubscribe" | "reply";

const BOUNCE_FROM = /mailer-daemon|postmaster|mail delivery/i;
const BOUNCE_SUBJECT = /undeliverable|delivery status notification|failure notice|returned mail|delivery has failed/i;
const AUTO_SUBJECT = /^(auto(matic)?[ -]?reply|out of (the )?office|abwesenheit|absence|automatische antwort|réponse automatique|respuesta automática)/i;
const UNSUB = /^\s*(no|stop|unsubscribe|remove me|please remove me|take me off|not interested)\b[\s.!]*$/i;
const UNSUB_ANY = /\b(unsubscribe|remove me from|take me off your list|stop emailing)\b/i;

export function classifyInbound(m: { from: string; subject: string; text: string; autoSubmitted?: string | null }): InboundClass {
  if (BOUNCE_FROM.test(m.from) || BOUNCE_SUBJECT.test(m.subject)) return "bounce";
  if (AUTO_SUBJECT.test(m.subject) || /^auto-(replied|generated)/i.test(m.autoSubmitted ?? "")) return "auto_reply";
  const firstLine = m.text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith(">")) ?? "";
  if (UNSUB.test(firstLine) || UNSUB_ANY.test(firstLine)) return "unsubscribe";
  return "reply";
}

// A bounce report names the failed address in its text; find which of our recipients it is.
export function bouncedAddress(text: string, candidates: string[]): string | null {
  const low = text.toLowerCase();
  return candidates.find((e) => low.includes(e.toLowerCase())) ?? null;
}
