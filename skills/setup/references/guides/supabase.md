# Supabase (modes A and B)

## Account and connector
1. Sign up with the Supabase link in `kb/tools.md` (GitHub sign-in is fine). The free plan works to start; free
   projects pause after about a week without traffic, which also stops sending, so a business should plan for Pro.
2. Best: connect the **Supabase connector** in Claude (claude.ai → Settings → Connectors → Supabase → Connect, then
   allow your organization). Claude can then create the project and apply the database setup without any CLI.

## Create the project (if Claude can't)
1. supabase.com/dashboard → **New project** → pick your organization.
2. Name `lead-engine`; Database password: click **Generate a password** and paste it to Claude privately only if asked
   (it goes in `.env.local` as `SUPABASE_DB_PASSWORD`); Region: closest to your leads; **Create new project**.
3. Wait until the dashboard shows the project as healthy (1 to 3 minutes).

## API keys (Claude needs three values)
Project → **Project Settings** (gear) → **API Keys** (or **Data API**):
- Project URL (`https://<ref>.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (server only: never in the browser, never in git)
Paste each into `.env.local` yourself, or give it to Claude only in a local session. In a cloud session, add them as
environment secrets (`claude-cloud-session.md`).

## Personal access token (CLI route only)
Account (top right) → **Access Tokens** → **Generate new token** → name `lead-engine` → copy into `.env.local` as
`SUPABASE_ACCESS_TOKEN`. It reaches all your projects: keep it on your computer only.

## Sign-in URLs
Project → **Authentication** → **URL Configuration**: Site URL = your app URL; Redirect URLs: add
`https://<your-app>/**` and `http://localhost:3000/**`. Save.

## Your own existing project (mode B)
It works if the table names don't clash (companies, people, signals, messages, mailboxes, settings, suppression,
sources_runs, team_members). Claude checks first and tells you.
