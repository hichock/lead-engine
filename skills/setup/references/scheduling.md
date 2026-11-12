# Recurring runs

Two layers. The app (no model) fetches and sends; Claude (with the repo's skills) judges and writes.

| Step | Where | Schedule |
|---|---|---|
| urlscan daily pulls, sources cron | app: Supabase pg_cron → `/api/cron/sources` | daily 06:17 UTC |
| Send tick | app: pg_cron → `/api/cron/send` | every 5 min, Mon–Fri (each lead's local window is checked in code) |
| Reply / bounce read, stop on reply | app: pg_cron → `/api/cron/replies` | every 15 min |
| Qualify → find-contact → verify → score → first-lines | Claude scheduled task | weekdays, early morning |
| Outreach review (replies, stop-loss, queue if auto-queue) | Claude scheduled task | weekdays, afternoon |
| Weekly review + kb-tidy | Claude scheduled task | Mondays |

Plugins don't load in cloud sessions or scheduled tasks, which is why setup copies every skill into the repo
(`.claude/skills/`). In mode A/B the cloud environment needs two variables: `LEAD_ENGINE_URL` and `AGENT_TOKEN`
(not the Supabase access token). Mode C runs on the owner's computer only (below).

## Option A: Claude Code scheduled tasks (Pro and up; minimum interval hourly)
In Claude Code run `/schedule` (or create them on claude.ai/code) on this repo, one task each:
1. **Lead Engine pipeline**, weekdays 07:41 (owner's time zone):
   "Run the Lead Engine pipeline as CLAUDE.md describes: qualify up to 40 companies, find-contact for up to 25
   qualified ones, verify, score, then first-lines for up to 15. Stop and report on any cap refusal. Write the run
   notes in kb/runs/ and commit kb/ changes."
2. **Lead Engine outreach review**, weekdays 16:13: "/outreach-review"
3. **Lead Engine weekly review**, Mondays 08:37: "/outreach-review weekly. Then run kb-tidy and commit kb/ changes."
Pick minutes off the hour (the examples are deliberate) so runs don't queue at :00.

## Option B: GitHub Actions
Enable `.github/workflows/weekly-review.yml` (instructions at the top of the file: `claude setup-token`, three repo
secrets, remove `if: false`). Copy the job for a weekday pipeline with the prompt from Option A, item 1.
GitHub pauses schedules after 60 days without activity on public repos.

## Mode B: the frequent jobs on your own host
pg_cron in Supabase works with any host (§9 of the checklist). Without it, use the host's scheduler, system cron or
an external pinger: the three routes and their schedules are in the app's `HOSTING.md`.

## Mode C: no app (the owner's computer)
There is no server, so the frequent jobs run as commands on the computer that holds the store:
| What | Command | When |
|---|---|---|
| Send tick | `node scripts/le.mjs send` | every 10–15 minutes, weekdays (each run sends at most one email per mailbox, inside each lead's window) |
| Replies | `node scripts/le.mjs replies` | hourly, and before every outreach review |
| Daily urlscan pulls | the `source-tech` skill in the pipeline task | weekdays |
| Dashboard | `node scripts/le.mjs report` (the `report` skill) | end of each scheduled run |
Where they run: the computer's cron or Task Scheduler for `send` and `replies` (no model needed), and Claude Code
desktop scheduled tasks for the skills. Runs only while the computer is on.
Not in the cloud: cloud sessions and cloud scheduled tasks allow only web (HTTPS) traffic, so they can't reach
Postgres, SMTP or IMAP (measured 2026-11-12), and their files don't last. For runs that don't depend on the owner's
computer, move to mode A: the app on Vercel sends and reads replies, and cloud scheduled tasks only call it over HTTPS.

Write where the runs live in `kb/setup-state.md` § 7 and `kb/context.md`.
