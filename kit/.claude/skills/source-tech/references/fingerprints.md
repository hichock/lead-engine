# Tool fingerprints (what to search for)

Labels: measured = the bundle author's runs (date); sourced = named source (date). Re-check a fingerprint on 2–3 live
sites before a big run: vendors change hosts.

| Tool | Fingerprint | Notes |
|---|---|---|
| Softr | `assets.softr-files.com`; custom domains A → 35.158.87.123; `*.softr.app` | Every Softr page carries "AIRTABLE" in a generic config, so that string does not prove an Airtable backend (measured 2026-10-31) |
| Airtable | `airtable.com/embed/app…/shr…`; requests to airtable.com | Base ID visible; 7 of 14 static in HTML. Phishing pages use it too. 5 sites leaked Airtable personal access tokens in page JS: treat as a heads-up to the owner, never copy or use (measured 2026-10-31) |
| Bubble | `*.bubbleapps.io`; Wappalyzer "Bubble" in HTTP Archive | Tab titles like "Bubble \| No-code apps" are visible on live apps |
| Glide | `*.glide.page` | Sparse in urlscan: use HTTP Archive or Common Crawl |
| Memberstack (on Webflow) | `memberstack.com` | About half are SMB sites (measured 2026-10-31) |
| Make / Zapier | `hook.eu1.make.com`, `hook.us1.make.com`, `hook.eu2.make.com`, `hooks.zapier.com` | Rare but precise. A webhook fired on every page view is a cost fact worth naming |
| GoHighLevel | `leadconnectorhq.com`, `msgsndr.com`; CNAME `sites.ludicrous.cloud` | High volume, tiny local firms; poor fit for offers above ~$2k (assumed) |
| Clay, Monday, ClickUp | no public fingerprint | Use job posts (source-signals) |

## Reverse IP (optional)
Softr custom domains point at one IP (35.158.87.123). 8,262 hosts on that IP; 64 of 597 visible were `portal.` or
`admin.` subdomains (measured 2026-10-31). HackerTarget free tier returns up to 499 rows; whether its $10/mo
membership covers more for reverse IP is unverified. RapidDNS shows 100 without login.
```bash
node scripts/le.mjs src '{"source":"reverseip","params":{"ip":"35.158.87.123"}}'
```
(Switch the source on in Settings first and add `HACKERTARGET_API_KEY`.)

## Common Crawl (skip unless needed)
Free byte-range reads of `cluster.idx` give `*.softr.app`, `*.glide.page`, `*.bubbleapps.io` names: 257 / 242 / 149 per
crawl, low precision (demos, personal) (measured).

## Paid alternatives (none needed to start) - sourced 2026-10-31
BuiltWith lists from $295/mo (and misses subdomain portals: Softr 0 of 5 in a test), Wappalyzer $250/mo, PublicWWW
$79/week (HTML-source search; buy one week only if the backlog runs dry), TheirStack (tech from job posts) $109 per 1k
companies, Store Leads $75/mo. The BuiltWith Apify actor (`builtwith/builtwith-official-technology-scraper`,
$0.002/domain) caught Airtable 3/3 and GoHighLevel 2/2 but Softr 0/5 on apex domains: enrichment only.
