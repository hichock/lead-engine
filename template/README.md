# Lead Engine app

Next.js (App Router, TypeScript strict) on Vercel + Supabase. Start with `CLAUDE.md` and `kb/README.md`.

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
