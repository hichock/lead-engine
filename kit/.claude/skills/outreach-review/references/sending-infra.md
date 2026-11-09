# Sending infrastructure

## Own sender vs a sequencer
The app sends over SMTP and reads replies over IMAP (`lib/sender/*`), like the author's own sender built 2026-11-04:
Mon–Fri 09–17 in the lead's time zone, at most 1 send per mailbox per 5-minute tick, 8–14 minutes apart (8 + random
jitter), a daily cap per mailbox (all steps) and a daily cap on first emails, steps on day 0, +3 and +5 business days
threaded as "Re:", stop on reply, bounce or opt-out, replies forwarded to a human, auto-replies only noted.
A sequencer is worth it past ~10 mailboxes or for a team inbox (assumed). Smartlead's API and webhooks are not on its
$39 Base plan; Pro is $94/mo (measured 2026-11-03), which the own sender saves.

## Caps and warm-up
- Author: 15–20 a day per mailbox; 10 a day for a week after a rename. 3 mailboxes per domain ≈ 15 new leads a day
  with a 3-step sequence (measured 2026-11-04).
- Generic: 20–30 a day per mailbox including follow-ups, 2–3 mailboxes per domain, 10–20% spare warmed domains.
  Warm up 3–4 weeks (or buy pre-warmed) and keep warm-up running while sending (sourced, playbook).
- Never send cold from the brand domain. Use lookalike domains that redirect to the main site over HTTPS.
- SPF, DKIM and DMARC on every domain. Avoid domains under ~3 months old: one playbook's new domains landed on SURBL.
- One real person's name per mailbox, no aliases. Open and click tracking off. No links in cold bodies.

## Zapmail (domains + Google/Microsoft mailboxes by API and MCP) - author's setup 2026-11-03..08 unless marked
- Pre-warmed Starter: $39 first month, 3 mailboxes on 1 domain, renews $24; an extra mailbox $8. Growth $149
  (12 mailboxes, 4 domains). Pre-warmed stock was out on 2026-11-08; mailboxes can't be added to a pre-warmed domain.
- Hard limits (sourced docs.zapmail.ai 2026-11-08): **at most 5 mailboxes per domain**. Add-on mailboxes:
  $3.50/mo on Starter, $3.25 on Growth, $3.00 on Pro.
- ZapWarm: 15 warm-up emails a day per mailbox, topic and language settable, first month free, then $2 per mailbox
  per month.
- Domain forwarding to the main site works by API. Zapmail can't buy .co.uk (API 400; measured 2026-11-06).
- Pitfalls: renaming a mailbox via the domain call renamed the domain's *first* mailbox; renames reset warm-up
  history (cap at 10 a day for a week); no one-click export to an own sender, so use app passwords over SMTP/IMAP;
  watch the pre-warm `expireOn` date.
- Resold Google mailboxes are cheaper but the provider owns the Workspace tenant: if it is suspended, mailboxes and
  warm-up go at once. Spread across providers; keep the brand domain off them (sourced, playbook).

## Connecting a mailbox to this app
Google Workspace: 2-step verification on → create an app password → Settings → Mailboxes → Add (SMTP
smtp.gmail.com:465, IMAP imap.gmail.com:993). Start the cap at 10–15. Microsoft 365: SMTP AUTH must be enabled
for the mailbox; use smtp.office365.com:587 and outlook.office365.com:993 (assumed; check your tenant).

## More rules (generic playbook, sourced)
- Verify every list right before it is queued; re-verify after about 1 to 2 weeks. Bounces over 2% hurt the domain.
- Do not link the main site in cold bodies (link reputation); at most one link, never in email 1, never a shortener.
- Redirect lookalike domains to the main site over HTTPS (Cloudflare redirect rules do; some registrars' forwarding
  does not). Zapmail can forward by API.
- Registrars: buy TLDs Zapmail can't (for example .co.uk) at a registrar with an API; links in `kb/tools.md`.
- Sequencer-bundled mailboxes can lock you in (domains can't leave, fixed terms): fine for a one-off, not for a system.
- One warm-up tool per mailbox. Keep 10 to 20% spare warmed domains so a blocklisted one can be retired at once.
