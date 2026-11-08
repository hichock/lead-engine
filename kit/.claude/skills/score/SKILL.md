---
name: score
description: ALWAYS use this skill when the owner asks to rank or prioritise leads ("score", "rank", "who first", "top leads", "why is X ranked high", "re-score after new signals", "change the weights"). The app computes score = 100 × fit × trigger from kb/icp.md gates and dated signals and writes the reasons; this skill runs it, checks the top of the list against the evidence and explains it. Do not hand-edit scores; change weights instead.
---
# Score and rank: fit × trigger, explained

Read `kb/RULES.md`, `kb/context.md` and `kb/icp.md` (weights, target countries and tools) first. Then
`references/scoring.md`.

## 1. Make sure the weights match kb/icp.md
The score code reads Settings (table `settings`, key `scoring`). After any change to `kb/icp.md` (countries, tools,
size band weights, signal weights), write the same values to the app:
```bash
node scripts/le.mjs ingest '{"scoring":{"countries":["UK","US"],"tools":["Softr","Airtable"],"sizeBands":{"1-10":0.6,"11-50":1,"51-200":0.8,"201-500":0.4,"500+":0.1},"kindWeights":{"job":0.7,"tech":0.5},"halfLifeDays":30}}'
```
Missing keys keep their defaults. Record weight changes in `kb/decisions.md` with the reason.

## 2. Run
```bash
node scripts/le.mjs score                      # all companies
node scripts/le.mjs score <company_id> ...     # just these
```
The app writes `score`, `fit`, `trigger` and two `why` lines per company:
`Fit 1: UK is a target country; size 11-50 (weight 1); runs Softr` and
`Trigger 0.96: job: … (2 d ago, 0.67); comment: … (5 d ago, 0.53)`.

## 3. Check the top 10 (judgement)
For each of the top 10 qualified companies, open the evidence (`node scripts/le.mjs read company domain=<d>`):
- Is the strongest signal still true today? A stale or wrong signal → fix the signal row (re-ingest with the right
  value or date), then re-score. Never edit the score itself.
- Does the fit match reality (country, size)? Wrong → fix the company fields via ingest.
- Anything that looks high only because of one weak signal kind? Tell the owner and suggest a weight change.

## 4. Report as a ranked list, not one number
Top 10: company, score, the one-line reason ("UK, 11-50, runs Softr; job post naming Airtable 2 days ago"). Then
what would move the list (e.g. "6 companies have no trigger: run source-signals on them").

Write `kb/runs/<YYYY-MM-DD>-score.md` (companies scored, top 10 reasons, weight questions) and update
`kb/sources.md` yields (how many of each source's companies are in the top 25).
