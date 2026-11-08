---
name: setup
description: Sets up Lead Engine end to end in the current folder (or resumes a half-finished setup) - checks tools, logs in to GitHub, Supabase and Vercel, drafts the knowledge base from the owner's website with at most 8 questions, creates the private repo, database and deployment, copies the skills kit, schedules the recurring runs and does the first free run. Run it with /lead-engine:setup.
disable-model-invocation: true
---
# Lead Engine setup

If `kb/` already exists here, read `kb/RULES.md`, `kb/context.md` and `kb/setup-state.md` first (resume mode).
Otherwise this run creates them in step 2.

A resumable checklist. The state lives in `kb/setup-state.md` in the user's project: tick each item the moment it
is done, write non-secret values (repo, project ref, URL) next to it, and on every start resume from the first open
`[ ]`. Keys go to `.env.local` (gitignored), Vercel env and, for scheduled runs, the cloud environment. Never print a
key, never write one to `kb/` or git.

Details per step: `references/checklist.md` (exact commands), `references/interview.md` (auto-draft + questions),
`references/scheduling.md` (recurring runs), `references/keys.md` (where each key comes from, free tiers).

Talk to the owner in plain words: say what you are about to do and why in one line before each step that creates
something or opens a browser login. Ask before anything that costs money.

## 0. Find the bundle files and the project folder
1. Bundle root (holds `template/` and `kit/`): the session context line "Lead Engine plugin root: …", else
   `${CLAUDE_PLUGIN_ROOT}`, else
   `ls -d ~/.claude/plugins/marketplaces/lowcoding-leads ~/.claude/plugins/cache/lowcoding-leads/lead-engine/* 2>/dev/null | head -1`,
   else `git clone --depth 1 https://github.com/lowcoding-dev/lead-engine "$TMPDIR/lead-engine"`. Call it `$LE`.
2. Project folder: if `kb/setup-state.md` exists here, resume. Else, if this folder is empty (or only has `.git`),
   use it; otherwise ask for a name and create `./<name>` (default `lead-engine`). `cd` there for every later step.

## 1. Tools  (checklist §1)
Check `node -v` (≥ 20), `git`, `gh`, `supabase` (or `npx -y supabase --version`), `vercel` (or `npx -y vercel --version`).
Offer the install command for anything missing (checklist §1). Don't continue without node, git and gh.

## 2. Copy the app and the kit  (checklist §2)
```bash
cp -Rn "$LE/template/." .      # Next.js app, migrations, tests (never overwrites existing files)
cp -Rn "$LE/kit/." .           # CLAUDE.md, kb/, .claude/ (skills, hooks, settings), .github/
git init -q 2>/dev/null; npm install
```
Then open `kb/setup-state.md` and continue from it. Run `npx tsc --noEmit && npm test` once to prove the copy works.

## 3. Logins  (checklist §3)
Each is a browser or device flow the owner completes: `gh auth login`, `supabase login` (or with a personal access
token, see keys.md), `vercel login`. Verify with `gh auth status`, `supabase projects list`, `vercel whoami`.

## 4. Knowledge base: auto-draft, then "what's wrong?"  (interview.md)
Ask for the website (and optionally a CSV of current customers). Read it, draft `kb/context.md`, `kb/offer.md`,
`kb/icp.md`, `kb/voice.md`, `kb/sources.md`, then show a 10-line summary and ask at most 8 questions (interview.md).
Write answers labelled `stated`; mark unknowns `needs input`. Mirror icp targets into the app later (step 9).

## 5. GitHub repo  (checklist §5)
`git add -A && git commit -m "Lead Engine: app and kit"` then
`gh repo create <name> --private --source . --remote origin --push`. Write the repo name in setup-state.

## 6. Supabase  (checklist §6)
Pick org and region (closest to the owner's leads). Create the project with a generated DB password (kept in
`.env.local` as `SUPABASE_DB_PASSWORD`), wait until it is healthy, link, `supabase db push`. Get the URL, anon and
service-role keys into `.env.local`. Add the owner's email to `team_members`, set the auth site URL and redirect
(checklist §6 has the SQL and API calls).

## 7. Vercel  (checklist §7)
Generate `CRON_SECRET`, `AGENT_TOKEN`, `MAILBOX_ENCRYPTION_KEY`. `vercel link`, add every variable from `.env.local`
that the app needs (never `DEMO`), `vercel deploy --prod`. Then set `NEXT_PUBLIC_SITE_URL` and `LEAD_ENGINE_URL` to the
production URL, update the Supabase auth URLs, redeploy. Open the URL: the Leads page must ask for sign-in. Send
the owner the magic link and confirm they see an empty Leads page (not "No access").
Note for the owner: Vercel Hobby is for personal, non-commercial use; a business should use Vercel Pro.

## 8. Source keys  (keys.md)
Free first: `URLSCAN_API_KEY`, `GCP_SA_KEY` (BigQuery, for HTTP Archive), `MILLIONVERIFIER_API_KEY` (paid per check,
small packs). Optional: Apollo, Monid, Apify, HackerTarget. For each key the owner gives: `.env.local` + `vercel env
add` + tick it in setup-state. Redeploy once at the end of this step. Leave caps at the defaults unless the owner
gives a budget (Settings → Caps; mirror in `kb/sources.md`).

## 9. App schedule and settings  (checklist §9)
Fill `supabase/sql/schedule.sql` (`{{APP_URL}}`, `{{CRON_SECRET}}`) in a temp copy and run it (send every 5 min on
weekdays, replies every 15 min, sources daily). Never commit the filled copy. Write the icp targets to the app:
`node scripts/le.mjs ingest '{"scoring":{"countries":[…],"tools":[…]}}'`. Check `node scripts/le.mjs env`.

## 10. Recurring Claude runs  (scheduling.md)
Offer two options and set up the one the owner picks:
- **Claude Code scheduled tasks** (`/schedule`, Pro and up, runs in the cloud on the repo): weekdays pipeline,
  daily outreach review, weekly review. The cloud environment needs `LEAD_ENGINE_URL` and `AGENT_TOKEN`.
- **GitHub Actions** with `claude-code-action`: enable `.github/workflows/weekly-review.yml` (secrets listed in it).

## 11. First run ($0)
Run the `source-tech` skill for the owner's first target tool with urlscan (30-day slices) and, if `GCP_SA_KEY` is
set, one HTTP Archive crawl (dry run first). Then `qualify` on the first 20. Show the Leads URL with real rows.

## 12. What happens next (show this card, then tick the last item)
```
Lead Engine is live: <URL>   Repo: <repo>   Knowledge base: kb/README.md
Every morning   the app pulls new sites for your tools (free) and sends due emails in each lead's working hours
Weekdays        Claude qualifies, finds and verifies contacts, scores and drafts emails (scheduled task)
You             approve drafts in Outreach, answer replies (forwarded to you), add mailboxes in Settings
Mondays         weekly review: what to kill or scale, with numbers; decisions go to kb/decisions.md
Open questions  <list of `needs input` items from kb/>
```
Then commit kb changes (`git add kb && git commit -m "kb: setup done" && git push`).

Write `kb/runs/<YYYY-MM-DD>-setup.md` (what was created, where, what is still open; no keys) and fill the
`kb/sources.md` rows for every key that was added (on, cap, last run).
