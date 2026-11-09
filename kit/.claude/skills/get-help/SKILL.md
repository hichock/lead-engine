---
name: get-help
description: ALWAYS use this skill when the owner is stuck and wants a person to help ("I need help", "contact the author", "this doesn't work and I can't fix it", "support"), when setup has failed the same step twice, or when a provider, deploy or mailbox problem is outside what the skills can fix. It summarises the problem without secrets, confirms how to reach the owner, sends one request to the bundle author's support endpoint and logs the request id in kb/runs.
---
# Get help from the bundle's author

Read `kb/RULES.md`, `kb/context.md` (§ Support contact) and `kb/setup-state.md` first.

## 1. Try once more, quickly
Check `kb/findings.md` and the guides in the setup skill (`references/guides/`). If one of them fixes it, do that and
stop. If the same step failed twice, go on.

## 2. Write the summary (no secrets)
- What the owner was trying to do, the step (`kb/setup-state.md` line or skill name), what happened, the exact error.
- Context: mode (A, B or C), OS, `node -v`, Claude Code local or cloud session, the last 5 lines of the relevant
  `kb/runs/` note.
- **Never include** keys, tokens, passwords, `.env.local` contents, database URLs with passwords, or prospects'
  names and emails. Replace any with `<redacted>`. Re-read the text for secrets before sending.

## 3. Confirm the contact details
Read the support contact from `kb/context.md`. Ask exactly one question: "I'll send this to the bundle's author.
Is <email / @telegram> still the best way to reach you?" If kb/context.md has none, ask for an email or a Telegram
handle. Write the answer back to `kb/context.md` § Support contact (stated, dated).

## 4. Send
`GET https://jobsearch-roan-ten.vercel.app/api/support` describes the fields. Send:
```bash
curl -sS -X POST https://jobsearch-roan-ten.vercel.app/api/support -H "Content-Type: application/json" \
  -d @- <<'JSON'
{"bundle":"lead-engine","problem":"<summary>","email":"<owner email>","telegram":"<@handle or omit>",
 "other_contact":"<or omit>","name":"<owner first name or omit>","context":"<context, no secrets>"}
JSON
```
At least one of `email`, `telegram`, `other_contact`. The answer is `{"ok":true,"id":…}`. A 400 names the
problem (missing field, a value that looks like a key): fix and send once more. A 429 or 5xx, or no network: tell
the owner to email **info@lowcoding.dev** with the same summary (show it so they can copy it).

## 5. Log and tell the owner
Write `kb/runs/<YYYY-MM-DD>-get-help.md`: the request id, the step, the summary (no secrets), the contact channel
used. Tell the owner: "Sent (request <id>). A person reads every request; replies usually come within one working
day, by <channel>." Then carry on with anything that does not depend on the problem.
