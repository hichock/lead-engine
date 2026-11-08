import type { SupabaseClient } from "@supabase/supabase-js";
import { runChecks, type CheckLead } from "../sender/checks";

// Moves approved drafts into the send queue after the send checks. Step 1 becomes due now; later steps become due
// after their delay once the step before them is sent (the planner decides). Idempotent: only drafts move.

type Draft = { id: string; person_id: string; step: number; subject: string; body: string };

type PersonRow = {
  id: string; email: string | null; verify_status: string; suppressed: boolean;
  companies: { id: string; domain: string; qualified: boolean | null; evidence: string | null; excluded: boolean };
};

async function column(db: SupabaseClient, table: "suppression", col: "email" | "domain"): Promise<Set<string>> {
  const { data, error } = await db.from(table).select(col).not(col, "is", null).limit(10000);
  if (error) throw new Error(`Could not load ${table}: ${error.message}`);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return new Set(rows.map((r) => String(r[col]).toLowerCase()));
}

// Emails and domains of everyone who already got an email from us.
async function contacted(db: SupabaseClient): Promise<{ emails: Set<string>; domains: Set<string> }> {
  const { data, error } = await db.from("messages").select("people!inner(email), companies!inner(domain)")
    .eq("direction", "out").eq("status", "sent").limit(10000);
  if (error) throw new Error(`Could not load sent messages: ${error.message}`);
  const rows = (data ?? []) as unknown as { people: { email: string | null }; companies: { domain: string } }[];
  return {
    emails: new Set(rows.map((r) => String(r.people.email ?? "").toLowerCase()).filter(Boolean)),
    domains: new Set(rows.map((r) => r.companies.domain.toLowerCase())),
  };
}

export async function queueLeads(db: SupabaseClient, personIds: string[]) {
  const { data: people, error } = await db.from("people")
    .select("id, email, verify_status, suppressed, companies!inner(id, domain, qualified, evidence, excluded)")
    .in("id", personIds);
  if (error) throw new Error(`Could not load people: ${error.message}`);
  const { data: drafts, error: e2 } = await db.from("messages").select("id, person_id, step, subject, body")
    .in("person_id", personIds).eq("direction", "out").eq("status", "draft");
  if (e2) throw new Error(`Could not load drafts: ${e2.message}`);
  const first = new Map(((drafts ?? []) as Draft[]).filter((d) => d.step === 1).map((d) => [d.person_id, d]));

  const sent = await contacted(db);
  const leads: CheckLead[] = ((people ?? []) as unknown as PersonRow[]).map((p) => ({
    personId: p.id, email: p.email, verifyStatus: p.verify_status, suppressed: p.suppressed,
    companyDomain: p.companies.domain, companyQualified: p.companies.qualified, evidence: p.companies.evidence, excluded: p.companies.excluded,
    subject: first.get(p.id)?.subject ?? "", body: first.get(p.id)?.body ?? "",
  }));
  const { pass, fail } = runChecks(leads, {
    suppressedEmails: await column(db, "suppression", "email"),
    suppressedDomains: await column(db, "suppression", "domain"),
    contactedEmails: sent.emails,
    contactedDomains: sent.domains,
    maxWords: 90,
  });
  const ids = pass.map((l) => l.personId);
  if (ids.length) {
    const now = new Date().toISOString();
    const { error: e3 } = await db.from("messages").update({ status: "queued", send_after: now }).in("person_id", ids).eq("direction", "out").eq("status", "draft").eq("step", 1);
    if (e3) throw new Error(`Could not queue: ${e3.message}`);
    const { error: e4 } = await db.from("messages").update({ status: "queued" }).in("person_id", ids).eq("direction", "out").eq("status", "draft").gt("step", 1);
    if (e4) throw new Error(`Could not queue follow-ups: ${e4.message}`);
  }
  return { queued: ids.length, refused: fail };
}
