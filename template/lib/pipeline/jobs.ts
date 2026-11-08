// settings.cron_jobs reader, shared by the sources cron and the ingest route.
export type UrlscanJob = { tech: string; q: string };

export function readJobs(stored: unknown): UrlscanJob[] {
  const list = (stored as { urlscan?: unknown } | null)?.urlscan;
  return Array.isArray(list) ? list.filter((j): j is UrlscanJob => typeof j?.tech === "string" && typeof j?.q === "string").slice(0, 10) : [];
}

