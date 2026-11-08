# Public job-board endpoints (no key)

| ATS | Endpoint | Date field |
|---|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true` | `first_published` (also `updated_at`) |
| Lever | `https://api.lever.co/v0/postings/<company>?mode=json` | `createdAt` (ms since epoch) |
| Ashby | `https://api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=false` | `publishedAt` |
| BambooHR | `https://<company>.bamboohr.com/careers/list` | `datePosted` where shown |

`<board>` is the slug in the careers URL (e.g. `boards.greenhouse.io/acme` → `acme`). These are the public endpoints
the job boards serve to every visitor; still keep requests few and slow. Confirm field names with one live call
before parsing many (the author's dates came from these fields, measured 2026-10-29).

Age = today − original date. "Open 30+ days" or "first <role> hire" in the text are the strongest framings.
