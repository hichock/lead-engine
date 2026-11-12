# Tools: what each one is for, where to sign up, what it costs

Status: filled (bundle defaults, checked 2026-11-09; links checked 2026-11-12). The one place the setup and every skill take tool links and
prices from. Do not copy a link or a price into another file: link here.

Disclosure: three sign-up links below are referral links of the bundle's author (lowcoding.dev): Apify, Zapmail and
Smartlead (the ones with `fpr=`, `ref=` or `via=`). You pay the same; the author may get a commission. Every other
link is the provider's plain site. **Plain URL** is the provider's own sign-up or pricing page, without referral.

Labels: `sourced` = the provider's page on the date shown; `3rd-party` = a review or directory site;
`measured` = the bundle author's own runs. Prices change: check the provider before paying.

## Data sources and verification
| Tool | Used for | Mode | Sign up | Plain URL | Free tier / price | Known discount or credit | Label, date |
|---|---|---|---|---|---|---|---|
| urlscan.io | Sites that load a tool's code (last 30 days); daily pulls | all | urlscan.io | https://urlscan.io/user/signup | Free API plan; paid plans with a 30-day trial | none found. Free tier may be non-commercial (two 3rd-party sources): read their terms before relying on it for a business | sourced + 3rd-party, 2026-11-09 |
| Google Cloud (BigQuery for HTTP Archive) | The biggest free tech search, monthly | all | cloud.google.com | https://console.cloud.google.com/freetrial | BigQuery: 1 TB of queries a month free; one crawl export about 3 GB (measured 2026-11-03) | $300 credit for new Google Cloud customers | sourced, 2026-11-09 |
| MillionVerifier | Email verification; only `ok` is sent | all, before sending | millionverifier.com | https://app.millionverifier.com/signup | about $0.0037 a check on packs (author's figure, to confirm); credits never expire | trial credits (100 to 500, sources differ); bonus credits in the first week (Welcome promotion); +1M free per 5M bought | sourced + measured, 2026-11-09 |
| Monid | One key for Hunter, ContactOut and other providers, pay per call | all, optional | monid.ai | https://monid.ai | pay per call, e.g. Hunter verify $0.012, ContactOut email $0.10 when found (measured 2026-11-03/04) | free starting credit: $1 (author, 2026-11-08) or $3 (3rd-party listings) | measured + 3rd-party |
| Apollo | Free people search by title (no emails, no credits used) | all, optional | apollo.io | https://app.apollo.io/#/signup | free plan; the bundle calls only the free search | none for users | sourced, 2026-11-09 |
| Apify | LinkedIn comments, profile activity, ads (cookie-free actors) | all, optional, off until a budget is set | https://www.apify.com?fpr=ujogj | https://console.apify.com/sign-up | free plan with $5 of usage a month; Starter $19/mo | 10% off annual; students 50% off; startups 30% off Scale | sourced, 2026-11-09 |
| Hunter | Email finder and verifier (the bundle reaches it through Monid) | optional | hunter.io | https://hunter.io/users/sign_up | free plan; paid plans monthly | none found | sourced, 2026-11-09 |
| Prospeo | Email finder. **Not built into the bundle**: its "verified" came back catch_all on MillionVerifier for 5 of 10 (measured 2026-11-03) | not used | prospeo.io | https://prospeo.io | free 75 a month (some sources say 100); Starter $39 for 1,000 credits | none found | 3rd-party, 2026-11-09 |
| HackerTarget | Reverse IP (hosts on one IP), optional | optional, off | hackertarget.com | https://hackertarget.com/scan-membership/ | free: 50 calls a day per IP, 500 lines of output | none | sourced, 2026-11-09 |

## Hosting and database (mode A: app on Supabase + Vercel)
| Tool | Used for | Mode | Sign up | Plain URL | Free tier / price | Known discount or credit | Label, date |
|---|---|---|---|---|---|---|---|
| Supabase | Database, sign-in, pg_cron for the frequent jobs | A (or your own Supabase in B) | supabase.com | https://supabase.com/dashboard/sign-up | free plan (projects pause after a week idle, which stops sending); Pro from $25/mo | none (no referral program found) | sourced 2026-11-08 |
| Vercel | Hosts the app and the API the skills call | A | vercel.com | https://vercel.com/signup | Hobby free for personal, non-commercial use; Pro $20 per user/mo | none (referral credits ended 2026-07-15) | sourced + 3rd-party, 2026-11-09 |
| GitHub | Private repo for the app, skills and kb; optional Actions runner | all | github.com | https://github.com/signup | free private repos | none | sourced |

## Sending (mailboxes, domains, warm-up)
| Tool | Used for | Mode | Sign up | Plain URL | Free tier / price | Known discount or credit | Label, date |
|---|---|---|---|---|---|---|---|
| Zapmail | Secondary domains and Google or Microsoft mailboxes, by API and MCP | all, before sending | https://zapmail.ai/?ref=lowcoding | https://zapmail.ai/pricing | Starter $39/mo with 10 mailboxes (add-on $3.50), Growth $99 (30), Pro $299 (100); pre-warmed Starter $39 first month then $24 (measured 2026-11-03..08); at most 5 mailboxes per domain; no free trial | yearly billing = 2 months free; seasonal coupons (one was live 2026-11-09) | sourced, 2026-11-09 |
| ZapWarm | Warm-up for Zapmail mailboxes | optional | inside Zapmail | https://zapmail.ai | first month free, then $2 per mailbox a month | first month free | sourced 2026-11-08 |
| Google Workspace (direct) | Mailboxes you own fully (tenant, billing, reputation) | alternative | workspace.google.com | https://workspace.google.com | per user per month (see Google) | none checked | - |
| Namecheap | Registrar for domains Zapmail can't buy (e.g. .co.uk) | optional | namecheap.com | https://www.namecheap.com | per domain | promo codes vary | sourced, 2026-11-09 |
| Porkbun | Registrar with an API; .co.uk about $5.66 a year | optional | porkbun.com | https://porkbun.com | per domain | none (its affiliate program was discontinued) | sourced, 2026-11-09 |

## Sequencers (only if the owner prefers one to the own sender)
| Tool | Used for | Mode | Sign up | Plain URL | Free tier / price | Known discount or credit | Label, date |
|---|---|---|---|---|---|---|---|
| Instantly | Sequencer; import the "For a sequencer" CSV | optional | instantly.ai | https://instantly.ai | paid plans | none found | sourced, 2026-11-09 |
| Smartlead | Sequencer; API and webhooks only on Pro ($94/mo; Base $39 has none) | optional | https://smartlead.ai/?via=lowcoding | https://www.smartlead.ai | paid plans | none found | measured 2026-11-03, sourced 2026-11-09 |
