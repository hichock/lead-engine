// Send checks before a draft can be queued, in this order (cheapest and most important first):
// duplicate in the batch → already contacted / suppressed (email and domain) → excluded segment or competitor →
// verifier says ok → evidence line present → copy within limits. Pure.

export type CheckLead = {
  personId: string;
  email: string | null;
  verifyStatus: string;
  suppressed: boolean;
  companyDomain: string;
  companyQualified: boolean | null;
  evidence: string | null;
  excluded: boolean; // competitor, existing client or excluded segment (from kb/icp.md exclusions)
  body: string;
  subject: string;
};

export type CheckContext = {
  suppressedEmails: Set<string>;
  suppressedDomains: Set<string>;
  contactedEmails: Set<string>; // anyone we already emailed
  contactedDomains: Set<string>; // any company we already emailed
  maxWords: number;
};

export const wordCount = (s: string) => (s.trim().match(/\S+/g) ?? []).length;
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";

export function checkLead(l: CheckLead, ctx: CheckContext, seen: Set<string>): string | null {
  const email = (l.email ?? "").trim().toLowerCase();
  if (!email) return "no email";
  if (seen.has(email)) return "duplicate in this batch";
  if (l.suppressed || ctx.suppressedEmails.has(email) || ctx.suppressedDomains.has(domainOf(email))) return "suppressed";
  if (ctx.contactedEmails.has(email) || ctx.contactedDomains.has(l.companyDomain.toLowerCase())) return "already contacted";
  if (l.excluded) return "excluded segment or competitor";
  if (l.companyQualified !== true) return "company not qualified";
  if (l.verifyStatus !== "ok") return `verifier says ${l.verifyStatus} (only ok is sendable)`;
  if (!l.evidence?.trim()) return "no evidence line";
  if (!l.subject.trim()) return "empty subject";
  if (wordCount(l.body) > ctx.maxWords) return `email is ${wordCount(l.body)} words (max ${ctx.maxWords})`;
  return null;
}

export function runChecks(leads: CheckLead[], ctx: CheckContext) {
  const seen = new Set<string>();
  const pass: CheckLead[] = [];
  const fail: { personId: string; reason: string }[] = [];
  for (const l of leads) {
    const reason = checkLead(l, ctx, seen);
    if (reason) fail.push({ personId: l.personId, reason });
    else { pass.push(l); seen.add((l.email ?? "").toLowerCase()); }
  }
  return { pass, fail };
}

// Appends the opt-out line (on by default) after the signature. Empty line = off.
export function withOptOut(body: string, optOutLine: string): string {
  const line = optOutLine.trim();
  if (!line || body.includes(line)) return body;
  return `${body.trimEnd()}\n\n${line}`;
}
