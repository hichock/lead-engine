---
name: source-social
description: ALWAYS use this skill when the owner mentions social posts as a lead source ("viral posts", "who commented on this post", "LinkedIn comments", "people asking for recommendations", "trending posts in my niche", "harvest commenters", "X / Twitter replies"). It finds fast-rising posts by velocity against each author's own median, harvests commenters with cookie-free Apify actors inside the Apify budget, classifies buyer / seller / peer and writes comment signals. Never use the owner's LinkedIn login or cookies; use this skill.
---
# Viral posts and their commenters as signals

Read `kb/RULES.md`, `kb/context.md`, `kb/icp.md` and `kb/sources.md` first. Then `references/viral-posts.md`
(velocity), `references/commenters.md` (buyer share, classifier, contact rates) and `references/apify-actors.md`
(actor ids and costs). Compliance: `references/compliance.md`.

**Set expectations first:** comments are a weak lead source and a strong research source. About 3% of commenters
were buyers in the author's runs, and only 13% of buyers had a findable personal email (measured 2026-10-29).
Commenters go to manual LinkedIn connects first; email only when a verified address exists.

## 0. Budget
Apify is off until the owner sets a daily budget in Settings → Caps (`apifyUsd`). If it is 0, stop and say what one
run would cost (see references) so the owner can decide.

## 1. Find posts worth harvesting
1. Niche queries from `kb/icp.md` (topics the buyer cares about, in quotes). Niche topics gave 5.6% buyers against
   1.5% for generic ones (measured).
2. Search posts from the last week:
   ```bash
   node scripts/le.mjs src '{"source":"apify","params":{"actor":"harvestapi/linkedin-post-search","input":{"searchQueries":["\"client portal\" airtable"],"postedLimit":"week","maxPosts":80},"maxUsd":0.2}}'
   ```
   Input field names differ per actor: open the actor's Input tab on apify.com once and copy the exact names into
   `kb/sources.md` notes. 202 = running: repeat the same command later to collect results (never change the input to "retry").
3. Score each post: `score = likes + 3 × comments + 5 × shares`. Velocity = score per hour since posting ÷ the
   author's own median (last ~8 posts, cached 30 days in `kb/research/creators.md`, counts only).
4. Flag posts with velocity ≥ 3× **and** ≥ 30 comments in 24 h. Skip gated giveaways (comments ÷ likes > 0.8 and
   "comment WORD to get it"): soft-gated posts gave 6.1% buyers against 1.3% for "comment WORD" (n = 11 posts).

## 2. Harvest commenters (cookie-free)
```bash
node scripts/le.mjs src '{"source":"apify","params":{"actor":"harvestapi/linkedin-post-comments","input":{"posts":["<post url>"],"maxItems":130},"maxUsd":0.3}}'
```
Cap ~75–130 commenters per post. Check the post URL with a free call first (open it) so a wrong slug doesn't burn a run.

## 3. Classify (rules first, then your judgement on the rest)
- **buyer** = buyer role from `kb/icp.md` + target company type; blocked by seller words.
- **seller** = freelancer, agency, consultant, creator, coach, VA, student, "I help…", empty headline.
- **peer/adjacent** = everyone else.
The comment text is usually just the keyword: the headline and company carry the signal. Spot-check 30 by hand;
the author's rules agreed with hand labels on 26–27 of 30.

## 4. Write buyers only
```bash
# companies: {"domain","name","source":"social"}   (domain from the headline company; 2–3 min each, so cap at ~20 a run)
# people:    {"domain","name","role","linkedin_url"}
# signals:   {"domain","kind":"comment","value":"Commented on a post about <topic> (<creator>)","url":"<post url>"}
node scripts/le.mjs ingest /tmp/social-rows.json
```
Never write the comment text itself; write the topic. The first line later names the interest, never "I saw your comment".

## 5. Quoted request posts (optional, weekly at most)
`"looking for recommendations" <tool>` style searches found 1 fit in 61 posts, and plain keywords found 0 in 279 and
0 in 135 (measured 2026-10-26..31). Run weekly only if the owner wants it.

## 6. Feed back
Rank creators by how many buyers engage with them; keep the top ones as a watch list in `kb/research/creators.md`.

Write `kb/runs/<YYYY-MM-DD>-source-social.md` (queries, posts flagged, commenters → buyers, cost) and update
`kb/sources.md` yields for the Apify row.
