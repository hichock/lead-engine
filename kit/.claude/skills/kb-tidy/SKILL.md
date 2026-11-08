---
name: kb-tidy
description: Use weekly, or when the owner says "tidy", "clean up the knowledge base", "what do you need from me", or kb/README.md looks out of date. Merges duplicate notes, fixes the map, archives old runs and lists open questions for the owner.
---
# Tidy the knowledge base

Read `kb/RULES.md`, `kb/context.md` and `kb/README.md` first.

1. **Map:** every file in `kb/` (except `runs/`) has one line in `kb/README.md` with its status. Add missing lines,
   remove lines for files that no longer exist.
2. **Duplicates:** find facts written in two places. Keep the newest in its proper home, replace the other copy with
   a link.
3. **Long files:** split any file over ~200 lines by topic and update the map.
4. **Runs:** move `kb/runs/*` older than 60 days to `kb/runs/archive/`. Add one summary line per month to
   `kb/runs/README.md` (runs, totals, cost).
5. **Open questions:** collect every `needs input` in `kb/`. Show the owner a short numbered list. Write their
   answers back where the question was, labelled `stated`.
6. **Sources:** every row in `kb/sources.md` has a last-run date and a yield; flag rows unused for 30+ days.
7. **Settings drift:** compare `kb/icp.md` weights and `kb/sources.md` caps with Settings (ask the owner or read
   `node scripts/le.mjs read funnel`); list differences for the owner.

Write `kb/runs/<YYYY-MM-DD>-kb-tidy.md` with what changed and update `kb/sources.md` yields if any were missing.
