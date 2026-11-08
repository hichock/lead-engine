# HTTP Archive on BigQuery

**What:** every site in the Chrome UX Report crawl (monthly), with the technologies Wappalyzer detected and a traffic
rank. Table `httparchive.crawl.pages` (partitioned by `date`, the 1st of each month; `client` = mobile/desktop).
**Cost:** BigQuery sandbox / free tier, 1 TB of queries a month. Key: a GCP service-account JSON with BigQuery Job
User, in `GCP_SA_KEY` on the server.

## Numbers from the author's runs (measured 2026-11-03)
- One tech export over a monthly crawl scanned **2.9 GB**.
- Registrable domains per crawl: Softr 442, Airtable 1,603, Bubble 2,159, Webflow 95,095.
- Batch of ~260 screened domains → 71 qualified → 40 sendable (about 15%); about half the domains were catch_all.
- Daily runs used 21–26 GB of BigQuery (2026-11-05/06) across several queries.

## The queries the app builds (`lib/sources/httparchive.ts`)
```sql
-- names (pick exact Wappalyzer names)
SELECT t.technology, COUNT(DISTINCT NET.REG_DOMAIN(root_page)) AS domains
FROM `httparchive.crawl.pages`, UNNEST(technologies) AS t
WHERE date = '2026-10-01' AND client = 'mobile' AND is_root_page AND LOWER(t.technology) LIKE '%softr%'
GROUP BY 1 ORDER BY 2 DESC LIMIT 50;

-- domains (root and non-root pages: portals often live below the home page)
SELECT NET.REG_DOMAIN(root_page) AS domain, ARRAY_AGG(DISTINCT t.technology) AS techs, MIN(rank) AS rank
FROM `httparchive.crawl.pages`, UNNEST(technologies) AS t
WHERE date = '2026-10-01' AND client = 'mobile' AND t.technology IN ('Softr', 'Bubble')
GROUP BY domain ORDER BY rank LIMIT 5000;
```
`mode: "new"` returns domains in this crawl that were not in the previous one.

## Rules
1. **Always dry run** (`"dryRun": true`). The app also dry-runs before every real query and refuses when the GB
   estimate is over the per-query cap (200 GB) or would pass today's cap (30 GB). It sets `maximumBytesBilled`, so
   BigQuery itself refuses anything bigger.
2. **Never query the multi-TB `requests` table** (or response bodies) without sampling. Stick to `crawl.pages`.
3. **Poll, never re-run.** A slow query returns 202 with a job id. Call the same command again; the ledger resumes
   it. Pitfall (measured 2026-11-03): queries ran past an app's 50 s timeout and were re-run, so 150–190 GB was
   double-billed.
4. Use a crawl month you have not used before, and root **and** non-root pages.
5. **Live check before writing to outreach:** 7 domains had already left Softr since the crawl (measured 2026-11-03).
   `qualify` re-fetches every site.
