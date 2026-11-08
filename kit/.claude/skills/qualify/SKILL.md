---
name: qualify
description: ALWAYS use this skill before any contact is looked up, and whenever the owner says "qualify", "check these companies", "are they a fit", "clean the list", "remove junk / phishing / demos", "which of these are real". It opens each company's live site, confirms the tool is still there and used for real work, applies the gates in kb/icp.md in order, and writes qualified true/false with one reason and one evidence line. Paid contact finding is refused by the app until this has run.
---
# Qualify companies on their live website

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` (gates, exclusions) and `kb/offer.md` first. Then
`references/gates.md` (what each gate looks like in practice, phishing signs, drop reasons, measured app facts).

## 1. Work list
```bash
node scripts/le.mjs read to-qualify limit=40
```
Do them in batches of 20–40. Free only: no paid source is used in this skill.

## 2. For each company, in this order (stop at the first failure)
1. **Live and real.** `curl -sL -m 15 -A "Mozilla/5.0" -o /tmp/p.html -w "%{http_code} %{url_effective}\n" https://<domain>/`
   Fail: not 200, parked page, "coming soon", personal blog, demo/template site, school, nonprofit, government,
   phishing (see references). Phishing reason must say why (copied brand, login form, days-old domain).
2. **Still on the tool.** Open the host from the signal (`node scripts/le.mjs read company domain=<domain>`), grep for
   the fingerprint (`.claude/skills/source-tech/references/fingerprints.md`). Not found → reject "left <tool>".
3. **Real work on it.** A portal, member area, booking app, internal tool, client dashboard: not only a marketing page.
4. **Size and country.** From the site (team page, "about"), a register, or the LinkedIn company page headcount.
   Map to a size band in `kb/icp.md`. Unknown size is allowed; mark it unknown.
5. **Not excluded.** Not a competitor (agencies selling what `kb/offer.md` sells), not an existing client (check
   suppression by domain), not an excluded segment (default: hiring automation roles; product is the no-code app
   itself; a need a cheap SaaS already covers).
6. **One evidence line.** One checkable fact about *their* system for the first email, true today. Good:
   "Client portal on Softr at portal.acme.example, 5.4 s to load on a phone". Bad: "uses Airtable", a tab title,
   anything you can't show on the page. Optional measured app fact: `references/gates.md` § Measured app facts.

## 3. Write
```bash
# qualified: {"domain","qualified":true,"qualify_reason":"Live client portal on Softr; 11-50; UK","evidence":"...","evidence_url":"https://...","size_band":"11-50","country":"UK","status":"qualified","name":"Acme Ltd"}
# rejected:  {"domain","qualified":false,"qualify_reason":"Phishing: login form copying a bank, domain 3 days old","status":"rejected"}
node scripts/le.mjs ingest '{"companies":[ ... ]}'
node scripts/le.mjs score
```
Reasons are short and specific; they show on the Leads page. Never mark `qualified: true` without an evidence line.

## 4. Report
Checked, qualified, rejected by reason (counts), and the next step (`find-contact` for the qualified).
If one drop reason dominates (e.g. 60% demos), tell the owner which source or query produced it so `source-tech`
can tighten the query.

Write `kb/runs/<YYYY-MM-DD>-qualify.md` (checked → qualified, drop reasons with counts) and update `kb/sources.md`
yields (kept count per source the companies came from).
