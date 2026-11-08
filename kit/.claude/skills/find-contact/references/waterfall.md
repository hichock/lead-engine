# Contact waterfall: order, prices, pitfalls

**Rule (bundle default, from the author's runs):** discover free → qualify on the website → pay for contacts only on
qualified companies → verify → send. A Clay test burned its free credits on 100+ person firms before qualifying
(sourced in the author's KB); the app now refuses paid lookups on unqualified rows in code.

## Order (cheapest first, stop at the first candidate)
| Step | Cost | Notes |
|---|---|---|
| Site: team / about / contact / privacy pages | $0 | Best source for small firms |
| Pattern from a visible address | $0 | 11 of 15 pattern guesses were invalid in one batch (measured 2026-11-03): always verify |
| Register entry (if the register publishes emails) | $0 | 54–73% `ok` on a bar directory (measured 2026-11-04/05) |
| Apollo free people search | $0 | Name and title, no email (see source-people) |
| Monid → Hunter `/domain-search` | $0.0245 per result (measured 2026-11-03/04) | Fallback finder |
| Monid → ContactOut work email | $0.10 when found; verify-only $0.01 (measured) | High-score leads only |
| Prospeo | credits | Its "VERIFIED" came back catch_all on MillionVerifier for 5 of 10 (measured 2026-11-03): re-verify everything |

## Monid
A pay-per-call wrapper over ~90 providers through one key, as REST, MCP, CLI or a skill; $1 free credit (sourced
monid.ai 2026-11-08). Paths: `discover` (find an endpoint), `inspect` (price and input), `run`, `runs/<id>`,
`wallet/balance`. Only `run` costs money. Spend per author daily run: $0–0.67 (measured 2026-11-05/06).
Default cap: $1.50 per run day.

## Commenters (from source-social)
Domain found for 9 of 15 buyers; a personal `ok` address for 2 (13%) (measured 2026-10-29). Each domain took 2–3
minutes. Commenters go to manual LinkedIn connects first.
