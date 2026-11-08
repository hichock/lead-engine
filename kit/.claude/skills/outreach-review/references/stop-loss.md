# Stop-loss (set before launch)

Generic vendor thresholds (sourced) plus the author's own rule (measured rule 2026-11-06).

| Trigger | Action |
|---|---|
| Bounce rate > 2% on a campaign or mailbox (best < 1%) | Pause, re-verify the list. Stop at 3%. |
| Inbox placement < ~70% on a mailbox or domain (seed test) | Out of rotation, back to warm-up |
| Spam complaints near 0.1% (never 0.3%) | Pause, cut volume, review targeting and copy |
| Sending domain on a major blocklist | Stop sending from it; delist or retire it |
| Reply rate < ~1% after 300+ sends | Stop: targeting or offer is wrong |
| Author's rule | Judge a variant at ≥ 30 delivered, and only after follow-up 1 |

Monitor weekly: a placement seed test, Google Postmaster Tools, blocklists. Daily: bounces per mailbox.

## Honest context
The author's own sender: 119 verified first emails, 0 bounces, **0 human replies** to 2026-11-06 (follow-up 1 only
started on 2026-11-09). 54 cold Gmail emails: 0 replies. A warm community batch: 1 reply in 40 minutes (measured).
That is why this bundle ships stop-loss and kill rules and promises no rates.
