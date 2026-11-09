# Outreach playbook (index)

Status: filled (bundle defaults). The best practices this bundle runs on, in one map. Each line links the file that
holds the rule; the rule lives there only. Sources: the bundle author's runs (measured, dated) and a generic
lead-generation handbook (sourced 2026-11). Your own results go to `decisions.md` and `sources.md` and win over these.

## Order of work
- Discover cheap → qualify → pay only for qualified → verify → send: [enrichment stages](../.claude/skills/find-contact/references/enrichment-stages.md) (also the source table shape and the send-check order), enforced in `lib/guard.ts`.
- Contact waterfall, cheapest first: [waterfall](../.claude/skills/find-contact/references/waterfall.md).
- Verification, only `ok` is sent: [verifiers](../.claude/skills/verify/references/verifiers.md).
- Qualify gates, phishing signs, evidence lines: [gates](../.claude/skills/qualify/references/gates.md).
- Score = fit × trigger, rank not score: [scoring](../.claude/skills/score/references/scoring.md).

## Sources and signals
- Signals tested and verdicts, plus the signal table approach: [signals](../.claude/skills/source-signals/references/signals.md), [job boards](../.claude/skills/source-signals/references/ats.md).
- Technology search: [fingerprints](../.claude/skills/source-tech/references/fingerprints.md), [HTTP Archive](../.claude/skills/source-tech/references/httparchive.md), [urlscan](../.claude/skills/source-tech/references/urlscan.md), [funnel numbers](../.claude/skills/source-tech/references/funnel.md).
- Registers: [what worked](../.claude/skills/source-registers/references/registers.md), [adapter template](../.claude/skills/source-registers/references/adapter-template.md).
- People search: [Apollo free search](../.claude/skills/source-people/references/apollo.md).
- Social: [viral posts](../.claude/skills/source-social/references/viral-posts.md), [commenters](../.claude/skills/source-social/references/commenters.md), [Apify actors](../.claude/skills/source-social/references/apify-actors.md), [activity research](../.claude/skills/activity-research/references/comments-research.md).

## Channels
- How the plan picks channels: [channel picker](../.claude/skills/plan/references/channels.md).
- Non-obvious channels (doc-share, commenters + activity research, tech search, registers with emails, Apollo + domain guess, partners, job posts): [non-obvious channels](../.claude/skills/plan/references/non-obvious-channels.md).
- Partners and introducers: [partner channels](../.claude/skills/plan/references/partner-channels.md).
- Doc-share details: [doc channel](../.claude/skills/first-lines/references/doc-channel.md).
- Email plus call, LinkedIn by hand, SMS: [email and call](../.claude/skills/outreach-review/references/email-and-call.md).

## Writing
- Cold-email copy, subject lines, sequence timing, banned phrases, variants: [copy rules](../.claude/skills/first-lines/references/copy-rules.md). Your voice: [voice.md](voice.md).

## Sending and replies
- Sending infrastructure (no cold from the main domain, SPF/DKIM/DMARC, 2–3 mailboxes per domain, 20–30 a day, warm-up, verification, Zapmail): [sending infra](../.claude/skills/outreach-review/references/sending-infra.md).
- Stop-loss table: [stop-loss](../.claude/skills/outreach-review/references/stop-loss.md).
- Reply classes and who handles them: [reply rules](../.claude/skills/outreach-review/references/reply-rules.md).

## Compliance (not legal advice)
- Email (GDPR, PECR, CAN-SPAM, bulk-sender rules, other markets): [compliance](../.claude/skills/outreach-review/references/compliance.md).
- Social sources and LinkedIn: [social compliance](../.claude/skills/source-social/references/compliance.md).
- Partner fees: [partner channels § Compliance](../.claude/skills/plan/references/partner-channels.md).

## Tools and prices
One place: [tools.md](tools.md).
