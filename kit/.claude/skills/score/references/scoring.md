# Scoring

**Formula (in `lib/scoring.ts`, pure and tested):**
- fit (0–1) = country part × size part × tool part. Not qualified → 0.
  - country: target 1, outside 0.3, unknown 0.5 (any if no targets).
  - size: the band weight from `kb/icp.md`, unknown 0.5.
  - tool: target tool seen 1, none 0.6 (any if no targets).
- trigger (0–1) = 1 − Π(1 − strength), strength = kind weight × 0.5^(age days / half-life).
  Several signals add up with diminishing returns. No signal → trigger 0 → score 0.
- score = round(100 × fit × trigger). Ties: the stronger trigger first.

**Defaults (assumed, tune on outcomes):** request 0.9 · job 0.7 · comment 0.6 · ad 0.6 · tech 0.5 · register 0.4 ·
review 0.3; half-life 30 days; size 1-10 0.6, 11-50 1, 51-200 0.8, 201-500 0.4, 500+ 0.1.

**Rules (generic practice, sourced):**
- Rank, not score: every rank links to its evidence. Use bands and order, not the number, in conversation.
- Explain with the trigger named ("score = fit × trigger" with the trigger spelled out, as in explorium's gtm-skills).
- Calibrate on outcomes: the weekly review compares positive replies per signal kind and source; weights move only
  after ≥ 30 delivered per group.
- A real fact always beats an estimate. Keep the method with every derived number.
