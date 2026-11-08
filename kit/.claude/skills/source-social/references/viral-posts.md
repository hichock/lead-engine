# Finding fast-rising posts

Source: the bundle author's trend-sources research (2026-11). Thresholds are starting guesses (guess); tune them on
your own data after a week of stored posts.

- **Engagement score** = likes + 3 × comments + 5 × shares.
- **Velocity** = (score, or comments, per hour since posting) ÷ the author's own median for the same measure.
  Needs the author's last ~8 posts once; cache the median for 30 days. Actor: `harvestapi/linkedin-profile-posts`
  (80 posts cost $0.16, measured).
- **Flag** at velocity ≥ 3× **and** ≥ 30 comments in 24 h.
- **Gate ratio:** comments ÷ likes > 0.8 means a giveaway or comment gate ("comment WORD").
- **Copy wave:** 3+ similar first lines from different authors inside 7 days = a format spreading; note it, don't chase it.
- **Daily cost** for ~80 search posts + 30 watch-list posts + baselines + X: about $0.32 (assumed from list prices).

## Buyer share by cut (measured)
| Cut | Buyers |
|---|---|
| LinkedIn, 11 posts, 532 unique commenters (2026-10-29) | 17 (3.2%); spot checks suggest 3–6% |
| X, 4 posts, 460 | 3 (0.7%); 32% empty bios |
| TikTok / Instagram, 51 | not classifiable (usernames only) |
| Two giveaway creators, 479 (2026-11-06) | ~15 (~3%) |
| Niche-topic posts vs generic | 5.6% vs 1.5% |
| Soft gate ("free access below") vs "comment WORD" | 6.1% vs 1.3% (n = 11 posts) |
