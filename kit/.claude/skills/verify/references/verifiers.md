# Verifiers

## MillionVerifier
- ~$0.0037 per check on one-time packs that don't expire (to confirm on their pricing page); third-party range
  $0.002–0.004 (sourced). The 500 free credits added on 2026-11-03 were nearly used up by 2026-11-05 after a
  122-check day (measured).
- API: `GET https://api.millionverifier.com/api/v3/?api=<key>&email=<email>&timeout=20` → `result`:
  `ok | catch_all | unknown | invalid | disposable` (the app calls it; keys stay on the server).
- **Only `ok` is sendable.** catch_all and unknown go to a retry list.

## Results the author measured
- 119 verified first emails sent with **0 bounces** (to 2026-11-06).
- The one catch_all address sent to bounced (2026-10-26).
- Prospeo "VERIFIED" was catch_all on MillionVerifier for 5 of 10 (2026-11-03).
- Monid fallback: 2 of 5 MillionVerifier unknowns came back `valid` (2026-11-04).
- Register emails: 54–73% `ok` (bar directory, 2026-11-04/05). HTTP Archive batch: about half the domains catch_all.

## Monid verifiers (pay per call)
Hunter `/email-verifier` $0.012; anyapi verify $0.0066 (measured 2026-11-03/04). Use for MillionVerifier `unknown`
(greylisting, timeouts) or when MillionVerifier credits run out.

## Stop-loss tie-in
Bounces over 2% on a campaign → pause and re-verify the list (stop at 3%) (sourced, vendor thresholds). Re-verify
anything older than ~2 weeks before sending.
