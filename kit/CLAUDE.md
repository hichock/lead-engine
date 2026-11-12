# Lead Engine

This repo is a lead search engine run by Claude. It finds companies by signals (the tools they run on, register
entries, job posts, comments on popular posts), qualifies them on their own website, finds and verifies contacts only
for qualified companies, scores them with written reasons, drafts first lines, sends from the owner's own warmed
mailboxes and learns from the results every week.

- **Mode** (in `kb/context.md`): **A** the app on Supabase + Vercel; **B** the app on the owner's own host and
  database (`HOSTING.md`); **C** no app: `LEAD_ENGINE_MODE=local`, a local SQLite or own Postgres store, and the
  dashboard as `docs/report.html` (`report` skill). The commands below are the same in every mode.
- **App (A, B):** Next.js (this repo). Pages: Leads (with CSV export), Company, Sources & runs, Outreach, Settings.
- **Memory:** `kb/`. **Read `kb/README.md` and `kb/RULES.md` first, every session.** Then `kb/context.md` before any task.
  The approved plan is `kb/plan.md`; tools, links and prices only in `kb/tools.md`; best practices indexed in `kb/playbook.md`.
- **Skills:** `.claude/skills/`. They work in local sessions, cloud sessions, scheduled tasks and GitHub Actions.
- **The guard talks to providers, not Claude.** Skills call `node scripts/le.mjs ...`; the app (or, in mode C, the
  local runner with the same code) enforces caps, the 24 h run ledger and "paid contact work only on qualified
  companies". Never call a paid API directly with curl.
- **Stuck?** The `get-help` skill sends a request to the bundle's author (after confirming the owner's contact
  details, never with secrets). Fallback: info@lowcoding.dev.

## Routing: when the owner says X, use skill Y
Use the skill even when the request is short. If two match, run them in pipeline order (top to bottom).

| Owner says (examples) | Skill |
|---|---|
| "set up", "connect", "deploy", "it's broken after install" | `/lead-engine:setup` (plugin) or resume `kb/setup-state.md` |
| "what's the plan", "which channels", "research my niche / competitors", "what will it cost", "re-plan" | `plan` |
| "show the dashboard", "report", "refresh the numbers" (mode C), "dashboard mock" | `report` |
| "I need help", "contact the author", "support", setup failed twice | `get-help` |
| "find companies using Softr / Airtable / Bubble…", "tech search", "who runs X", "new users of X" | `source-tech` |
| "lawyers in Florida", "bar directory", "Companies House", "a register", "licence list" | `source-registers` |
| "find ops managers at…", "Apollo", "people search", "decision makers in <city>" | `source-people` |
| "viral posts", "who commented on…", "LinkedIn comments", "people asking for recommendations" | `source-social` |
| "job posts", "hiring", "ads running", "reviews", "Form D", "add signals to my list" | `source-signals` |
| "check these companies", "qualify", "are they a fit", "remove junk / phishing" | `qualify` |
| "find emails", "who do I write to", "find the contact" | `find-contact` |
| "verify", "check the emails", "bounces", "catch-all" | `verify` |
| "what is this person into", "research the prospect", "their comments", "which offer fits" | `activity-research` |
| "score", "rank", "who first", "why is X ranked high" | `score` |
| "write emails", "first lines", "draft outreach", "rewrite this email" | `first-lines` |
| "how is outreach going", "replies", "send today", "weekly review", "what should we kill" | `outreach-review` (manual: type `/outreach-review`) |
| "remember", "from now on", "we decided", "don't do X again" | `kb-keeper` |
| "tidy the kb", "what do you need from me" | `kb-tidy` |

Pipeline order: source-* → qualify → find-contact → verify → activity-research (optional) → score → first-lines →
owner approves (Outreach page; mode C: in the session, then `le queue`) → app sends (mode C: `le send`, or export to
a sequencer) → outreach-review → report (mode C).

## Commands skills use
```bash
node scripts/le.mjs env                                   # which variables are set (names only)
node scripts/le.mjs read to-qualify limit=50               # work lists: to-qualify, to-contact, to-verify, to-write, drafts, replies, funnel, company domain=x
node scripts/le.mjs src '{"source":"urlscan","params":{"q":"...","slices":true}}'   # guarded source call
node scripts/le.mjs ingest rows.json                       # idempotent writes (companies, people, signals, drafts, reply_classes, suppression)
node scripts/le.mjs score                                  # recompute fit × trigger
node scripts/le.mjs queue <person_id> ...                  # after the owner approves (app: only with auto-queue on)
# mode C only: init, send [--dry-run], replies, export [--for=sequencer], report
```
Exit code 3 = refused by a cap or the ledger: report it, don't work around it. HTTP 202 = a paid job is still
running: call again with the same input later (it resumes, it never re-bills).

Tool sign-up links and prices: only from `kb/tools.md`.

## Code rules (full list: `kb/dev-rules.md`)
- TypeScript strict. No `any` in new code; normalise data once where it enters (loaders, parsers).
- **Page = loader + pure view model + thin JSX**: `app/<x>/page.tsx` → `lib/data/load.ts` (reads only) →
  `lib/view/<x>-view.ts` (pure, with a `node:test` file) → JSX.
- **Server action / route = parse → load → decide → write → message**, each its own function; `decide` is pure and tested.
- Caps, ledger and send rules live in code (`lib/guard.ts`, `lib/ledger.ts`, `lib/sender/*`), never only in a prompt.
- A bug fix starts with a failing test. Test behaviour with literal expected values.
- No silent failures: a failed read shows "Could not load …", never an empty list or 0. Capped reads say so.
- Supabase returns at most 1,000 rows per request: use `allRows()` for anything that can grow.
- Writes are idempotent (unique keys: companies.domain, people.email, signals (company, kind, value), drafts per step).
- Every table has RLS; only team members read; only the server writes the ledger and mailbox secrets.
- Before pushing: `npx tsc --noEmit && npm test && npm run build`.

## Deploy and migration order
1. New migration in `supabase/migrations/` (timestamped, append-only; never edit an applied one). Check for duplicate
   timestamps: `ls supabase/migrations | cut -c1-14 | sort | uniq -d` prints nothing.
2. Test locally if Postgres is available: `bash scripts/test-migrations-local.sh`.
3. `supabase db push` (migration first), then deploy code that needs it (`git push` → Vercel).
4. If a cron calls a new route, deploy the route before scheduling the cron.
5. New env var: add to `.env.example`, `.env.local`, Vercel (`vercel env add`), then redeploy.

## Never
- Never send to an address the verifier did not mark `ok`. catch_all goes to the retry list, never to the sender.
- Never pay for contacts or verification on a company that is not `qualified = true` (the app refuses; don't bypass it).
- Never re-run a paid job that is pending: resume it. Never run a BigQuery query without a dry run.
- Never send cold email from the owner's main domain. Never remove the opt-out line unless the owner decides it in
  `kb/decisions.md` with the legal note read.
- Never scrape LinkedIn with the owner's logged-in session or cookies; no connect or DM automation on their profile.
- Never put keys, passwords or lists of names/emails in `kb/` or in git. Aggregates only. `data/` (local store,
  exports) and `docs/report.html` stay gitignored.
- Never invent numbers. Label every number `measured` / `sourced` / `stated` / `assumed` / `needs input`.
- Never promise reply rates. Report the funnel per source and let the stop-loss rules decide.
