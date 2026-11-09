# Optional channel: a shared Google Doc (bundle author's test, started 2026-11-08; no result yet)

How it works: a script inside a separate Google Workspace mailbox creates a Google Doc (the free check written up:
measured findings plus a simple mockup of how their app could look, with their logo and main processes) and shares it
with the prospect with notify on and a 2-line note. It lands in Gmail as a share notification and shows only the title
and the note, so **the title is the hook**: a plain measured line such as "<host>: 2 app problems found".

Rules the author set:
- Only when there are at least 2 real problems: slow loads measured on a phone, hard platform limits they will hit,
  broken flows. Never a tab title, never "costs grow with users" or "data locked in" (every tool bills by usage and
  has an API).
- The note says why they should care, not what we did.
- 5 shares a day in week 1, then 10 if Google shows no warnings, at most about 20 per account.
- The share is the only touch: no follow-up emails (author's decision 2026-11-08). Replies are caught by the mailbox.
- Unshare after 14 days without a reply.
- Stop on a quota error, a Google warning, or 2 angry replies in 50.
- One public backlash case exists (Feb 2026, sourced): treat it as a risky channel and keep volume low.
- Never from the main brand account.

This bundle does not automate sharing. If the plan picks this channel, first-lines writes the doc title, the note and
the doc outline as drafts; the owner creates and shares the docs; counts go in `kb/runs/`. More context:
`.claude/skills/plan/references/non-obvious-channels.md`.
