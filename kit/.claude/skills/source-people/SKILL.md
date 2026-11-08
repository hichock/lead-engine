---
name: source-people
description: ALWAYS use this skill when the owner wants people by job title rather than companies by signal ("find operations managers at small logistics firms in Austin", "decision makers in <city>", "Apollo search", "people search", "founders of 10-50 person agencies"). It uses Apollo's free people search (no credits), guesses and checks each firm's domain, scans the site for the person and the email pattern, and writes unverified people. Do not buy Apollo credits or call people/match; use this skill.
---
# Find people by title (Apollo free search → domain → site scan)

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` and `kb/sources.md` first. Then `references/apollo.md`.

## 1. Search (free, 100 per page, capped per day in Settings)
```bash
node scripts/le.mjs src '{"source":"apollo","params":{"titles":["operations manager","practice manager"],"keywords":"logistics","employeeRanges":["11,50"],"locations":["Austin, Texas, United States"],"page":1}}' > /tmp/apollo-1.json
```
- Titles and keywords from `kb/icp.md`. A **city** in `locations` widens results; regional towns come back empty.
- Results have a first name, an obfuscated surname (`Pa***r`), title and firm name. No email, no domain.
- Next page = same command with `"page":2`. Stop when a page adds few new firms.

## 2. Guess and check the domain (free)
For each firm:
1. Clean the name: drop "Ltd", "LLC", "Pty Ltd", "Inc", "&", punctuation. Try `<name>.com` and the country TLD
   (`.co.uk`, `.com.au`, `.ca`), with and without hyphens.
2. `curl -sL -m 12 -A "Mozilla/5.0" https://<guess>/ | grep -i -o "<title>[^<]*"`; accept when the title or page
   names the firm. Author's hit rate: about 60% in Australia (measured 2026-11-04).
3. No match → web search "<firm> <city>" and take the official site. Still nothing → drop the firm.

## 3. Scan the site (free)
Fetch `/`, `/about`, `/team`, `/contact` (and `/our-team`, `/people`). Look for:
- the surname that matches the obfuscated one (first and last letters + length), to complete the name;
- any visible email to learn the pattern (`first@`, `first.last@`, `flast@`);
- one copy fact about their system (a portal, a booking tool, a form that posts to a tool) for the evidence line.

## 4. Write (people stay unverified; companies go to qualify)
```bash
# companies: {"domain","name","country","source":"apollo"}
# people:    {"domain","name","role","email"}   email = only a pattern guess from step 3, or a visible address
# signals:   {"domain","kind":"tech","value":"<tool seen on site>"}  (if any)
node scripts/le.mjs ingest /tmp/people-rows.json
```
Pattern guesses are often wrong (11 of 15 guesses were invalid in one author batch, measured 2026-11-03): `verify`
decides. Do not pay for a finder here; `find-contact` does that only after `qualify`.

## 5. Report
Searched (pages), firms found, domains matched, people written, next step (`qualify`).

Write `kb/runs/<YYYY-MM-DD>-source-people.md` (filters, pages, firms → domains → people) and update `kb/sources.md`
yields for the Apollo row.
