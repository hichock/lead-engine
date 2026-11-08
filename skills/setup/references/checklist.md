# Setup commands, step by step

Run from the project folder. Replace `<…>`. Tick the matching line in `kb/setup-state.md` after each block.

## §1 Tools
| Tool | Check | Install |
|---|---|---|
| Node ≥ 20 | `node -v` | https://nodejs.org (LTS) or `brew install node` |
| git | `git --version` | `brew install git` / `apt-get install -y git` |
| GitHub CLI | `gh --version` | `brew install gh` / https://cli.github.com |
| Supabase CLI | `supabase --version` | `brew install supabase/tap/supabase`, or use `npx -y supabase <cmd>` everywhere |
| Vercel CLI | `vercel --version` | `npm i -g vercel`, or `npx -y vercel <cmd>` |
| openssl | `openssl version` | usually present |

## §2 Copy
```bash
cp -Rn "$LE/template/." . && cp -Rn "$LE/kit/." .
git init -q 2>/dev/null; npm install && npx tsc --noEmit && npm test
cp .env.example .env.local      # fill as you go; .env.local is gitignored
```

## §3 Logins
```bash
gh auth login            # browser flow; choose HTTPS
supabase login           # browser flow (or: supabase login --token "$SUPABASE_ACCESS_TOKEN")
vercel login             # browser / email flow
gh auth status && supabase projects list && vercel whoami
```
Also ask the owner for a Supabase personal access token (supabase.com/dashboard/account/tokens) and put it in
`.env.local` as `SUPABASE_ACCESS_TOKEN`: `scripts/le.mjs sql` and the auth-config call below use it. It grants access
to all their Supabase projects, so it stays local (not in Vercel, not in cloud environments).

## §5 GitHub
```bash
git add -A && git commit -qm "Lead Engine: app and kit"
gh repo create <name> --private --source . --remote origin --push
```

## §6 Supabase
```bash
supabase orgs list
PW=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24); echo "SUPABASE_DB_PASSWORD=$PW" >> .env.local
supabase projects create <name> --org-id <org_id> --db-password "$PW" --region <region>   # e.g. eu-west-2, us-east-1
# wait until healthy (1–3 min):
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/<ref> | grep -o '"status":"[A-Z_]*"'
[ -f supabase/config.toml ] || (echo n | supabase init)
supabase link --project-ref <ref> --password "$PW"
supabase db push
supabase projects api-keys --project-ref <ref>     # copy anon and service_role into .env.local
```
`.env.local`: `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF=<ref>`.
Owner as team member, then the auth URLs (after §7 gives the URL):
```bash
node scripts/le.mjs sql "insert into team_members (email, role) values (lower('<owner email>'), 'owner') on conflict do nothing"
curl -s -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  https://api.supabase.com/v1/projects/<ref>/config/auth \
  -d '{"site_url":"https://<app>.vercel.app","uri_allow_list":"https://<app>.vercel.app/**,http://localhost:3000/**"}'
```
More teammates later: the same insert with their email.

## §7 Vercel
```bash
for k in CRON_SECRET AGENT_TOKEN; do echo "$k=$(openssl rand -hex 32)" >> .env.local; done
echo "MAILBOX_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local
vercel link --yes --project <name>
# push each needed variable (never DEMO, never SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD):
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET AGENT_TOKEN MAILBOX_ENCRYPTION_KEY; do
  v=$(grep "^$k=" .env.local | head -1 | cut -d= -f2-); [ -n "$v" ] && printf %s "$v" | vercel env add "$k" production >/dev/null && echo "added $k"
done
vercel deploy --prod --yes          # prints the production URL
```
Then: `NEXT_PUBLIC_SITE_URL` and `LEAD_ENGINE_URL` = that URL in `.env.local`; add `NEXT_PUBLIC_SITE_URL` to Vercel;
run the auth PATCH from §6; `vercel git connect` (so pushes deploy); `vercel deploy --prod --yes` again.
Check: `curl -s -o /dev/null -w "%{http_code}" <URL>/login` → 200; `node scripts/le.mjs read funnel` → JSON, not 401.

## §9 App schedule (pg_cron)
```bash
APP=$(grep '^LEAD_ENGINE_URL=' .env.local | cut -d= -f2-); CS=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
sed -e "s#{{APP_URL}}#$APP#g" -e "s#{{CRON_SECRET}}#$CS#g" supabase/sql/schedule.sql > "$TMPDIR/schedule.filled.sql"
node scripts/le.mjs sql "$(cat "$TMPDIR/schedule.filled.sql")"; rm "$TMPDIR/schedule.filled.sql"
node scripts/le.mjs sql "select jobname, schedule from cron.job"
```
Vercel's own crons (vercel.json) are daily backstops; on Hobby they run once a day at most.

## Troubleshooting
- Leads page says "No access": the signed-in email is not in `team_members` (check case and spelling).
- "Could not load": migrations not applied → `supabase db push`.
- `le` answers 401: `AGENT_TOKEN` differs between `.env.local` and Vercel, or Vercel was not redeployed.
- A source answers "… is not set": add the key in Vercel and redeploy.
