import type { SupabaseClient } from "@supabase/supabase-js";

// Named reads for skills (GET /api/agent/read?view=...). Each is one job's work list, capped and ordered, so a skill
// never needs raw SQL or the service key. A capped list says so (`capped: true`).

type Out = { rows: unknown[]; capped: boolean };
const cap = (rows: unknown[] | null, limit: number): Out => ({ rows: rows ?? [], capped: (rows?.length ?? 0) >= limit });

function fail(view: string, e: { message: string } | null): void {
  if (e) throw new Error(`Could not load ${view}: ${e.message}`);
}

export const VIEWS = ["to-qualify", "to-contact", "to-verify", "to-write", "drafts", "replies", "company", "funnel"] as const;
export type ViewName = (typeof VIEWS)[number];

export async function readView(db: SupabaseClient, view: ViewName, p: URLSearchParams): Promise<Out | Record<string, unknown>> {
  const limit = Math.min(Number(p.get("limit") ?? 50) || 50, 500);
  switch (view) {
    case "to-qualify": {
      const { data, error } = await db.from("companies").select("id, domain, name, country, tech, source, created_at")
        .is("qualified", null).eq("excluded", false).order("created_at").limit(limit);
      fail(view, error); return cap(data, limit);
    }
    case "to-contact": {
      const { data, error } = await db.from("companies").select("id, domain, name, country, evidence, people(id, name, role, email)")
        .eq("qualified", true).eq("excluded", false).order("score", { ascending: false, nullsFirst: false }).limit(limit * 3);
      fail(view, error);
      const rows = (data ?? []).filter((c) => !((c.people as { email: string | null }[]) ?? []).some((x) => x.email)).slice(0, limit);
      return cap(rows, limit);
    }
    case "to-verify": {
      const { data, error } = await db.from("people").select("id, name, email, verify_status, verified_at, companies!inner(id, domain, qualified, evidence)")
        .not("email", "is", null).in("verify_status", ["unverified", "unknown"]).eq("companies.qualified", true).not("companies.evidence", "is", null).limit(limit);
      fail(view, error); return cap(data, limit);
    }
    case "to-write": {
      const { data, error } = await db.from("people").select("id, name, role, email, interests, offer_key, companies!inner(id, domain, name, country, evidence, evidence_url, why, score), messages(id)")
        .eq("verify_status", "ok").eq("suppressed", false).eq("companies.qualified", true).limit(limit * 3);
      fail(view, error);
      return cap((data ?? []).filter((x) => !((x.messages as unknown[]) ?? []).length).slice(0, limit), limit);
    }
    case "drafts": {
      const { data, error } = await db.from("messages").select("id, person_id, step, subject, body, people!inner(name, email), companies!inner(domain, evidence)")
        .eq("direction", "out").eq("status", "draft").order("created_at").limit(limit);
      fail(view, error); return cap(data, limit);
    }
    case "replies": {
      const { data, error } = await db.from("messages").select("id, person_id, subject, body, sent_at, class, people!inner(name, email), companies!inner(domain, name)")
        .eq("direction", "in").eq("class", "reply").order("sent_at", { ascending: false }).limit(limit);
      fail(view, error); return cap(data, limit);
    }
    case "company": {
      const { data, error } = await db.from("companies").select("*, people(*), signals(*), messages(id, step, direction, status, class, subject, sent_at)")
        .eq("domain", String(p.get("domain") ?? "").toLowerCase()).maybeSingle();
      fail(view, error); return { company: data };
    }
    case "funnel": {
      const [stats, companies, sent, inbound] = await Promise.all([
        db.from("source_stats").select("*"),
        db.from("companies").select("status"),
        db.from("messages").select("step, mailbox, sent_at").eq("direction", "out").eq("status", "sent").limit(10000),
        db.from("messages").select("class, sent_at").eq("direction", "in").limit(10000),
      ]);
      for (const r of [stats, companies, sent, inbound]) fail(view, r.error);
      const count = <T,>(rows: T[] | null, key: (r: T) => string) =>
        (rows ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [key(r)]: (m[key(r)] ?? 0) + 1 }), {});
      return {
        sources: stats.data, companiesByStatus: count(companies.data, (r) => String(r.status)),
        sentByStep: count(sent.data, (r) => `step ${r.step}`), sentByMailbox: count(sent.data, (r) => String(r.mailbox)),
        inboundByClass: count(inbound.data, (r) => String(r.class)),
      };
    }
  }
}
