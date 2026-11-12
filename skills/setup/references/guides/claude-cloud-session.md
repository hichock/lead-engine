# Running Lead Engine in a Claude Code cloud session (claude.ai/code)

## The repo
A cloud session works on the repo you picked when you started it. Claude can't create a new GitHub repo from there.
- **Empty repo attached:** Claude sets up inside it.
- **Repo with code attached:** Claude asks before adding files, or suggests a new repo if files would clash.
- **New repo:** on github.com → **+** → **New repository** → name `lead-engine`, **Private**, no README → **Create**.
  Then claude.ai/code → **New session** → pick the new repo (if it isn't listed: **Configure GitHub** / **Add
  repositories** and allow the Claude GitHub app to see it) → run `/lead-engine:setup` again. Setup resumes from
  `kb/setup-state.md` only if that file was committed; otherwise it starts fresh in the new repo.

## Connectors
claude.ai → **Settings** → **Connectors**: connect **Supabase**, **Vercel** and **GitHub** (and **Zapmail** if you buy
mailboxes there). Claude uses them instead of command-line logins, which need a browser on your computer.

## Secrets (keys) for cloud sessions and scheduled tasks
Files in a cloud container disappear when the session ends, and keys must never be committed. Put keys in the
environment instead: claude.ai/code → the environment menu (cloud icon next to the repo) → **Edit environment** →
**Environment variables** / **Secrets** → add each name and value → **Save**. New sessions get them.
- Mode A/B scheduled runs need only `LEAD_ENGINE_URL` and `AGENT_TOKEN`.
- Mode C (no app) does not work in a cloud session: the session allows only web (HTTPS) traffic, so it can't reach
  a Postgres database, SMTP or IMAP, and its files are gone when it ends. In the cloud, use mode A.
Allowed network hosts: if a call is blocked by the network policy, Claude tells you which host to allow in the same
environment settings.

## Scheduled tasks
claude.ai/code → **Scheduled** (or `/schedule` in a session) → **New** → pick the repo and environment → prompt and
time (examples in the setup's `scheduling.md`). The minimum interval is one hour. Plugins don't load there; the skills
copied into your repo do.
