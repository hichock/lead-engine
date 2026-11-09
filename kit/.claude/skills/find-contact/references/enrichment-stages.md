# Enrichment stages and the source table (generic practice)

Adapted from a lead-generation handbook's generic rules (sourced 2026-11) and the bundle author's runs. Client-specific
facts are left out on purpose.

## The rule for any stack
Discover from cheap or open sources → qualify (fit, size) from the website → pay for contacts only on qualified
companies, preferring pay-per-verified finders → verify right before sending. Enriching before qualifying burns
credits (a marketplace-enrichment test ran out of free credits on firms that never fit, sourced). This app enforces
the order in code (`lib/guard.ts`).

## Source table shape (one row per source, in kb/sources.md)
| Source | What it gives | Coverage / counts | Cost and licence | How to match | Status |
Coverage is measured by you (date); cost and licence are sourced from the provider; status says core / test / stopped.
A row without a licence check is not "core".

## Stages
| # | Stage | What happens |
|---|---|---|
| 0 | Intake | Source rows into companies, idempotent by domain (or register id) |
| 1 | Identity | One company per domain; a register match counts only on name + postcode or city, never name alone |
| 2 | Core facts | From free sources (register, site, fingerprints), each stored with source, method and date |
| 3 | Backup path | Paid lookups only for fields still empty, only for rows that passed the free checks, capped per run |
| 4 | Derive | Size band, gates, signals, score + why |
| 5 | Store and show | One fact per field with its source; the Company page shows the evidence |
| 6 | Refresh | Re-verify emails older than about 2 weeks before sending; re-check the evidence on the day of writing |
| 7 | Calibrate | Write every reply class back per source and signal; the weekly review ranks by positive replies |

Industry or category: take it from the most reliable source first (a sector register, then the company register's
code, then the site), and keep the source and a confidence with it.

## Send checks, in this order (app: lib/sender/checks.ts)
duplicate in the batch → suppressed (email **and** domain) / already contacted / client → competitor or excluded
segment → not qualified → verifier not `ok` → no evidence line → empty subject or over 90 words.

## Estimates
A real figure always beats an estimate. Keep the method and inputs with every derived number, store a range, and use
bands and rank order in conversation, not a single number.
