---
name: report
description: ALWAYS use this skill when the owner wants to see the dashboard without the web app ("show me the dashboard", "report", "how many leads do we have", "refresh the report", "send me the numbers"), at the end of every scheduled run in local mode, and when the plan needs the dashboard mock. It builds docs/report.html from the local store (or the mock from example data) with the same view as the app's pages, and offers it as a file or a private page.
---
# Dashboard report (local mode, or a mock)

Read `kb/RULES.md` and `kb/context.md` (brand colour, mode) first.

## When
- **Mode C (no app):** after every pipeline or outreach-review run, and whenever the owner asks for numbers.
- **Mode A or B:** the app is the dashboard (Leads, Sources & runs, Outreach). Use this skill only for a mock or a
  shareable snapshot (`le report` needs the local store; in app mode, say "open <app URL>" instead).

## Build
```bash
node scripts/le.mjs report --title="<Company> leads" --accent=<brand hex from kb/context.md>    # → docs/report.html
npm run mock -- --data=docs/mock-data.json --title="<Company> leads" --accent=<hex>            # → docs/dashboard-mock.html
```
The report shows: totals (companies, to qualify, qualified, verified contacts, sent, replied), the top 60 leads with
signal, score and why, drafts to approve, replies, sent, and each source's runs, yield, spend this month and cap
use today. It is one HTML file with no outside requests; it works offline and in both themes.

## Show it
1. Tell the owner the path and the 4 numbers that changed since the last run (from `kb/runs/`).
2. Offer once: "Want it as a private page you can open on your phone?" If yes and the session has the Artifact
   tool, publish `docs/report.html` and update the same page each run (same file path). Otherwise open the file.
3. `docs/report.html` holds prospects' names and emails. It is in `.gitignore`: never commit it, never paste its
   rows into `kb/`. A published private page is visible only to the owner unless they share it.

Write one line to `kb/runs/<YYYY-MM-DD>-report.md` (generated, counts) only when the owner asked for it; scheduled
runs mention the report in their own run note.
