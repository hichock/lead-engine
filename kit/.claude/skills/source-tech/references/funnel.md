# What a tech-search funnel looks like (author's runs)

Use these to sanity-check your own runs, not as promises. measured = the bundle author's runs.

| Run | Screened | Qualified | Sendable / queued | Spend |
|---|---|---|---|---|
| urlscan batch 2026-11-03 | 420 hosts → 370 | ~55 shortlist → 15 | 8 `ok` (11 of 15 pattern guesses invalid) | Prospeo 14 credits, MillionVerifier 41 |
| HTTP Archive batch 2026-11-03 | ~260 | 71 | 40 (about half the domains catch_all) | BigQuery 150–190 GB (double-billed), MV ~110 |
| Daily run 2026-11-05 | ~2,960 domains | ~110 researched | 30 `ok` → 25 queued; 19 catch_all kept for retry | MV 59, Monid $0.38, BigQuery 21 GB |
| Daily run 2026-11-06 | ~3,000 | ~40 | 24 queued (11 passed on Hunter "valid" where MV said catch_all: watch bounces) | MV 52, Monid $0.67, BigQuery 25.9 GB |

**Drop reasons on the 370 (approx., 2026-11-03):** phishing/parked ~60, personal/demo ~120, nonprofits/schools ~45,
big enterprises ~10, competitors ~8, no static evidence ~70, SaaS whose product is the no-code app ~20.

**Daily shape:** ~3,000 domains screened → ~110–170 pages checked → 24–25 queued, for about $0.40–0.70 of Monid,
50–60 MillionVerifier checks and 21–26 GB of BigQuery (measured 2026-11-05/06).

**Replies:** none of this predicts replies. The author's own sender got 0 human replies from 119 first emails to
2026-11-06 (follow-ups had just started). Judge your sources on positive replies, not on volume.
