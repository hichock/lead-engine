# Non-obvious channels (what the bundle author found)

Numbers are the bundle author's runs (measured, with dates) unless labelled. Replace them with yours as they come in.
Each channel: when it fits, what it costs, what we measured, pitfalls.

## 1. Doc-share outreach
A Google Doc with *measured* findings about the prospect's app or site, plus a simple mockup of how it could look
(their logo, their main processes), shared from a separate warmed Google Workspace mailbox with "notify" on and a
2-line note. It lands in Gmail as a share notification: only the title and the note show, so **the title is the
hook** (for example "<host>: 2 app problems found", or a measured fact).
- **Fits:** you can measure something real and specific (load time on a phone, a hard platform limit they will hit,
  a broken form), the buyer owns that system, and a mockup makes the fix concrete.
- **Cost:** one extra mailbox (Zapmail add-on about $3.50 a month, kb/tools.md) and about 15 to 30 minutes per doc.
- **Measured:** started 2026-11-08 at 5 shares a day; no result yet.
- **Rules that held:** only send when there are at least 2 real problems (never a tab title, never "costs grow with
  users"); the note says why they should care, not what we did; 5 shares a day in week 1, then 10, at most about
  20 per account; the share is the only touch (no follow-up emails, the owner's decision 2026-11-08); replies are
  caught by the mailbox; unshare after 14 days with no reply; stop on a quota error, a Google warning, or 2 angry
  replies in 50; never from the main brand account.
- **Pitfalls:** one public backlash case exists (Feb 2026, sourced): keep volume low and every doc genuinely useful.
  The bundle drafts titles and notes (first-lines); sharing stays manual. Details: `.claude/skills/first-lines/references/doc-channel.md`.

## 2. Viral-post commenters, then per-prospect activity research
Find fast-rising posts in the niche (velocity against the author's own median), harvest commenters with cookie-free
actors, keep buyers, then read each buyer's own comments and likes once to pick the offer.
- **Fits:** buyers comment on a handful of creators in your niche; the offer has several angles.
- **Cost:** Apify, about $0.16 per buyer found and about $0.15 per prospect researched (measured / assumed from list prices).
- **Measured:** about 3% of commenters were buyers (17 of 532, 2026-10-29); niche topics 5.6% vs generic 1.5%;
  13% of buyers had a findable personal email. Activity research on 11 prospects: for 9, a different offer fit
  better than the post they were found on (2026-11-06).
- **Pitfalls:** a research source more than a lead source; finding each domain took 2 to 3 minutes; LinkedIn's terms
  ban scraping whatever the tool (never the owner's login); the opener names the interest, never "I saw your comment".
  Skills: source-social, activity-research.

## 3. Technology search (HTTP Archive and urlscan fingerprints)
Find every site that loads a tool's code: HTTP Archive on BigQuery (monthly, free 1 TB) and urlscan (last 30 days).
- **Fits:** the buyer runs a tool with a public fingerprint (Softr, Airtable embeds, Bubble, Webflow + Memberstack,
  Make or Zapier webhooks, GoHighLevel). Tools with no fingerprint (Clay, Monday, ClickUp) need job posts instead.
- **Cost:** $0 (about 3 GB of BigQuery per crawl export, measured).
- **Measured:** Softr 442, Airtable 1,603, Bubble 2,159 domains in one crawl (2026-11-03); urlscan about 170 Softr
  sites per 30 days; about 1 in 4 Softr sites was a real business; 420 hosts → 15 leads → 8 sendable.
- **Pitfalls:** phishing kits load real tool hosts; sites leave the tool between crawl and check (7 did); never re-run
  a BigQuery query (it double-billed 150–190 GB once): poll it. Skill: source-tech.

## 4. Public registers with named emails
Professional registers (bar directories, licence lists) that publish each member's website and own email.
- **Fits:** licensed professions, small firms, one country or state.
- **Cost:** $0 plus verification.
- **Measured:** a bar directory: 2,568 rows → 25 queued, 54–73% of checked addresses `ok` (2026-11-04/05); a
  register without emails gave a site for 1 row in 3.
- **Pitfalls:** read the licence first (some ban marketing use); entries are personal data (say where you found
  them); role addresses (info@) are dropped for people. Skill: source-registers.

## 5. Apollo free people search + domain guess
Apollo's free search by title, keyword, size and city returns first names, masked surnames, titles and firm names
(no emails, no credits). Guess the domain, scan the team page, apply the visible email pattern, verify.
- **Fits:** the buyer is defined by role and place, not by a tool.
- **Cost:** $0 plus verification.
- **Measured:** 148 people → 61 live sites → 25 queued; domain guess about 60% right in Australia (2026-11-04).
- **Pitfalls:** regional towns return nothing (use a city); pattern guesses are often wrong (11 of 15 invalid in one
  batch), so verify; never call Apollo's paid enrichment. Skill: source-people.

## 6. Partners and introducers
People who already serve your buyer before the need appears (accountants, agencies in adjacent work, tool
resellers, implementation partners in the tool's directory). See [partner-channels.md](partner-channels.md).
- **Fits:** a high-value offer, a long sales cycle, or a buyer who distrusts cold email.
- **Cost:** time and referral fees. **Measured:** not run by the author.

## 7. Job-post signals
Open roles that name the tool or describe the pain ("manual reporting", "spreadsheets"), with the original post date
from the job board's public JSON (Greenhouse, Lever, Ashby, BambooHR), which survives reposts.
- **Fits:** as a "why now" on companies you already found, and to find users of tools with no fingerprint.
- **Cost:** $0.
- **Measured:** Airtable named by 13 companies in 7,736 jobs (2026-10-31); about 30–40% precision as a signal (guess).
- **Pitfalls:** companies hiring automation roles build in-house (excluded by default); in the recruiter segment the
  buyers already pay for signal tools (9 sends, 0 replies). Skill: source-signals.

## What failed (keep as warnings)
Plain-keyword "looking for" post searches (279 posts → 0 buyers), SEC Form D (29 of 40 were funds), brand-new company
registrations (no revenue yet), G2/Capterra (no company names), offers a SaaS under about $1k a month already covers
(0 replies). Full table: `.claude/skills/source-signals/references/signals.md`.
