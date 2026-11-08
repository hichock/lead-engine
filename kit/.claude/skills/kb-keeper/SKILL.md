---
name: kb-keeper
description: ALWAYS use this skill when the owner decides something, corrects you, says "remember", "from now on", "don't do X", "we chose", or when a run, research or a problem should be recorded. It writes the right line to the right file in kb/ (decisions, findings, runs, research, context). Do not edit kb/ files directly without it.
---
# Keep the knowledge base current

Read `kb/RULES.md`, `kb/context.md` and `kb/README.md` first. Then:

1. Decide what kind of note this is:
   - decision or correction → `kb/decisions.md`, top of today's section: `- **<decision>.** <why>. - <who> (<where in code/kb>)`
   - something broke or surprised us → `kb/findings.md`: next `F-<n>`
   - a run finished → `kb/runs/<YYYY-MM-DD>-<skill>.md`
   - research → `kb/research/<topic>-<YYYY-MM>.md` + index line in `kb/research/README.md`
   - a source, signal or variant verdict → `kb/decisions.md` + that source's row in `kb/sources.md`
   - a change to who we target or how we score → `kb/icp.md`, then mirror it in the app:
     `node scripts/le.mjs ingest '{"scoring":{...}}'`
   - a business fact changed → edit `kb/context.md` (or the domain file) in place and date the line
2. Label numbers (`measured` / `sourced` / `stated` / `assumed` / `needs input`). Never invent numbers.
3. If the note replaces an older one, mark the old one `Superseded <date> by …`. Don't delete it.
4. If a plan's status changed, update its `Status:` line and the map in `kb/README.md`.
5. Commit with a message that says why (`kb: <what was decided>`), if this project uses git commits for kb changes.

Tell the owner in one line what you wrote and where.

No run note for a single remembered rule. If the note came from a run, that skill writes `kb/runs/<date>-<skill>.md`;
if it was about a source, update that row's yield in `kb/sources.md`.
