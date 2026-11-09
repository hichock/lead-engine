# Sending mailboxes

Never send cold email from your main domain. Use 1 to 3 secondary domains (for example `get<brand>.com`), 2 to 3
mailboxes per domain, each a real person's name, warmed up before cold sends. Start at 10 to 15 emails a day per
mailbox (follow-ups included), at most 20 to 30. DNS for each domain: `dns.md`.

## Option 1: Zapmail (domains + Google or Microsoft mailboxes, warm-up)
Prices and plans: `kb/tools.md`. With the Zapmail connector in Claude, Claude can check domain availability, show the
price and buy only after your explicit yes.
1. Sign up with the Zapmail link in `kb/tools.md`, top up the wallet if asked.
2. **Domains** → search a lookalike domain → buy (or connect one you own). Zapmail can't buy some TLDs (for example
   `.co.uk`): buy those at a registrar from `kb/tools.md` and connect them.
3. **Mailboxes** → add 2 to 3 per domain (at most 5) with real first and last names.
4. Pre-warmed mailboxes save the 2 to 4 week warm-up but sell out; otherwise turn on **ZapWarm** (first month free)
   and keep it running while you send.
5. Domain forwarding: set each domain to forward to your main site.
Zapmail has no one-click export to this app: connect each mailbox with an app password (below).

## Option 2: Google Workspace mailbox → app password
1. Sign in to the mailbox → myaccount.google.com → **Security** → turn on **2-Step Verification**.
2. Same page → search "App passwords" → name `lead-engine` → **Create**. Copy the 16-letter password (shown once).
3. Mode A/B: app → **Settings** → **Mailboxes** → **Add**: email, sender name, SMTP `smtp.gmail.com:465`, IMAP
   `imap.gmail.com:993`, the app password, daily cap 10 to 15.
   Mode C: in `.env.local` (cloud: environment secrets):
   ```
   MAILBOX_1=you@send-domain.com|Your Name|smtp.gmail.com:465|imap.gmail.com:993|15
   MAILBOX_1_PASSWORD=<app password>
   ```
If "App passwords" is missing, the Workspace admin has to allow 2-Step Verification for the user first.

## Option 3: Microsoft 365
SMTP AUTH must be on for the mailbox (Microsoft 365 admin → Users → the user → **Mail** → **Manage email apps** →
tick **Authenticated SMTP**). Use `smtp.office365.com:587` and `outlook.office365.com:993` (assumed defaults; check
your tenant). Some tenants block basic auth entirely: then use Google mailboxes or a sequencer.

## Option 4: your sequencer
Keep it. Export from the app (Leads → **For a sequencer**) or `node scripts/le.mjs export --for=sequencer` (mode C)
and import the CSV. Don't also send the same people from this app.
