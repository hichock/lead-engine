# Setup commands, step by step

Run from the project folder. Replace `<…>`. Tick the matching line in `kb/setup-state.md` after each block.

## §1 Tools
| Tool | Check | Install |
|---|---|---|
| Node ≥ 22.13 (built-in SQLite for mode C) | `node -v` | https://nodejs.org (LTS) or `brew install node` |
| git | `git --version` | `brew install git` / `apt-get install -y git` |
| GitHub CLI | `gh --version` | `brew install gh` / https://cli.github.com |
| Supabase CLI (mode A/B, only without the Supabase connector) | `supabase --version` | `brew install supabase/tap/supabase`, or use `npx -y supabase <cmd>` everywhere |
| Vercel CLI (mode A, only without the Vercel connector) | `vercel --version` | `npm i -g vercel`, or `npx -y vercel <cmd>` |
| openssl | `openssl version` | usually present |

## §2 Copy
```bash
cp -Rn "$LE/template/." . && cp -Rn "$LE/kit/." .
[ -d .git ] || git init -q
cp -n .env.example .env.local   # fill as you go; .env.local is gitignored
(npm install && npx tsc --noEmit && npm test) > /tmp/le-install.log 2>&1 &   # runs while the plan is researched
```
Inside an existing repo with its own `CLAUDE.md`: `cp -n` keeps theirs; append the kit's file under a heading
`## Lead Engine` instead (`cat "$LE/kit/CLAUDE.md" >> CLAUDE.md` after checking it is not there yet).

## §3 Connectors first
If a connector answered in the environment check, use it for that service and skip its CLI login:
- Supabase connector: `list_organizations` → `create_project` (owner's yes; name, region near the leads, generated DB
  password kept in `.env.local`) → wait for `get_project` status ACTIVE_HEALTHY → `apply_migration` with each file in
  `supabase/migrations/` in order (name = file name without `.sql`) → `get_project_url` and `get_publishable_keys` for
  the URL and anon key. The service-role key is not exposed by the connector: the owner copies it from the dashboard
  (`guides/supabase.md`, "API keys") into `.env.local` and the host's env vars. Team member and auth URLs: `execute_sql`
  for the insert; auth URLs in the dashboard (Authentication → URL Configuration).
- Vercel connector: `list_teams` → `create_project` (framework nextjs, linked to the GitHub repo if possible) →
  `create_project_env` per variable (target production; never `DEMO`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`)
  → deploy by pushing to the linked repo (or `create_deployment`) → `get_deployment` until READY.
- GitHub connector: read only for setup; create repos with `gh` locally.

## §3b CLI logins (local, when there is no connector)
```bash
gh auth login            # browser flow; choose HTTPS
supabase login           # browser flow (or: supabase login --token "$SUPABASE_ACCESS_TOKEN")
vercel login             # browser / email flow
gh auth status && supabase projects list && vercel whoami
```
Also ask the owner for a Supabase personal access token (supabase.com/dashboard/account/tokens) and put it in
`.env.local` as `SUPABASE_ACCESS_TOKEN`: `scripts/le.mjs sql` and the auth-config call below use it. It grants access
to all their Supabase projects, so it stays local (not in Vercel, not in cloud environments).

## §4 Mode C (no app)
```bash
grep -q '^LEAD_ENGINE_MODE=' .env.local && sed -i.bak 's/^LEAD_ENGINE_MODE=.*/LEAD_ENGINE_MODE=local/' .env.local || echo "LEAD_ENGINE_MODE=local" >> .env.local
# cloud sessions and scheduled tasks: a Postgres URL, because container files don't last
#   echo "LEAD_ENGINE_DB=postgres://…" >> .env.local && npm i pg      (in the cloud: an environment secret, not the file)
node scripts/le.mjs init && node scripts/le.mjs env
```
Skip §5 GitHub only if the owner wants no remote at all (kb/ stays in local git).

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
