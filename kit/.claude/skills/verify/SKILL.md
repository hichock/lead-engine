---
name: verify
description: ALWAYS use this skill before any email can be queued, and when the owner says "verify", "check the emails", "are these valid", "bounces", "catch-all", "re-verify old leads". It checks addresses with MillionVerifier through the app (only for qualified companies with an evidence line), uses Monid Hunter as the fallback for unknowns, marks only "ok" as sendable and keeps catch_all and unknown on a retry list. Never mark an address ok by hand.
---
# Verify emails (only "ok" is sendable)

Read `kb/RULES.md`, `kb/context.md` and `kb/sources.md` (caps) first. Then `references/verifiers.md`.

## 1. Work list
```bash
node scripts/le.mjs read to-verify limit=40
```
Shows people with an email that is `unverified` or `unknown`, at qualified companies with an evidence line.
Also re-verify anything verified more than ~2 weeks ago before it is queued (author's reserve rule, measured 2026-11-05).

## 2. MillionVerifier (one company per call, 1–25 addresses)
```bash
node scripts/le.mjs src '{"source":"millionverifier","company_id":"<uuid>","params":{"emails":["dana@acme.example"]}}'
```
The app writes `verify_status` on the matching people rows itself. Results:
- `ok` → sendable.
- `catch_all` → retry list (never sent). The one catch_all the author sent to bounced (2026-10-26).
- `unknown` → retry later, or step 3.
- `invalid`, `disposable` → dead; try the next pattern for that person once, then stop.
Daily cap: 80 checks (Settings). Refused = cap reached: stop and report.

## 3. Fallback for unknown (paid, small)
Monid → Hunter `/email-verifier` ($0.012 a check, measured): only for `unknown`, only for high-score companies.
```bash
node scripts/le.mjs src '{"source":"monid","company_id":"<uuid>","params":{"path":"run","stage":"verify","maxUsd":0.02,"body":{"provider":"hunter","endpoint":"/email-verifier","input":{"email":"dana@acme.example"}}}}'
```
Write Hunter's verdict with its source, so it is visible later:
```bash
node scripts/le.mjs ingest '{"people":[{"domain":"acme.example","email":"dana@acme.example","verify_status":"ok","verify_source":"monid-hunter"}]}'
```
Caution: in one author run, 11 leads passed on Hunter "valid" where MillionVerifier said catch_all (2026-11-06):
watch bounces on those and note it in `kb/findings.md` if any bounce.

## 4. Report
Checked, ok / catch_all / unknown / invalid counts, cost, retry list size.

Write `kb/runs/<YYYY-MM-DD>-verify.md` (counts by result, cost) and update `kb/sources.md` yields (MillionVerifier
and Monid rows).
