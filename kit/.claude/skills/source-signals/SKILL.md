---
name: source-signals
description: ALWAYS use this skill when the owner wants "why now" signals added to companies ("are they hiring", "job posts naming <tool>", "first ops hire", "running ads", "Meta Ad Library", "reviews mention", "funding / Form D", "add signals to my list", "what's new at these companies"). It checks free public sources (ATS job boards with original post dates, ad library, reviews) for companies already in the database and writes dated signals with their URL. Do not rescore or contact anyone here; use this skill to add signals, then run score.
---
# Add signals to existing companies

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` and `kb/sources.md` first. Then `references/signals.md` (what was
tested and the verdicts: several popular signals failed) and `references/ats.md` (job-board endpoints).
For plays not tested yet (past-client alumni, own connections + job-change diff, page followers, complaint
posts, engager weights, tier → channel routing): `references/workflows-io-plays.md`.

## 1. Pick companies
```bash
node scripts/le.mjs read to-contact limit=100     # qualified companies without a contact yet
```
or a list the owner names. Signals only matter on companies that pass `kb/icp.md`.

## 2. Job posts (best free signal; check the original date)
1. Find the careers page (`/careers`, `/jobs`, footer link). Identify the ATS by its host: `boards.greenhouse.io`,
   `jobs.lever.co`, `jobs.ashbyhq.com`, `*.bamboohr.com`.
2. Read the public JSON (see `references/ats.md`). Use the ATS date (`first_published`, `createdAt`, `publishedAt`):
   it survives LinkedIn reposts, so "open 41 days" is a real fact.
3. Keep posts for roles in `kb/icp.md` that name a target tool or describe the pain (manual reporting, spreadsheets).
   **Excluded by default:** companies hiring automation / no-code / RevOps-engineering roles (they build in-house).
4. Signal: `{"kind":"job","value":"<role> names <tool>, open <n> days (ATS first_published)","url":"<post url>","observed_at":"<ATS date>"}`

## 3. Ads running (proof, mostly for agencies and DTC)
Meta Ad Library: official API for UK/EU, or `apify/facebook-ads-scraper` (US) inside the Apify budget. Check the page
slug with a free look first (5 of 8 author runs used wrong slugs). Repeated headlines mean scaled winners, not
fatigue. Signal kind `ad`. The author's DTC test got 0 replies from 8 sends: treat ads as proof, not as a reason alone.

## 4. Reviews (copy material, not a source)
G2 / Capterra show no company names. Google reviews about a specific pain (phones not answered, booking app logs out)
are good proof for local firms. Signal kind `review` with the count and theme, never the reviewer's name.

## 5. Write
```bash
node scripts/le.mjs ingest '{"signals":[{"domain":"acme.example","kind":"job","value":"Operations coordinator names Airtable, open 41 days (ATS first_published)","url":"https://boards.greenhouse.io/acme/jobs/123","observed_at":"2026-09-29T00:00:00Z","source":"greenhouse"}]}'
node scripts/le.mjs score
```
Signals are unique per (company, kind, value): re-running updates, never duplicates.

## 6. Verdicts feed back
If a signal kind produces leads that never reply after ≥ 30 delivered, `outreach-review` lowers its weight. Record the
verdict in `kb/decisions.md` and the weight in `kb/icp.md` + Settings.

Write `kb/runs/<YYYY-MM-DD>-source-signals.md` (companies checked, signals by kind, sources used) and update
`kb/sources.md` yields.
