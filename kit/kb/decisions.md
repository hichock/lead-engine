# Decisions and standing rules

Newest first. Format: `date - decision - why - where`. Supersede, never delete.
The lines below are the bundle defaults. Change any of them by adding a newer line that supersedes it.

## 2026-11-08 (bundle defaults)
- **Discover free → qualify on the website → pay for contacts only on qualified companies → verify → send.** - Paying before qualifying wasted credits in the bundle author's runs. - enforced in `lib/guard.ts`
- **Only verifier `ok` is sendable; catch_all and unknown go to a retry list.** - The one catch_all address the author sent to bounced (2026-10-26). - `lib/sender/checks.ts`
- **Default caps per run day: Monid $1.50, MillionVerifier 80 checks, BigQuery 30 GB (200 GB max per query, dry run first), Apify $0 until set, $30 a month for all paid sources.** - The author's daily-run caps. - Settings → Caps, `kb/sources.md`
- **A source call with the same input inside 24 h is refused; pending paid jobs resume.** - Duplicate Apify runs cost the author $3.90 (2026-11-02); BigQuery re-runs double-billed 150–190 GB (2026-11-03). - `lib/ledger.ts` + DB constraint
- **Opt-out line on every email.** - CAN-SPAM needs a working opt-out; PECR/GDPR need the sender named and a way to object. - Settings → Sending
- **Drafts need the owner's approval until auto-queue is turned on.** - Sending is a side effect. - Outreach page
- **Never send from the main brand domain; 15–20 a day per warmed mailbox, 10 a day for a week after a rename.** - Protects the main domain; renames reset warm-up history. - `kb/sources.md` § Sending
- **Judge a source or copy variant only after ≥ 30 delivered and after follow-up 1.** - Smaller samples say nothing. - `outreach-review`
- **No reply-rate promises anywhere.** - The author's own cold sends had 0 human replies from 119 first emails to 2026-11-06. - all copy and reports
