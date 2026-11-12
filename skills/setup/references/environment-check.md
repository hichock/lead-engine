# Environment check (setup step 1)

Find out what the owner already has before asking for anything. Read only; create nothing. Write a one-line summary
per area into `kb/setup-state.md` § 1 (names only, never values).

## Where we run
- `echo "${CLAUDE_CODE_REMOTE:-}"` is `true` → a **cloud session** (claude.ai/code or a scheduled task). The repo is
  pre-attached, the container is temporary (files outside git are lost when it ends), browser logins for CLIs are
  usually not possible, and connectors (MCP) are the way to reach Supabase, Vercel and GitHub.
- Otherwise a **local session** on the owner's computer: CLIs with browser logins work, files persist.

## Connectors (prefer them over CLIs)
Look at the tools in this session (and use tool search if tools are deferred):
| Connector tools | Gives | Use for |
|---|---|---|
| `mcp__Supabase__*` (list_organizations, create_project, apply_migration, execute_sql, get_project_url, get_publishable_keys) | Supabase without a CLI login | mode A or B: create or reuse the project, apply migrations, run SQL |
| `mcp__Vercel__*` (list_teams, create_project, create_project_env, create_deployment, get_deployment) | Vercel without a CLI login | mode A: project, env vars, deploys |
| `mcp__github__*` (get_me, create_repository, push_files) | GitHub | read the account; repo creation only locally (see below) |
| `mcp__Zapmail__*` | domains, mailboxes, warm-up | sending setup (every purchase needs the owner's yes) |
Call one read tool per connector (e.g. Supabase `list_organizations`, Vercel `list_teams`, GitHub `get_me`) to confirm
it is connected to the owner's account. A connector that answers counts as "logged in".

## CLIs (local sessions mostly)
```bash
node -v; git --version
gh auth status 2>&1 | head -3
supabase projects list 2>&1 | head -3      # or: npx -y supabase projects list
vercel whoami 2>&1 | head -1               # or: npx -y vercel whoami
gcloud auth list 2>&1 | head -3            # only if the plan uses HTTP Archive
```

## Variables already set (names only)
```bash
for n in NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_ACCESS_TOKEN VERCEL_TOKEN GITHUB_TOKEN \
  URLSCAN_API_KEY GCP_SA_KEY MILLIONVERIFIER_API_KEY MONID_API_KEY APOLLO_API_KEY APIFY_TOKEN DATABASE_URL LEAD_ENGINE_DB; do
  [ -n "${!n}" ] && echo "set $n"; done
[ -f .env.local ] && cut -d= -f1 .env.local | grep -v '^#' | sort -u    # names only
```
In a cloud session, keys belong in the environment's secrets (guide: `guides/claude-cloud-session.md`), not in files.

## The repo
| Situation | What to do |
|---|---|
| Cloud session, the attached repo is empty (only `.git`, maybe README or LICENSE) | Use it. Say so in one line. |
| Cloud session, the attached repo has code | List what would clash (`package.json`, `app/`, `lib/`, `scripts/`, `CLAUDE.md`, `.claude/`). No clash → ask once: "Set up Lead Engine inside <repo>? I only add files; nothing is overwritten." Clash → explain the two ways out: create a new empty private repo and attach it to a new session (`guides/claude-cloud-session.md`), or keep this repo and set up in a subfolder `lead-engine/` (`bash "$LE/scripts/scaffold.sh" lead-engine`; Vercel's Root Directory is then `lead-engine`). Never create a repo from a cloud session. Mode C is not offered in a cloud session (modes.md). |
| Local, empty folder | Use it; the repo is created with `gh repo create --private` after the plan is approved. |
| Local, folder with code | Same clash check; offer a new folder `./lead-engine` instead. |
| Local, no `gh` login | Ask the owner to run `gh auth login` (`guides/github.md`), or skip GitHub for now in mode C (git stays local). |

## Summary to show (one block, then go on)
"Here's what you already have: <connectors>, <CLIs logged in>, <keys set>, <repo situation>. I'll use these and only
ask for what's missing."
