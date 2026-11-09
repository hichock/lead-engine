# Hosting modes

Pick automatically from the environment check and the plan, then confirm in one line:
"You have <X>, so I'll use mode <M>: <one-line meaning>. OK?" Change only if the owner says so.

| Mode | What runs where | Pick it when | Needs |
|---|---|---|---|
| **A. Supabase + Vercel** (default) | App on Vercel, database and sign-in on Supabase, frequent jobs in pg_cron | nothing else is set up, or the owner already has Supabase and Vercel (connectors or CLIs) | GitHub, Supabase (free tier OK to start), Vercel (Hobby is non-commercial; a business should use Pro). Guides: supabase.md, vercel.md, github.md |
| **B. Bring your own** | App on the owner's Node host (Railway, Render, Fly, a VPS, Docker...), database = their Supabase project (or self-hosted Supabase) | the owner already runs a host and/or a Supabase project they want to reuse | Env vars and a scheduler for 3 routes: `HOSTING.md` in the app. Plain Postgres without Supabase: the web app can't run on it, so use mode C with `LEAD_ENGINE_DB=postgres://…` |
| **C. No app** | Everything from Claude Code: `LEAD_ENGINE_MODE=local`, a SQLite file (or their Postgres) as the store, the dashboard as `docs/report.html`, sending with `le send` over their SMTP mailboxes or a CSV for their sequencer | the owner doesn't want accounts or hosting, wants to try first, or already has a sequencer/CRM | Node 22.13+ (built-in SQLite). For cloud sessions or scheduled tasks: a Postgres URL (`LEAD_ENGINE_DB`), because the cloud container's files don't survive the session. Free Postgres: a Supabase or Neon free project |

## Rules
- Prefer what exists: an answering Supabase connector or a logged-in `supabase` CLI points to A (or B if they also have
  a host); a `DATABASE_URL`-style Postgres without Supabase points to C with that Postgres; nothing at all → A, unless
  the plan says "try first" → C.
- Every mode uses the same skills, the same guard (caps, ledger, qualified-only) and the same `node scripts/le.mjs`
  commands. Moving from C to A later: deploy the app and re-ingest from `le export` (companies, people, signals).
- In mode C, sending is the owner's choice: own sender (`le send` every 10–15 minutes on weekdays, `le replies`
  before each review) or a sequencer (`le export --for=sequencer`). Never both for the same people.
- Write the mode in `kb/context.md` § Setup and `kb/decisions.md` (date - mode - why - setup).
