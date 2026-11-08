---
name: outreach-review
description: Daily and weekly outreach review for Lead Engine. Classifies new replies and drafts answers, queues approved drafts within caps when auto-queue is on, runs the stop-loss checks (bounces, complaints, blocklists, reply rate), and once a week ranks sources, signals and copy variants by positive replies and proposes what to kill or scale. Manual only because it can queue email, so run /outreach-review (scheduled tasks call it the same way). Use it for "how is outreach going", "replies", "weekly review".
disable-model-invocation: true
---
# Outreach review (daily; weekly on Mondays or when asked)

Read `kb/RULES.md`, `kb/context.md`, `kb/offer.md` (replies, booking link), `kb/voice.md` and `kb/sources.md` first.
Then `references/reply-rules.md`, `references/stop-loss.md`; for mailbox and domain questions
`references/sending-infra.md`; for legal questions `references/compliance.md`.

## Daily

### 1. Numbers
```bash
node scripts/le.mjs read funnel
```
Sent by step and mailbox, inbound by class, companies by status, per-source totals.

### 2. Stop-loss (before anything else is queued)
Compute from the funnel and the last 7 days (rules in `references/stop-loss.md`):
- bounce rate per mailbox and overall (bounces ÷ sent). **> 2% → tell the owner to pause that mailbox** (Settings →
  Mailboxes → Pause) and re-verify its queue; **≥ 3% → pause everything.** Don't queue more today.
- any complaint or "hostile" reply → note it; near 0.1% of sends → pause and review targeting and copy.
- owner reports a blocklist or a Postmaster warning → retire that domain's mailboxes.
Record every pause in `kb/decisions.md`.

### 3. Replies
```bash
node scripts/le.mjs read replies limit=50
```
The app already stopped the sequence and forwarded each reply to the owner. Classify each (`positive`, `question`,
`objection`, `not_now`, `unsubscribe`, `hostile`, `auto_reply`, `bounce`):
```bash
node scripts/le.mjs ingest '{"reply_classes":[{"message_id":"<uuid>","class":"question"}]}'
```
`unsubscribe` and `hostile` suppress the person everywhere. Then draft an answer per reply (rules in
`references/reply-rules.md`) and show the drafts to the owner in this session, positives first. The owner sends from
the same mailbox (the forwarded email says which). Never write reply text or names into `kb/`.

### 4. Queue (only if auto-queue is on in Settings)
```bash
node scripts/le.mjs read drafts limit=50
node scripts/le.mjs queue <person_id> <person_id> ...
```
The app re-runs the send checks (verifier ok, not suppressed, not contacted, ≤ 90 words) and refuses the rest with a
reason. Auto-queue off → tell the owner how many drafts wait in Outreach → Drafts to approve.

### 5. Daily note
Write `kb/runs/<YYYY-MM-DD>-outreach-review.md`: sent today by mailbox, replies by class (counts), bounces, queue
size, stop-loss status, anything paused. 10 lines max.

## Weekly (Mondays, or "weekly review")
1. Per source and per signal kind: companies found → qualified → `ok` contacts → sent → positive replies. Per copy
   variant: delivered, replies, positives.
2. **Judge only groups with ≥ 30 delivered and after follow-up 1 went out.** Reply rate under ~1% after 300+ sends
   → targeting or offer is wrong: propose a change, don't just send more (generic vendor threshold).
3. Propose kill / keep / scale with the numbers, one line each. The owner decides; write each decision to
   `kb/decisions.md` (date - decision - numbers - where) and update the weights in `kb/icp.md` + Settings
   (`node scripts/le.mjs ingest '{"scoring":{...}}'`) when a signal kind is downgraded.
4. Update every row in `kb/sources.md` (yield to date incl. sent and positive replies) and run `kb-tidy` if the kb
   map is out of date.
5. Never report a reply rate as a promise or a forecast; report counts with n and dates.

Write `kb/runs/<YYYY-MM-DD>-outreach-review.md` (the weekly table in counts, decisions proposed and taken) and
update `kb/sources.md` yields.
