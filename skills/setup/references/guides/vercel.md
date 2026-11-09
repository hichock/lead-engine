# Vercel (mode A)

Hobby (free) is for personal, non-commercial use. A business sending outreach should use Pro ($20 per user a month,
see `kb/tools.md`).

## Account and connector
1. Sign up with the Vercel link in `kb/tools.md` ("Continue with GitHub" is easiest).
2. Best: connect the **Vercel connector** in Claude (claude.ai → Settings → Connectors → Vercel → Connect).

## Import the repo (dashboard)
1. vercel.com → **Add New…** → **Project** → **Import** next to your `lead-engine` repo (allow Vercel to see it if asked:
   "Adjust GitHub App Permissions" → pick the repo).
2. Framework: Next.js (detected). Root directory: the repo root. Don't deploy yet: open **Environment Variables** first.

## Environment variables in the dashboard
Project → **Settings** → **Environment Variables**. For each name Claude lists (from your `.env.local`):
1. Key = the name (for example `CRON_SECRET`), Value = the value, Environments: **Production** (and Preview if asked).
2. **Save**. Repeat. Never add `DEMO`, `SUPABASE_ACCESS_TOKEN` or `SUPABASE_DB_PASSWORD`.
3. After any change: **Deployments** → the latest → **⋯** → **Redeploy**. Variables only apply to new deployments.

## Environment variables with the CLI (local)
```bash
npm i -g vercel && vercel login          # opens the browser
vercel link --yes --project lead-engine
printf %s "<value>" | vercel env add CRON_SECRET production
vercel env ls                             # names only
vercel deploy --prod --yes                # prints the production URL
```

## Check
Open `https://<your-app>.vercel.app/login`: the sign-in page loads. Sign in with your email: you get a magic link.
"No access" after sign-in means your email is not in the team list yet: tell Claude.
