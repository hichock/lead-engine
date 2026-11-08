# Apollo free people search

Endpoint (the app calls it; keys stay on the server): `POST https://api.apollo.io/api/v1/mixed_people/api_search`
with header `x-api-key`. Body fields: `person_titles[]`, `q_keywords`, `organization_num_employees_ranges[]`
(e.g. `"11,50"`), `person_locations[]`, `page`, `per_page` (100). Free; rate limit about 50 a minute (measured).

## What it returns
First name, obfuscated surname (`Pa***r`), title, organisation name, sometimes city and LinkedIn URL.
**No email and no domain.** "Company search" and `people/match` / enrichment **cost credits**: the app never calls them.

## Numbers from the author's runs (measured 2026-11-04..06)
- 148 people → 61 live sites → 25 queued.
- 573 people → 13 queued.
- Domain guess (name minus "Pty Ltd" + ccTLD, curl, title match): about 60% hit rate in Australia.
- A city in `person_locations` widens results; regional towns came back empty.

## Pipeline
guess the domain → scan `/`, `/about`, `/team`, `/contact` (surname, email pattern, one copy fact) → verify `first@`
(or the pattern seen on the site) → only `ok` goes on.

## When not to use it
To discover companies by need. Title search finds people, not buying signals: pair it with a signal (tech, job post,
register) or the fit will be thin. For the person at a known company, LinkedIn profile search via Apify is another
option (see source-social references), but 18 of 47 profiles in one test were sellers (measured).
