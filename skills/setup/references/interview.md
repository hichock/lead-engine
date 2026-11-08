# Knowledge base: auto-draft first, then at most 8 questions

## Auto-draft (no questions yet)
1. Ask for the website URL and, optionally, a CSV of current customers (domain + industry is enough; never store
   names or emails from it in `kb/`, only counts and patterns).
2. Fetch `/`, `/about`, `/services` or `/pricing`, `/case-studies` or `/work`, `/contact`, and the blog index.
   From the CSV: industries, size bands, countries, the tools they run (check 10 domains against
   `.claude/skills/source-tech/references/fingerprints.md`).
3. Draft, each line labelled `assumed` (drafted from the site) or `sourced` (with the page):
   - `kb/context.md`: business, what they do, countries, team roles.
   - `kb/offer.md`: offer, price anchor if public, proof lines quoted from the site with their URL, a free check or
     sample that fits, booking link if on the site.
   - `kb/icp.md`: roles, company type, size bands, countries, target tools, exclusions (their competitors).
   - `kb/voice.md`: 3 short passages from their own writing as examples; obvious banned words.
   - `kb/sources.md`: which sources fit (tech search if their buyers run a tool; registers for licensed professions;
     social for creators' audiences).
4. Show a 10-line summary: "Here's what I think you sell, to whom, and how we'll find them."

## Then ask "what's wrong?" (max 8 questions; skip any the draft already answers well)
1. What do you sell, at what price, and what does a won deal look like? → `kb/offer.md`
2. Who buys (role, company type, size, countries), and who never (competitors, current clients, excluded segments)?
   → `kb/icp.md` gates and exclusions
3. Which signals mean "now" for them: a tool they run, a register entry, hiring, ads, a topic they engage with?
   → `kb/sources.md`, `kb/icp.md` target tools
4. Budget per run and per month, and which keys you already have (Apollo, MillionVerifier, Monid, Apify, urlscan,
   Google Cloud, Zapmail)? → caps in `kb/sources.md` and Settings
5. Three emails or posts you wrote that you like, and words you never use? → `kb/voice.md`
6. Sending: your own secondary domains or new lookalikes, how many mailboxes, daily caps; opt-out line yes or no
   (show the legal note in `.claude/skills/outreach-review/references/compliance.md`; default yes)? → `kb/sources.md` § Sending
7. Who answers replies, and the booking link? → `kb/offer.md` § Replies
8. Anything we must never do (a market, a claim, a channel)? → `kb/decisions.md`

Write each answer as `stated` with today's date. Anything still unknown stays `needs input`; `kb-tidy` lists it
weekly. Then update `kb/README.md` statuses (`draft` → `filled`).
