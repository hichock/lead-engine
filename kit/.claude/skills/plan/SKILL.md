---
name: plan
description: ALWAYS use this skill at the start of setup, and whenever the owner asks "what's the plan", "which channels should we use", "research my company / niche / competitors", "how much will it cost", "how long until results", "show me the dashboard", or wants to re-plan after a change of offer or market. From the website URL alone (or a repo or company name) it researches the company, offer, buyers, niche and competitors (and the tools and channels they use), picks channels with reasons, lists the services to set up with costs from kb/tools.md, gives a timeline with milestones, and builds a dashboard mock in the owner's brand. Writes kb/plan.md and docs/plan.html, then asks for approval. No question round.
---
# Discovery and plan (out of the box)

Read `kb/RULES.md`, `kb/context.md`, `kb/tools.md` and `kb/playbook.md` first. References:
[discovery](references/discovery.md) (what to research and where), [channels](references/channels.md) (how to pick),
[non-obvious channels](references/non-obvious-channels.md), [partner channels](references/partner-channels.md),
[plan outline](references/plan-outline.md) (the shape of kb/plan.md and the timeline rules),
[plan page](references/plan-template.html) (docs/plan.html), [mock data](references/mock-data.md).

**Rule:** do not ask the owner questions to fill the plan. Research it. The owner only approves or edits, and gives
logins or keys when a step can't run without them. Anything research cannot settle is written as an `assumed`
choice with the reason, and listed under "Check these" in the plan, never as a question round.

## 1. Input
The website URL (or a repo, or the company name: find the site with a web search). If `kb/context.md` already has
it, use it. If the owner gave a customer CSV, read counts and patterns only (never store names or emails in kb/).

## 2. Research (about 15 to 30 minutes of reading; $0)
Follow [discovery.md](references/discovery.md). Write facts as you go, each labelled `sourced` (with the URL and
date) or `assumed`:
- `kb/context.md`: business, countries, team roles, contact details for support (from the site's contact page).
- `kb/offer.md`: offer, price anchor if public, proof lines quoted from the site, a free check or sample that fits.
- `kb/icp.md`: buyer roles, company type, size bands, countries, target tools, exclusions (competitors).
- `kb/voice.md`: 3 short passages of their own writing, banned words.
- `kb/research/market-<YYYY-MM>.md`: niche, 3 to 8 competitors (what they sell, price if public, which channels and
  tools they visibly use), where buyers gather, buying triggers. "Key takeaways" first, dated sources at the end.

## 3. Pick channels
Score every channel in [channels.md](references/channels.md) against the research: does a public signal for "now"
exist, can a checkable fact about their system be found, is there a register, do buyers gather in a community, do
partners already serve them. Pick 2 to 4 to start, one marked "first". For each: why it fits (with the fact),
what it needs, cost, and what we measured when we ran it (only labelled numbers from the references).
Name 1 to 3 channels you are **not** picking and why (that is often the most useful line in the plan).

## 4. Services, cost and mode
From the chosen channels, list the services to set up, each linked through `kb/tools.md` (never paste a raw sign-up
link: say "see kb/tools.md, <tool>"). Monthly cost table: free tier, start, and steady state, labelled.
Pick the hosting mode with setup's rules (`modes.md` in the setup skill): A (Supabase + Vercel), B (own host and
database), C (no app, local). Say in one line why.

## 5. Timeline with milestones
Use the rules in [plan-outline.md](references/plan-outline.md): setup day, domain warm-up, first sends, first
judgement point (≥ 30 delivered per variant, after follow-up 1), the 300-send check. Milestones are events, not
results. **Never promise reply or meeting rates.** Give ranges only where `measured` data exists, labelled with n and
date, and say they are the bundle author's, not a forecast.

## 6. Dashboard mock (their brand, example data)
1. Brand colour: the site's main accent (CSS `--primary`, button colour, logo colour). Write it in `kb/context.md`.
2. Example rows for *their* niche and channels, following [mock-data.md](references/mock-data.md): 8 to 12 made-up
   companies (`.example` domains), signals of the chosen kinds, a few people, drafts and one reply. Save
   `docs/mock-data.json`.
3. Build it: `npm run mock -- --data=docs/mock-data.json --title="<Company> leads" --accent=<#hex> --out=docs/dashboard-mock.html`
   (needs `npm install` once). If node is not ready yet, fill the mock section of the plan page by hand instead.

## 7. Write the plan
1. `kb/plan.md` in the [outline](references/plan-outline.md). Status: draft.
2. `docs/plan.html` from [plan-template.html](references/plan-template.html): replace every `{{…}}`, keep the
   tokens, embed the mock with the iframe already in the template. Screenshot it at 1280 and 390 px if a browser
   is available and fix anything clipped.
3. Offer to show it: open the file, or publish it as a private page if the session can (Artifact tool), with
   `dashboard-mock.html` as a supporting file.

## 8. Approval
Show the summary (channels, first channel, services and monthly cost, timeline, mode) in 10 lines and ask once:
"Approve this plan, or tell me what to change." Edits → update both files and ask again.
On approval: `kb/decisions.md` → `<date> - Plan approved: channels <…>, mode <A|B|C> - owner - kb/plan.md`;
set `Status: approved` in kb/plan.md and kb/README.md; tick "Plan approved" in kb/setup-state.md. Setup then builds
only what the plan needs.

Write `kb/runs/<YYYY-MM-DD>-plan.md` (sources read, channels picked and dropped, cost, open checks).
