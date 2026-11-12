---
name: setup
description: Sets up Lead Engine end to end in the current folder or attached repo (or resumes a half-finished setup). It checks what the owner already has (connectors, CLIs, keys, repo), researches the owner's website, niche and competitors and proposes a plan with channels, costs, a timeline and a dashboard mock (no question round), then builds only what the approved plan needs in one of three modes (Supabase + Vercel, own host and database, or no app), schedules the runs and does the first free run. Run it with /lead-engine:setup.
disable-model-invocation: true
---
# Lead Engine setup

If `kb/setup-state.md` exists here, read `kb/RULES.md`, `kb/context.md` and `kb/setup-state.md` first and resume from
the first open `[ ]` (resume mode). Tick each item the moment it is done; write non-secret values (mode, repo, project
ref, URL) after it. Keys go to `.env.local` (gitignored) and the host or cloud environment, never to `kb/` or git.
Never print a key.

References: `references/environment-check.md`, `references/modes.md`, `references/checklist.md` (exact commands),
`references/keys.md`, `references/scheduling.md`, step-by-step `references/guides/` (show the owner the one they
need). Tool links and prices: only from the project's `kb/tools.md`.

**How to talk to the owner:** plain short sentences. Say what you are about to do and why in one line before anything
that creates something or opens a login. Ask before anything that costs money. **Don't ask questions the research
can answer.** The owner approves the plan, confirms the mode in one line, and gives logins or keys only when a step
can't run without them.

## 0. Find the bundle files
Bundle root (holds `template/` and `kit/`): the session line "Lead Engine plugin root: …", else `${CLAUDE_PLUGIN_ROOT}`,
else `ls -d ~/.claude/plugins/marketplaces/lowcoding-leads ~/.claude/plugins/cache/lowcoding-leads/lead-engine/* 2>/dev/null | head -1`,
else `git clone --depth 1 https://github.com/hichock/lead-engine "$TMPDIR/lead-engine"`. Call it `$LE`.

## 1. Check what's already there (environment-check.md)
Local or cloud session; which connectors answer (Supabase, Vercel, GitHub, Zapmail); which CLIs are logged in; which
keys are set (names only); the repo situation. Show the one-block summary. Follow the repo table in
environment-check.md exactly: in a cloud session never create a repo; use an empty attached repo, ask before adding
to one with code, or explain how to create and attach a new one (`guides/claude-cloud-session.md`).

## 2. Scaffold (checklist §1–2)
Tools: node ≥ 22.13 and git are required; gh, supabase and vercel CLIs only if the mode needs them and no connector
answers. `git init` if needed, then `bash "$LE/scripts/scaffold.sh" .`: it copies the app and the kit without
overwriting, always adds the secret and personal-data lines to `.gitignore` (also an existing one) and installs a
pre-commit check. Confirm `git check-ignore -q .env.local`, start `npm install` in the background. Open
`kb/setup-state.md` and tick § 1. **Every commit in this setup goes through `bash scripts/check-staged.sh`**, which
refuses if an `.env*` file, `data/` or `docs/report.html` is staged.

## 3. Plan (the `plan` skill)
Get the website URL from the folder, the repo README, `kb/context.md` or the session; ask for it only if none of
these has it (one question). Then read `.claude/skills/plan/SKILL.md` in the project and follow it: research the
company, offer, buyers, niche and competitors; pick channels; services and monthly cost from `kb/tools.md`; timeline
with milestones; the dashboard mock in their brand; `kb/plan.md` + `docs/plan.html`. Show it and get approval.
Edits → update and ask again. **Nothing is created on any account before the plan is approved.**

## 4. Mode (modes.md)
Pick A, B or C from step 1 and the plan. Confirm in one line ("You have X, so I'll use mode M: … OK?"). Write it to
`kb/context.md` § Setup and `kb/decisions.md`.

