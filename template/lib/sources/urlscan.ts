import { requireEnv } from "../env";
import { getJson } from "./http";

// urlscan.io search: pages that load a tool's host (public scans, last 30 days on a free key; 1,000 searches a day).
// A search returns at most 100 results on the free tier, so the 30 days are cut into 3-day slices.
// Example base query (Softr customers on custom domains):
//   domain:softr-files.com AND NOT page.domain:softr.app

export type UrlscanHit = { domain: string; url: string; time: string; title: string | null; ip: string | null };

// Date slices from newest to oldest: [now-3d TO now], [now-6d TO now-3d], ...
export function sliceQueries(base: string, totalDays = 30, sliceDays = 3): string[] {
  const out: string[] = [];
  for (let start = 0; start < totalDays; start += sliceDays) {
    const end = Math.min(start + sliceDays, totalDays);
    const to = start === 0 ? "now" : `now-${start}d`;
    out.push(`(${base}) AND date:[now-${end}d TO ${to}]`);
  }
  return out;
}

type Raw = { results?: { page?: { domain?: string; url?: string; title?: string; ip?: string }; task?: { time?: string } }[]; has_more?: boolean };

export async function search(q: string, size = 100): Promise<{ hits: UrlscanHit[]; hasMore: boolean }> {
  const qs = new URLSearchParams({ q, size: String(Math.min(size, 100)) });
  const d = await getJson<Raw>("urlscan", `https://urlscan.io/api/v1/search/?${qs}`, { headers: { "API-Key": requireEnv("URLSCAN_API_KEY") } });
  const hits = (d.results ?? []).map((r) => ({
    domain: (r.page?.domain ?? "").toLowerCase(),
    url: r.page?.url ?? "",
    time: r.task?.time ?? "",
    title: r.page?.title ?? null,
    ip: r.page?.ip ?? null,
  })).filter((h) => h.domain);
  return { hits, hasMore: !!d.has_more };
}

// Unique hosts across hits, keeping the newest scan per host.
export function uniqueHosts(hits: UrlscanHit[]): UrlscanHit[] {
  const by = new Map<string, UrlscanHit>();
  for (const h of hits) {
    const prev = by.get(h.domain);
    if (!prev || h.time > prev.time) by.set(h.domain, h);
  }
  return [...by.values()];
}
