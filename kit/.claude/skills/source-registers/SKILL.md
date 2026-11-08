---
name: source-registers
description: ALWAYS use this skill when the owner wants leads from a public register or directory ("lawyers in Florida", "bar directory", "accountants register", "Companies House", "state licence list", "dentists register", "a list of firms in <profession> in <city>"). It builds or reuses a small adapter per register, keeps only firms with a website, takes emails only where the register publishes them, and writes companies and people idempotently. Do not scrape a register ad hoc; use this skill.
---
# Find companies in public registers

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` and `kb/sources.md` first. Then `references/registers.md`
(adapters we know, yields, licence checks) and `references/adapter-template.md` (how to write a new one).

## 1. Pick the register
- From `kb/icp.md`: profession, country, region. Prefer a register that lists **the firm's website** and, best of
  all, **the member's own email** (author's runs: a bar directory with member emails beat every paid database for
  small firms, 54–73% of checked addresses `ok`, measured 2026-11-04/05).
- **Licence first.** Open the register's terms. If they ban marketing use or bulk reuse, stop and tell the owner.
  Write the verdict in `kb/sources.md` (row per register) and `kb/decisions.md`.

## 2. Adapter (one per register, kept in the repo)
- Look for `scripts/registers/<name>.py` or `.mjs`. If none, write one from `references/adapter-template.md`:
  plain HTTP with a normal browser User-Agent, one page at a time, a pause between pages, a hard page limit.
- Inputs: profession / practice area, city list, max pages. Output JSON lines:
  `{register_id, name, firm, city, country, website, email, phone, source_url}`.
- Never log in, never solve captchas, never bypass a rate limit. If the register blocks, stop and report.
- Decode emails only where the page itself shows them to every visitor (for example an obfuscated `data-cfemail`
  attribute that the browser decodes). That is still the register publishing the email.

## 3. Run small first
```bash
python3 scripts/registers/<name>.py --area "<practice area>" --cities "Miami,Tampa" --pages 2 > /tmp/reg.jsonl
wc -l /tmp/reg.jsonl
```
Check 10 rows by hand: right profession, right city, website present.

## 4. Keep only what can qualify
- Firm website present (or a domain from the email that is not a free mailbox like gmail.com).
- Drop role addresses for people rows (`info@`, `office@`, `admin@`, `contact@`, `reception@`, `intake@`), but
  keep the company.
- Drop firms over the size bands in `kb/icp.md` if the register shows size.
- One company per domain. Several members of one firm → one company, several people.

## 5. Write
```bash
# companies: {"domain","name","country","source":"register:<name>"}
# signals:   {"domain","kind":"register","value":"<register> listing, <practice area>","url":"<source_url>"}
# people:    {"domain","name","role","email"}   (email only if the register published it; never guessed here)
node scripts/le.mjs ingest /tmp/reg-rows.json
```
People written here are `unverified`. `qualify` runs next, then `verify` (register emails still need a check).

## 6. Personal data
Register entries are personal data under GDPR in the UK/EU. Keep only what the first email needs, note the source
for the Art. 14 notice ("I found you in the <register>"), and honour objections at once (`suppression`).

Write `kb/runs/<YYYY-MM-DD>-source-registers.md` (register, filters, rows in → companies/people written, licence
verdict) and update `kb/sources.md` yields for that register's row.