## 5. Build only what the plan and mode need
- **Repo:** local with gh → `gh repo create <name> --private --source . --push` (checklist §5). Cloud → commit
  (`git add -A && bash scripts/check-staged.sh && git commit …`) and push to the attached repo's branch.
- **Mode A:** Supabase (connector first, else CLI; checklist §3, §6), Vercel (connector first, else CLI; §3, §7),
  owner in `team_members`, auth URLs, deploy, then check: `/login` answers 200, `node scripts/le.mjs read funnel`
  answers JSON (not 401), the owner signs in by magic link and sees an empty Leads page. The magic link only arrives
  if the owner's email is a member of their Supabase organization or custom SMTP is on (`guides/supabase.md` →
  "Email"; required before any teammate signs in). Note: Vercel Hobby is non-commercial; a business should use Pro.
- **Mode B:** reuse their Supabase project (check table names don't clash, then apply the migrations), give the
  owner the env-var list and the scheduler options from the app's `HOSTING.md`, check the same three things on their URL.
- **Mode C (local session only):** checklist §4: `LEAD_ENGINE_MODE=local`, store (SQLite file, or their own Postgres
  with `LEAD_ENGINE_DB=postgres://…` + `npm i pg`), `node scripts/le.mjs init`. In a cloud session mode C is not
  offered: the session can't reach Postgres, SMTP or IMAP and its files don't last. Use mode A there.

## 6. Keys for the plan's sources (keys.md)
Only the ones the approved channels use, free first (urlscan; BigQuery if tech search is in the plan; MillionVerifier
before the first send). For each: say what it is for and what it costs (from `kb/tools.md`), show its guide, store it
where the mode says, tick it. Mode A: redeploy once at the end. Leave caps at the defaults unless the plan sets a budget.

## 7. Schedules (scheduling.md)
- Mode A/B: frequent app jobs in Supabase pg_cron (checklist §9) or the host's scheduler (`HOSTING.md`). Write the icp
  targets into the app: `node scripts/le.mjs ingest '{"scoring":{"countries":[…],"tools":[…]}}'`.
- Mode A/B: the recurring Claude runs (cloud scheduled tasks, desktop tasks or GitHub Actions) call the app over
  HTTPS. Mode C: Claude Code desktop scheduled tasks and the computer's own scheduler for `le send` and `le replies`
  (scheduling.md § Mode C); runs only while the computer is on.

## 8. First run ($0)
The plan's first channel with free sources only (for tech search: `source-tech` urlscan 30-day slices, and one HTTP
Archive crawl with a dry run if `GCP_SA_KEY` is set), then `qualify` on the first 20. Show the real rows: the app's
Leads page (A/B) or `docs/report.html` via the `report` skill (C).

## 9. What happens next (show this card, then tick the last item)
```
Lead Engine is live: <app URL or docs/report.html>   Mode: <A|B|C>   Repo: <repo>   Plan: docs/plan.html
Every morning   new sites for your tools are pulled (free); due emails go out in each lead's working hours
Weekdays        Claude qualifies, finds and verifies contacts, scores and drafts emails (scheduled task)
You             approve drafts (Outreach page, or in the session in mode C), answer replies, add mailboxes
Mondays         weekly review: what to kill or scale, with numbers; decisions go to kb/decisions.md
Stuck?          say "I need help": the get-help skill contacts the bundle's author (or email info@lowcoding.dev)
Check these     <the plan's "Check these" items and any `needs input` in kb/>
```
Commit kb changes (`git add kb docs/plan.html docs/dashboard-mock.html docs/mock-data.json && bash scripts/check-staged.sh && git commit -m "kb: setup done"`
and push). Write `kb/runs/<YYYY-MM-DD>-setup.md` (mode, what was created and where, what is open; no keys) and fill
the `kb/sources.md` rows for every key added.

## When a step fails twice
Read the matching guide and `kb/findings.md`. Still stuck: offer the `get-help` skill (it summarises the problem
without secrets, confirms how to reach the owner and sends it to the bundle's author). Continue with steps that don't
depend on the failed one.
