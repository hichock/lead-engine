---
name: source-tech
description: ALWAYS use this skill when the owner wants companies that run on a specific tool or technology ("find companies using Softr / Airtable / Bubble / Glide / Webflow / Memberstack / Make / Zapier / GoHighLevel", "who runs X", "tech search", "technographics", "new users of X this month", "find more leads"). It searches HTTP Archive on BigQuery and urlscan.io for free, logs every run in the ledger and adds companies with a tech signal. Do not query BigQuery or urlscan directly; use this skill.
---
# Find companies by the technology they run

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` (target tools) and `kb/sources.md` first.
Reference files (read the one you need): `references/fingerprints.md` (what to search for), `references/httparchive.md`
(SQL, dry run, polling), `references/urlscan.md` (queries, date slices), `references/funnel.md` (what yield to expect).

## 0. Check
```bash
node scripts/le.mjs env            # need LEAD_ENGINE_URL, AGENT_TOKEN; the app needs GCP_SA_KEY and/or URLSCAN_API_KEY
```
Pick the tools from `kb/icp.md` → "Target tools". If empty, ask the owner once which tools mark a buyer, and record
the answer with `kb-keeper`.

## 1. HTTP Archive (biggest free batch, monthly)
1. Exact Wappalyzer names first (the app does a dry run before every query and refuses over the cap):
   ```bash
   node scripts/le.mjs src '{"source":"httparchive","params":{"mode":"names","crawlDate":"2026-10-01","like":"softr","dryRun":true}}'
   node scripts/le.mjs src '{"source":"httparchive","params":{"mode":"names","crawlDate":"2026-10-01","like":"softr"}}'
   ```
   `crawlDate` is the 1st of a month. Use the newest crawl you have not used before (check `kb/sources.md` notes).
2. Export domains for the chosen techs (dry run first; read the GB figure; ~3 GB is normal for one crawl):
   ```bash
   node scripts/le.mjs src '{"source":"httparchive","params":{"mode":"domains","techs":["Softr","Bubble"],"crawlDate":"2026-10-01","limit":5000,"dryRun":true}}'
   node scripts/le.mjs src '{"source":"httparchive","params":{"mode":"domains","techs":["Softr","Bubble"],"crawlDate":"2026-10-01","limit":5000}}' > /tmp/hta.json
   ```
3. Status 202 = still running. **Do not change the input and do not re-run with new params.** Call the exact same
   command again later; the ledger resumes the job by its id (a re-run bills again).
4. Monthly diff (new users of a tool since last crawl): `"mode":"new","prevCrawlDate":"2026-09-01"`.

## 2. urlscan (fresh, small, daily)
1. Backfill 30 days once per tool, in 3-day slices (10 searches):
   ```bash
   node scripts/le.mjs src '{"source":"urlscan","params":{"q":"domain:softr-files.com AND NOT page.domain:softr.app","slices":true}}' > /tmp/us.json
   ```
2. Schedule the daily pull (the app cron then runs it every morning with no model; same query = merged, not doubled):
   ```bash
   node scripts/le.mjs ingest '{"cron_urlscan":[{"tech":"Softr","q":"domain:softr-files.com AND NOT page.domain:softr.app"}]}'
   ```
   Add the row to `kb/sources.md` § Scheduled pulls.

## 3. Screen before writing (free, fast)
Drop rows that can never qualify, so `qualify` only opens real candidates:
- known platform hosts (`*.softr.app` demo names, `*.bubbleapps.io` test apps), the tool vendor's own domains;
- obvious phishing (login forms copying banks or Microsoft, random hyphenated names, days-old domains);
- schools, nonprofits, government, big enterprises (rank in the top few thousand) unless `kb/icp.md` wants them;
- domains already in the database (the ingest is idempotent, but skip them to keep the batch small).
Write the rest:
```bash
# rows.json: {"companies":[{"domain":"acme.example","source":"httparchive","tech":["Softr"]}],
#             "signals":[{"domain":"acme.example","kind":"tech","value":"Softr (portal.acme.example)","source":"httparchive"}]}
node scripts/le.mjs ingest rows.json
```
Signal value = tool + host where it was seen, so `qualify` can open the exact page.

## 4. Report
Tell the owner in 3 lines: screened, written, GB billed or searches used, and the next step (`qualify`).

Write `kb/runs/<YYYY-MM-DD>-source-tech.md` (what ran, crawl month or date range, rows in → written, GB / searches,
refusals) and update `kb/sources.md` yields (last run, rows in → kept to date).
