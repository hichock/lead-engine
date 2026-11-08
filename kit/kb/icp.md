# Ideal customer and gates

Status: needs input. `qualify` applies the gates in order and stops at the first failure. `score` reads the weights.
Edit the rules in plain words; keep each one checkable from the company's website or a public source.
When you change weights or target lists here, mirror them in the app: Settings is read by the score code
(table `settings`, key `scoring`): `{"countries":[…],"tools":[…],"sizeBands":{…}}`.

## Who buys
- Role(s): needs input (e.g. founder, operations director, practice manager)
- Company type: needs input
- Size bands we want (weight 0–1): 1-10: 0.6 · 11-50: 1 · 51-200: 0.8 · 201-500: 0.4 · 500+: 0.1 (bundle default, assumed)
- Countries: needs input
- Target tools (the tech they run that makes our offer relevant): needs input

## Gates (in order; a company must pass all)
1. **Live and real:** the site loads, it is a business (not a demo, personal page, school, parked domain or phishing).
2. **Still on the tool:** the fingerprint is on the live site today (not only in last month's crawl).
3. **Uses it for real work:** a portal, app, member area or internal tool, not just a marketing page.
4. **Size and country:** in a wanted band and country (from the site, register or LinkedIn company page).
5. **Not excluded:** not a competitor, not an existing client, not in an excluded segment below.
6. **One evidence line:** a checkable fact about *their* system that the first email can name.

## Exclusions (never contact)
- Competitors (agencies selling the same thing): needs input
- Existing clients: keep them in the `suppression` table by domain, not here
- Excluded segments: needs input. Bundle default from our runs: companies hiring for automation roles ("they build
  in-house"), and anyone whose need a SaaS under ~$1k a month already covers (0 replies in our tests, 2026-10/11).

## Score weights (signal kinds, 0–1; bundle defaults, assumed)
request 0.9 · job 0.7 · comment 0.6 · ad 0.6 · tech 0.5 · register 0.4 · review 0.3. Half-life 30 days.
