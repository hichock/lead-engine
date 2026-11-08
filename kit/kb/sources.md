# Sources

Status: living. One row per source. Skills update **Last run** and **Yield to date** after every run
(rows in → kept, and how many reached `ok` contacts / sent / positive replies when known).
Caps here mirror Settings → Caps; the app enforces Settings. Author's figures are labelled with their dates;
replace them with yours.

## Discovery and enrichment
| Source | Gives | Access / cost | Cap per run day | On | Last run | Yield to date | Notes |
|---|---|---|---|---|---|---|---|
| HTTP Archive (BigQuery) | every CrUX site + Wappalyzer techs + rank | free 1 TB/mo; `GCP_SA_KEY` | 30 GB, 200 GB per query | yes | - | - | Author: Softr 442 / Airtable 1,603 / Bubble 2,159 domains per crawl at 2.9 GB a query (measured 2026-11-03) |
| urlscan.io | pages loading a tool's host, last 30 days | free key, 1,000 searches/day | 200 searches | yes | - | - | Author: ~170 Softr sites per 30 days (measured 2026-10-31) |
| Reverse IP (HackerTarget) | hosts on one IP | free 499 rows; paid coverage unverified | - | no | - | - | Optional |
| Registers (e.g. a bar directory) | name, firm, address, sometimes the member's own email | free; check the register's licence | - | per adapter | - | - | Author: 2,568 rows → 25 queued (measured 2026-11-04) |
| Apollo people search | first name, title, firm (no email) | free, 50/min; `APOLLO_API_KEY` | 20 pages | yes | - | - | Author: 148 people → 25 queued (measured 2026-11-04) |
| Apify actors | LinkedIn comments, posts, profile activity | pay per result; `APIFY_TOKEN` | $0 until set | no | - | - | See source-social references |
| Monid | Hunter, ContactOut and more, pay per call | `MONID_API_KEY`, $1 free credit | $1.50 | yes | - | - | Fallback finder and verifier |
| MillionVerifier | deliverability: ok / catch_all / unknown / invalid | ~$0.0037/check on packs | 80 checks | yes | - | - | Only `ok` is sendable |

## Monthly cap
All paid sources together: $30 (bundle default). Change in Settings → Caps.

## Scheduled pulls (app cron, no model)
`settings.cron_jobs` (written by `source-tech`): urlscan queries run daily for the newest day.
| Tool | urlscan query | Since |
|---|---|---|
| - | - | - |

## Sending
| Item | Value |
|---|---|
| Sending domains (never the main domain) | needs input |
| Mailboxes (count, provider) | needs input |
| Daily cap per mailbox | 15 (bundle default; 10 for a week after a rename) |
| New leads per day, all mailboxes | 15 (bundle default) |
| Opt-out line | on |
| Warm-up | needs input (keep it running while sending) |
| SPF / DKIM / DMARC checked | needs input |
