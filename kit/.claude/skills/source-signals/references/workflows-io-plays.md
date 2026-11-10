# Extra signal plays (adapted from workflows.io, read 2026-11-10)

Source: the public GTM workflow library at [workflows.io/workflows](https://www.workflows.io/workflows) and its
[blog](https://www.workflows.io/blog), credited per play. Their numbers are `stated` (their claims from agency
campaigns, no method shown): treat them as an upper bound. None of these plays has been run by the bundle author yet: label each
as "not tested" in `kb/sources.md` until your own replies come in. Their versions use paid tools (Clay, Jungler,
HeyReach, Instantly); the steps below use the bundle's free or already-paid tools where possible.

## The shared skeleton (all their signal plays)
signal → one table → suppression check (existing clients, open deals, past "no") **before** any paid lookup → yes/no
qualification → tier → channel by tier → alert → log. The bundle already does "check, qualify, then pay" (see
`find-contact/references/enrichment-stages.md`). Add the channel-by-tier step:

| Tier | Who | Channels (one person, done by hand where LinkedIn is involved) |
|---|---|---|
| 1 | Best fit + fresh trigger (top of the score) | LinkedIn connect by hand + email + doc-share if 2 real findings exist |
| 2 | Good fit, any trigger | Email sequence only |
| 3 | Fit but weak or old trigger | Hold; recheck when a new signal lands |

Their extra rule: a hand-picked "Ideal 150" (or "Dream 150") gets fully manual work and never an automated sequence
([ultimate guide on outbound](https://www.workflows.io/blog/the-ultimate-guide-on-outbound), 2026-04-19).

## 1. Past-client alumni
People who left a company you delivered for and now work somewhere new. They saw the result from the inside.
([Customer Alumni](https://www.workflows.io/workflows/the-customer-alumni-play); their claim: 3–5x reply vs cold.)
1. List past clients (from `kb/context.md` or the owner).
2. Find people who left in the last 12 months. Apollo's people search can't filter "previously worked at"
   ([Apollo plays](https://www.workflows.io/blog/5-apollo-plays-for-signal-based-outbound), 2026-07-02), so for a
   small list this is LinkedIn by hand.
3. Qualify the **new** company with `qualify`; keep buyer roles only.
4. Signal: the app accepts only the kinds `request, job, comment, ad, tech, register, review` (`lib/scoring.ts`). Until
   an `alumni` kind is added in code, ingest it as `{"kind":"comment","value":"alumni: <role>, ex-<past client> (left
   <month>)","url":"<profile>"}` and note the play in `kb/sources.md`. The opener names the shared company and the
   result, never private client details.

## 2. The owner's own connections, plus a monthly job-change diff
([Founder Connections](https://www.workflows.io/workflows/the-founder-connections-playbook); their best play: 25.4%
reply in early campaigns, from founders with a large audience who had posted for a year.)
1. LinkedIn → Settings → Data privacy → Get a copy of your data → larger archive → `Connections.csv`
   (first name, last name, URL, email if shared, company, position, connected on).
2. Qualify companies, then people. Tier 1 → message by hand on LinkedIn (no automation on the owner's profile).
3. Keep the file. Next month, export again and diff Company / Position: a connection who moved into a buyer role is
   a job-change signal at the new company (ingest as kind `comment`, value `job change: <new role>`, until a
   `job_change` kind exists). The CSV holds personal data: keep it in `data/` (gitignored), never in `kb/` or git.

## 3. Followers of a tool's or competitor's company page
([Competitor Followers](https://www.workflows.io/workflows/competitor-company-page-followers-playbook).)
Followers of the page of the tool your offer replaces (or a competitor) are users or evaluators. Extract with a
cookie-free Apify actor inside the Apify budget, keep buyer roles at companies that pass `kb/icp.md`. Not tested:
run one small batch and compare buyers per 100 with commenters (~3%, author's runs). LinkedIn's terms still apply:
`source-social/references/compliance.md`.

## 4. Complaint and switching posts about a named tool
([Competitor Mentions](https://www.workflows.io/workflows/competitor-mentions-tracking-signal), 2026-11-06.)
Different from "looking for recommendations" searches, which failed in the author's runs (279 posts → 0 buyers).
1. Search posts naming the tool with complaint words: "alternative to", "moving off", "price increase", "limit",
   "switching", feature requests.
2. Drop listicles and tool roundups, posts that only name-drop the tool, the vendor's staff and partners.
3. Take the **author and every engager**; run the commenter classes (`source-social/references/commenters.md`).
4. Signal kind `request` only when the author asks for help; otherwise `comment` with the complaint theme as value.

## 5. Engagement weighting (any social source)
([X Engagement](https://www.workflows.io/workflows/the-x-engagement-signal-playbook),
[signal plays](https://www.workflows.io/blog/signal-based-outbound-plays).)
- Repeat engagers (2+ posts in 30 days) beat one-off engagers.
- Comments and quotes beat likes; reposters are often engagement pods.
- Drop students, pods, out-of-territory profiles.
- On X, run weekly: replies fall out of the 7-day search window.
Suggested (assumed) strength multipliers on the `comment` weight: comment or quote 1.0, like 0.5, repost 0.3, repeat
engager ×1.3. Tune in `kb/icp.md` after ≥ 30 delivered per group, as with every weight.

## 6. Sign-ups with personal email addresses
([Personal Email Sign-Up](https://www.workflows.io/workflows/personal-email-sign-up-enrichment-playbook),
[Product Sign-Up](https://www.workflows.io/workflows/product-sign-up-outreach-playbook).)
For lead-magnet or giveaway sign-ups: classify each address as work / personal / education. Work → enrich the
domain. Personal → find the LinkedIn profile by name, then the company; education → keep, low priority. Only
contact people who signed up for something from you, and say so.

## 7. Inbound multithreading
([Apollo plays](https://www.workflows.io/blog/5-apollo-plays-for-signal-based-outbound), play 3.)
When a Tier 1 company asks for something (form, reply, sign-up), wait 24 hours, then contact 1–3 other buyer-role
people there: "your colleague <name> was looking at <topic>". Never before the first person has heard from you.

## 8. Backtest the ICP before a campaign
([TAM Mapping](https://www.workflows.io/workflows/the-tam-mapping-playbook), [ICP Modeling](https://www.workflows.io/workflows/icp-modeling-guide).)
Run `qualify` over past clients (and past "no"s). Their rule: 95%+ of past wins should pass, and wins should land in
the top tier. Score lists on fit only at this stage; triggers come later.

## Reply handling extras
([Reply Management](https://www.workflows.io/workflows/automated-outbound-reply-management-system), 2026-09-04.)
Strip HTML, signatures and footers before classifying; re-enroll out-of-office replies after the return date; check a
weekly sample and fix the prompt if more than 1 in 20 is misclassified. Classes and owners stay in
`outreach-review/references/reply-rules.md`.
