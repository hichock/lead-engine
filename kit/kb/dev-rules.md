# Development rules

Status: filled (bundle defaults). For any change to the app in this repo. Short version in `CLAUDE.md`.

## How a change ships
1. Sketch first: name the loader, view model, components and action steps, one line each.
2. A bug fix starts with a failing test that reproduces it. See it fail for the expected reason, then fix.
3. Refactoring = pin (tests) → change structure → prove (tests still pass). Never in the same commit as a behaviour change.
4. One concern per commit; the message says why.
5. Before pushing: `npx tsc --noEmit && npm test && npm run build`.

## Small functions
- Aim for functions ≤ 10 branches and ≤ 60 lines (`.ts`) or ≤ 100 lines (`.tsx`). Split before adding a branch to a
  function that is already over.
- **Page = loader + pure view model + thin JSX.** `page.tsx` reads params, calls `loadX()` (`lib/data/load.ts`, reads
  only, returns typed rows or a page state), then `toXView(raw, now)` (`lib/view/x-view.ts`, pure, tested), then renders.
- **Server action or route = parse → load → decide → write → message**, each its own function. `decide` is pure and tested.
- **Normalise once where data enters** (row mappers in `lib/data/load.ts`, parsers in `lib/forms/`). Views don't
  repeat `?.` / `??` chains. No new `as any`.
- **A new request is a new unit**: a new source is a module in `lib/sources/` + a line in `registry.ts` + a case in
  `run.ts`; a new page section is its own component.
- No speculative code: no options, flags or abstractions nobody asked for. Remove what your change made unused.
- Tests at the seam with literal expected values. A test that recomputes the expected value the way the code does
  checks nothing.

## Correctness
- **Access is enforced server-side.** Every table has RLS with explicit policies (team members only). The run ledger
  and mailbox secrets are written by the service role only. Test access as each role
  (`supabase/tests/10_rls_and_ledger.sql`), not by reading policies.
- **No silent failures.** A failed read shows "Could not load …"; a capped list says it was cut off.
- **1,000-row cap.** Supabase returns at most 1,000 rows per request and cuts larger reads silently. Use `allRows()`
  (`lib/supabase/admin.ts`, ordered by a unique key) for anything that can grow.
- **Idempotent writes.** companies by domain, people by email, signals by (company, kind, value), drafts by
  (person, channel, step). A re-run never duplicates and never overwrites a sent message.
- **Caps and rules in code, not prompts.** `lib/guard.ts` (caps, qualified-only), `lib/ledger.ts` (24 h dedupe,
  resume), `lib/sender/checks.ts` (send checks), `lib/sender/plan.ts` (windows, gaps, caps).
- **External APIs:** check field names against one live read call before relying on them. Poll long jobs, never re-run.
- **Days:** caps reset at 00:00 UTC (`startOfRunDay`). Send windows use the lead's time zone (`tzFor`).

## Migrations
- Schema changes are migrations in `supabase/migrations/`: timestamped, append-only. Never edit an applied migration.
- Unique timestamps: `ls supabase/migrations | cut -c1-14 | sort | uniq -d` must print nothing.
- Test locally when Postgres is available: `bash scripts/test-migrations-local.sh` (throwaway DB, no credentials).
- Order: migration → code that needs it. Code must tolerate a new constraint before it is applied. If a cron calls a
  new route, deploy the route first. Say the order in your report.
- Git is the source of truth: no dashboard-only schema edits. Config that matters (crons, auth URLs) is written down
  in `supabase/sql/` or `kb/`.

## Secrets and personal data
- Keys live in `.env.local` (never committed), Vercel env and the cloud environment's variables. `.env.example`
  lists names only. The service-role key is server-only. Changing a Vercel env needs a redeploy.
- No personal data in the repo or `kb/`: no exports, no fixtures with real names or emails (tests use `.example`
  domains and `example.com`). Grep for keys before every commit.
