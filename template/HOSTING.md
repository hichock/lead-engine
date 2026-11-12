# Hosting without Vercel

The app is a standard Next.js server. Any Node 22+ host works: Railway, Render, Fly.io, a VPS with Docker, Netlify,
your own server. What it needs:

1. **Build and start:** `npm ci && npm run build && npm start` (listens on `PORT`, default 3000). Put it behind HTTPS.
2. **Environment variables:** every name in `.env.example` that has a value in your `.env.local`, except `DEMO`,
   `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` (those stay on your machine). Set `NEXT_PUBLIC_SITE_URL` and
   `LEAD_ENGINE_URL` to your public URL, then rebuild (variables that start with `NEXT_PUBLIC_` are read at build time).
3. **Sign-in:** in Supabase → Authentication → URL Configuration, set the Site URL to your public URL and add
   `https://<your-host>/**` to the redirect list.
4. **Jobs:** three routes must be called on a schedule with the header `Authorization: Bearer <CRON_SECRET>`:

| Route | When |
|---|---|
| `POST /api/cron/send` | every 5 minutes, Mon to Fri (the app checks each lead's window) |
| `POST /api/cron/replies` | every 15 minutes |
| `POST /api/cron/sources` | daily |

Pick one way to call them:
- **Supabase pg_cron** (recommended, works with any host): `supabase/sql/schedule.sql` with your URL.
- **The host's own scheduler** (Railway cron, Render cron jobs, Fly machines, Kubernetes CronJob).
- **System cron on a server:** `*/5 * * * 1-5 curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/send`
- **GitHub Actions** `schedule:` with `curl` (GitHub may delay or skip runs at busy times; fine for sources, weak for sending).
- An external pinger (cron-job.org or similar) that can send a header.

`vercel.json` only matters on Vercel; other hosts ignore it.

## Your own database
- **Your existing Supabase project:** use it. Apply the migrations (`supabase link` + `supabase db push`); every
  table is new and prefixed by purpose (companies, people, signals, messages, ...), so check for name clashes first
  (`supabase db diff` or list your tables). Self-hosted Supabase works the same way.
- **Plain Postgres without Supabase** (Neon, RDS, your server): the web app needs Supabase's API and sign-in, so it
  does not run on plain Postgres (not built). Use the local mode with your Postgres as the store instead:
  `LEAD_ENGINE_MODE=local`, `LEAD_ENGINE_DB=postgres://…`, `npm i pg`. Skills work the same; the dashboard is the
  generated report (`node scripts/le.mjs report`), which you can serve from any static host behind your own login.
  Local mode runs on a machine that can reach that Postgres and your mailboxes (your computer or your server), not in
  a Claude Code cloud session or cloud scheduled task (web traffic only there).
