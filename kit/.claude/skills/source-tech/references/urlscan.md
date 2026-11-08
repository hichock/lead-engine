# urlscan.io

**What:** public scans of pages, searchable by any host a page loaded. A free key sees the last 30 days and allows
1,000 searches a day (sourced). A search returns at most 100 results on the free tier, so cut the 30 days into
3-day slices (the app does this with `"slices": true`, 10 searches).

## Queries
| Tool | Query |
|---|---|
| Softr on custom domains | `domain:softr-files.com AND NOT page.domain:softr.app` |
| Airtable embeds | `domain:airtable.com AND NOT page.domain:airtable.com` |
| Memberstack | `domain:memberstack.com AND NOT page.domain:memberstack.com` |
| Make webhooks | `domain:hook.eu1.make.com OR domain:hook.us1.make.com` |
| Zapier hooks | `domain:hooks.zapier.com` |
| GoHighLevel | `domain:leadconnectorhq.com` |
Date slice syntax the app adds: `AND date:[now-6d TO now-3d]`.

## Numbers from the author's runs (measured 2026-10-31)
Sites per 30 days: Softr 169, Airtable 125, Memberstack 131, Make hooks 15, Zapier hooks 6. About 1 in 4 Softr sites
was a real business; ~10 of 169 were phishing. A later batch (2026-11-03): 420 hosts → 370 after cleaning → ~55
shortlisted → 15 leads → 8 with an `ok` address (11 of 15 pattern guesses were invalid).

## Pitfalls
- `search_after` paging worked for HighLevel but not for Softr: rely on date slices.
- Free keys only see 30 days: run daily (the app cron does) so nothing falls out of the window.
- Phishing kits load real tool hosts. `qualify` must drop them.
- Check urlscan's terms for commercial use on the free tier before scaling (assumed risk, not checked).
