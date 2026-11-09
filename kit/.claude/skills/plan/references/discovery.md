# Discovery: what to research, and where

All free. Fetch pages with `curl -sL -m 15 -A "Mozilla/5.0"` or the session's web fetch tool; search with web
search. Label each fact `sourced` (URL + date) or `assumed`. Stop when each heading below has an answer or an
`assumed` line with the reason.

## The company (their own site)
- Pages: `/`, `/about`, `/services` or `/pricing`, `/case-studies` or `/work` or `/customers`, `/contact`, the blog
  index and 2 recent posts, the footer (address, legal name, social links).
- What they sell, to whom, price anchor if public, proof (named clients, numbers they publish), booking link,
  languages, countries served, team size hints.
- Tech on their own site (for the brand colour and as a hint of what they know): view source, look for the
  fingerprints in `.claude/skills/source-tech/references/fingerprints.md`.
- Their writing: 3 short passages for `kb/voice.md`.

## The buyer
- From case studies and testimonials: job titles, company types, sizes, countries.
- Which tool or system the buyer runs that makes the offer relevant (target tools). Check 5 to 10 named clients'
  sites against the fingerprints: a pattern here is the best targeting signal there is.
- Buying triggers: what happens at a buyer right before they need this (hiring a role, a new licence, a funding
  round, a tool change, a bad review theme, a regulation date). Each one is a candidate signal.
- Exclusions: competitors, segments the site says it does not serve, anything a SaaS under about $1k a month
  already covers for that buyer (the bundle author's offers aimed there got 0 replies, measured 2026-10/11).

## The niche and competitors
- Search: "<offer> for <buyer type>", "<offer> agency <country>", "<target tool> consultant", "alternatives to
  <company>". Take 3 to 8 competitors.
- For each: offer and price if public, who they show as clients, and the channels you can see: content (blog,
  LinkedIn, YouTube), directories and marketplaces (partner directories of the tools, Clutch, Upwork), communities,
  ads (Meta Ad Library, Google ads transparency), events, partner pages, job posts for sales roles (SDR = outbound).
- Gaps: a buyer segment or a channel none of them uses well.

## Where buyers gather (for channels)
- Registers that list the buyers (licensed professions, company registries): does one publish a website and
  named emails? Check its licence for marketing use.
- Communities (forums, Slack or Skool groups, subreddits, LinkedIn creators the buyers comment on).
- Partners who already serve the buyer (tool vendors' partner directories, accountants, agencies in adjacent
  work, software resellers).

## Output
`kb/research/market-<YYYY-MM>.md` (Key takeaways first; tables for competitors and channels; sources with dates)
and the kb files listed in the plan skill step 2. One line per fact, short sentences.
