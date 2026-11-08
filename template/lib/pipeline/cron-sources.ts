import type { SupabaseClient } from "@supabase/supabase-js";
import { runSource } from "../sources/run";
import type { UrlscanHit } from "../sources/urlscan";
import { apexOf } from "./domain";
import { ingest } from "./ingest";
import { readJobs } from "./jobs";

// settings.cron_jobs = {"urlscan":[{"tech":"Softr","q":"domain:softr-files.com AND NOT page.domain:softr.app"}]}
// The source-tech skill writes these jobs; this runs them once a day. The day is part of the input, so the ledger
// allows one run per job per day even if the cron fires a few seconds early.

export async function runCronSources(db: SupabaseClient, now = new Date()) {
  const { data } = await db.from("settings").select("value").eq("key", "cron_jobs").maybeSingle();
  const day = now.toISOString().slice(0, 10);
  const out: Record<string, unknown>[] = [];
  for (const job of readJobs(data?.value)) {
    // Daily runs only need the newest slice; the source-tech skill backfills 30 days once with slices:true.
    const r = await runSource(db, { source: "urlscan", params: { q: `(${job.q}) AND date:[now-1d TO now]`, day }, companyId: null }, now);
    const hits = (Array.isArray(r.body.rows) ? r.body.rows : []) as UrlscanHit[];
    const companies = hits.map((h) => ({ domain: apexOf(h.domain), source: "urlscan" }));
    const signals = hits.map((h) => ({ domain: apexOf(h.domain), kind: "tech", value: `${job.tech} (${h.domain})`, url: h.url, source: "urlscan", observed_at: h.time || now.toISOString() }));
    const rep = hits.length ? await ingest(db, { companies: dedupe(companies), signals }) : null;
    out.push({ tech: job.tech, status: r.status, hosts: hits.length, written: rep?.written ?? null, refused: r.body.refused ?? null });
  }
  return { day, jobs: out };
}

const dedupe = <T extends { domain: string }>(rows: T[]) => [...new Map(rows.map((r) => [r.domain, r])).values()];
