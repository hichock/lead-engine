# Registers: what worked (author's runs)

measured = the bundle author's runs (date). Check every register's own terms before use.

| Register | Gives | Access | Yield | Verdict |
|---|---|---|---|---|
| The Florida Bar member directory | name, firm, address, phone, the member's own email | free, plain HTTP; search by city + practice area, 50 per page | Batch 1: 2,568 rows → 25 queued; batch 2: 2,455 → 12 + 11 spare; 54–73% of checked addresses `ok`; $0 apart from verification (measured 2026-11-04/05) | **core where it exists** |
| Texas Bar | name, firm, sometimes a site link, no email | free | 1 in 3 rows has a site (measured 2026-11-05) | name source only |
| Companies House (UK) | company number, name, status, SIC, officers, filing dates | free API key; 600 requests / 5 min (sourced) | New firms: 310 new ad agencies in a week, no revenue yet (measured) | name source; officer data is personal data |
| SEC Form D (US) | private fundraises | free | 1,459 a week; 29 of 40 were funds (measured 2026-10-31) | low |

## Florida Bar pattern (generic lessons for any directory)
- Search URL takes city, practice area, eligible-only flag, page number and page size. Stop when a page returns fewer
  rows than the page size.
- Each result block holds the name and member number, a contact block (firm on the first line, address after),
  a phone link and an obfuscated email attribute that the page decodes for every visitor.
- After the pull, filter out role addresses and shuffle before sampling, then fetch each firm's site (home page,
  `/about`, `/team`, `/contact`) and record which intake tools it runs (forms, chat widgets, booking, practice
  software). Those become signals and the evidence line.

## Why registers beat paid databases for small firms
Paid databases cover small local firms poorly (generic practice, sourced). A register lists every licensed member
and often the member's own address. Bought lists are the opposite: in other teams' campaigns they bounced above the
2% stop-loss line and produced no positive replies (sourced, generic).

## Licence checks (examples of what to look for)
- "May not be used for commercial solicitation / marketing" → stop.
- Open Government Licence or similar → fine with attribution.
- No terms → ask the owner; note it as `assumed` risk in decisions.md.
