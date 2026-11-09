# Lead Engine app

Next.js (App Router, TypeScript strict) on Vercel + Supabase, or any Node host (see `HOSTING.md`), or no app at all
(local mode). Start with `CLAUDE.md` and `kb/README.md`.

```bash
npm install
npm run demo          # example data, no accounts needed: http://localhost:3000
npx tsc --noEmit && npm test && npm run build
```

- Pages: `app/` (Leads, Company, Sources & runs, Outreach, Settings, magic-link login).
- Machine routes: `app/api/agent/*` (skills, `AGENT_TOKEN`) and `app/api/cron/*` (`CRON_SECRET`).
- Logic: `lib/guard.ts` (caps), `lib/ledger.ts` (24 h dedupe), `lib/sources/` (one module per provider),
  `lib/sender/` (window, planner, checks, SMTP, IMAP), `lib/scoring.ts` (fit × trigger).
- Database: `supabase/migrations/`; local check `bash scripts/test-migrations-local.sh`; frequent jobs
  `supabase/sql/schedule.sql` (pg_cron).
- Every variable: `.env.example`.
- Export: the Leads page has **Export CSV** (every company with its best contact) and **For a sequencer** (verified
  people at qualified companies with their drafted emails, columns Instantly and Smartlead map by default):
  `GET /export/leads[?for=sequencer]`, as the signed-in user.

## Local mode (no app)
Set `LEAD_ENGINE_MODE=local` in `.env.local`. `node scripts/le.mjs` then runs every command on this machine
(`scripts/local.ts`) against a SQLite file (`data/lead-engine.db`, gitignored) or your own Postgres
(`LEAD_ENGINE_DB=postgres://…`, after `npm i pg`). Same guard, ledger, scoring and send checks as the app
(`lib/local/`). Extra commands:

```bash
node scripts/le.mjs init                         # create the store
node scripts/le.mjs report                       # dashboard as one HTML file: docs/report.html
node scripts/le.mjs export --for=sequencer       # CSV for Instantly / Smartlead
node scripts/le.mjs send --dry-run               # plan one send tick from MAILBOX_n (see .env.example)
node scripts/le.mjs replies                      # read replies and bounces over IMAP, stop sequences
npm run mock -- --title="Acme leads" --accent=#1c675f [--data=docs/mock-data.json]   # dashboard mock with example rows
```
