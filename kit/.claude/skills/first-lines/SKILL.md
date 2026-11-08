---
name: first-lines
description: ALWAYS use this skill when the owner wants outreach written ("write emails", "draft first lines", "write the sequence", "draft outreach for the top leads", "rewrite this email", "make it shorter", "doc title for the doc channel"). It writes email 1 and two follow-ups per verified, qualified lead from the strongest measured fact, in the owner's voice, under 90 words, then runs a reviewer pass against the copy rules and saves them as drafts. It never sends or queues; the owner approves in Outreach.
---
# Write first lines and follow-ups (drafts only)

Read `kb/RULES.md`, `kb/context.md`, `kb/offer.md`, `kb/voice.md` and `kb/icp.md` first. Then
`references/copy-rules.md` (rules and banned list) and, only for the optional doc channel, `references/doc-channel.md`.

## 1. Work list
```bash
node scripts/le.mjs read to-write limit=15
```
People with verifier `ok` at qualified companies, with no messages yet. Each row has the company's evidence line,
why lines, and the person's interests and offer key (from activity-research) if any.

## 2. Pick the one fact
The strongest **measured, checkable** fact about *their* system, in this order: a measured number (load time, a
webhook on every page view) → the evidence line → the newest strong signal (job post with its age, register entry).
Never a guess about their business, never a tab title, never "I saw your comment".
Re-open the page and confirm the fact is still true today. If not, skip the lead and say why.

## 3. Write three messages
- **Email 1** (≤ 90 words, aim for 50–80): greeting with first name → the fact → why it matters to them in one
  sentence → the free check or sample from `kb/offer.md` as a one-line ask → signature from `kb/voice.md`.
  Subject: 2–4 words, lowercase, no pitch, no name, no numbers.
- **Follow-up 1** (business day +3): no greeting, one new point (a second fact or a consequence), ≤ 60 words.
- **Follow-up 2** (business day +5 after that): says it is the last note, leaves the offer open, ≤ 50 words.
No links, no tracking, no attachments in email 1. Plain text. The app adds the opt-out line; don't write your own.
Pick the angle from the person's `offer_key` when present (it reflects all their activity).

## 4. Reviewer pass (every draft, before saving)
Check against `references/copy-rules.md`: word counts, banned words and structures, one ask, the fact is about them,
no claim we can't prove, no reply-rate or result promises, no em dashes, no exclamation marks. Rewrite until it passes.
Then read it as the recipient: would a busy owner understand it in 10 seconds? If not, cut.

## 5. Save as drafts
```bash
node scripts/le.mjs ingest '{"drafts":[
  {"email":"dana@acme.example","step":1,"subject":"portal speed","body":"Hi Dana,\n\n..."},
  {"email":"dana@acme.example","step":2,"subject":"","body":"..."},
  {"email":"dana@acme.example","step":3,"subject":"","body":"..."}]}'
```
Re-running updates drafts; sent messages are never overwritten. Tell the owner: "N drafts ready in Outreach → Drafts
to approve". Never queue or send from this skill.

## 6. Variants
When the owner wants to test, change one thing at a time (subject, opener, angle or ask), 2 variants. Say in the run
note which variant each lead got. Judge only after ≥ 30 delivered per variant and after follow-up 1.

Write `kb/runs/<YYYY-MM-DD>-first-lines.md` (leads drafted, facts used by type, skipped and why) and update
`kb/sources.md` yields (drafts per source).
