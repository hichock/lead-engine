---
name: find-contact
description: ALWAYS use this skill when the owner wants an email or the right person at a company ("find emails", "who do I write to", "find the contact", "get the decision maker's email", "fill in contacts"). It runs a cheapest-first waterfall (team page → visible pattern → Apollo free → Monid Hunter / ContactOut) and stops at the first candidate, only for companies with qualified = true. The app refuses paid lookups on unqualified companies; do not try to work around it.
---
# Find the contact (qualified companies only)

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` (roles) and `kb/sources.md` (caps) first. Then
`references/waterfall.md` (order, prices, pitfalls).

## 1. Work list
```bash
node scripts/le.mjs read to-contact limit=25
```
Only qualified companies appear. Pick one person per company: the role in `kb/icp.md` closest to the owner of the
system in the evidence line (ops director for a client portal, practice manager for a booking app, founder if < 10).

## 2. Waterfall: stop at the first good candidate
1. **Site (free).** `/team`, `/about`, `/contact`, `/our-people`, the footer, the privacy page (often names a person).
   A named person with a visible personal address → done.
2. **Pattern (free).** Any visible personal address on the site gives the pattern (`first@`, `first.last@`,
   `flast@`). Apply it to the chosen person. Pattern guesses are often wrong (11 of 15 invalid in one author batch):
   `verify` decides.
3. **Apollo free search (free).** Titles + firm name to find the person's first name and title when the site doesn't
   say (see `.claude/skills/source-people`).
4. **Monid Hunter domain search (paid, ~$0.0245 per result).** Only if 1–3 found nobody:
   ```bash
   node scripts/le.mjs src '{"source":"monid","company_id":"<uuid>","params":{"path":"run","stage":"contact","maxUsd":0.1,"body":{"provider":"hunter","endpoint":"/domain-search","input":{"domain":"acme.example","limit":3}}}}'
   ```
   The `body` above is an example: use `discover` / `inspect` first (free, no company_id needed) to get the exact endpoint name, price and
   input shape, and save them in `kb/sources.md` notes so later runs skip this step:
   `node scripts/le.mjs src '{"source":"monid","params":{"path":"discover","body":{"query":"hunter domain search"}}}'`
5. **ContactOut via Monid (paid, ~$0.10 when found).** Only for a high-score company where you have the person's
   LinkedIn URL.
Refused (exit code 3)? Read the reason: not qualified, no evidence, or a cap. Report it; do not retry with other params.

## 3. Write (unverified)
```bash
node scripts/le.mjs ingest '{"people":[{"domain":"acme.example","name":"Dana Whitlock","role":"Operations Director","email":"dana@acme.example"}]}'
```
- Never role addresses for people (`info@`, `office@`, `hello@`, `admin@`, `support@`) unless `kb/decisions.md` allows.
- Never an address from a data broker list or a breach. Note where you found it: `verify_source` is set by `verify`,
  and the first email must be able to say where the address came from if asked.

## 4. Report
Companies tried, contacts found per step (site / pattern / Apollo / Monid), money spent, refusals.

Write `kb/runs/<YYYY-MM-DD>-find-contact.md` (counts per waterfall step, cost) and update `kb/sources.md` yields
(Monid row: calls, found, cost).
