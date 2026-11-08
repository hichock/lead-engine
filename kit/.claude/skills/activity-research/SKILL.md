---
name: activity-research
description: ALWAYS use this skill when the owner wants to understand a prospect before writing ("research this person", "what are they into", "what do they post or comment about", "which offer fits them", "personalise for <name>") or when first-lines needs an offer pick for a high-score lead with a LinkedIn URL. It reads the prospect's own public comments and reactions once (cookie-free Apify actors, inside the Apify budget), summarises topics, creators and tools, and picks the offer key from kb/offer.md. Never use the owner's LinkedIn session.
---
# Research a prospect's own activity, once

Read `kb/RULES.md`, `kb/context.md`, `kb/offer.md` (offer keys) and `kb/icp.md` first. Then
`references/comments-research.md`.

**Why:** scraping 11 prospects' own comments and likes gave 782 items for about $1.60, and for 9 of the 11 a
different offer fit better than the post the author had found them on (measured 2026-11-06).

## 1. Who
High-score people with a LinkedIn URL and `interests` still empty (`node scripts/le.mjs read to-write limit=20`, then
filter). One run per person, ever: the ledger refuses the same input inside 24 h, and you store the summary.
Apify budget must be above 0 in Settings; one prospect costs about $0.15 (assumed from list prices: $2/1k each).

## 2. Pull (comments + reactions)
```bash
node scripts/le.mjs src '{"source":"apify","params":{"actor":"harvestapi/linkedin-profile-comments","input":{"profiles":["<linkedin url>"],"maxItems":60},"maxUsd":0.15}}'
node scripts/le.mjs src '{"source":"apify","params":{"actor":"harvestapi/linkedin-profile-reactions","input":{"profiles":["<linkedin url>"],"maxItems":60},"maxUsd":0.15}}'
```
Copy exact input field names from each actor's Input tab once. 202 = running: repeat the same command later.

## 3. Summarise (no raw text stored)
From all items, write a short structure:
```json
{"topics":["client portals","hiring ops staff"],"creators":["<creator name>"],"tools":["Airtable","Zapier"],
 "pains":["slow reporting"],"checked_at":"2026-11-09","n_items":64}
```
Then pick the offer key from `kb/offer.md` that fits **all** the activity, not only the post where you found them.

## 4. Write
```bash
node scripts/le.mjs ingest '{"people":[{"domain":"acme.example","email":"dana@acme.example","interests":{...},"offer_key":"portal-rebuild"}]}'
```
(Use the person's email as the key when they have one; otherwise name + domain.)

## 5. Rules for using it
- The opener names the interest, never "I saw your comment / like".
- Store topics and tools, not quotes. No screenshots, no comment text in `kb/`.
- Count how many buyers engage with each creator; keep the top creators in `kb/research/creators.md` (counts only).
  That list feeds `source-social` (watch list).

Write `kb/runs/<YYYY-MM-DD>-activity-research.md` (people researched, items read, offer picks changed, cost) and
update `kb/sources.md` yields for the Apify row.
