# MillionVerifier

Only addresses it marks `ok` are ever sent. Needed before the first send, not for discovery.

1. Sign up with the MillionVerifier link in `kb/tools.md` (a business email gets trial credits).
2. Dashboard → **API** (left menu) → copy your API key.
3. Give it to Claude as `MILLIONVERIFIER_API_KEY`.
4. Credits: **Buy credits** → the smallest pack is enough to start (about $0.0037 a check in the author's purchase; check
   the page). Credits don't expire. Bonus credits apply to purchases in your first week.

The app spends at most 80 checks a day by default (Settings → Caps; mode C: `le ingest '{"caps":{"mvChecks":80}}'`).
