# Apify actors used and what they cost

measured = the author's runs (date); sourced = Apify store page read 2026-11-08. Prices change: check the actor page
before a big run. The app passes `maxUsd` as Apify's `maxTotalChargeUsd`, so a run cannot spend more than that.

| Actor | Use | Cost seen | Notes |
|---|---|---|---|
| `harvestapi/linkedin-post-search` | posts by keyword, `postedLimit` 1h–month | $0.002/post (279 posts $0.56) | Quoted phrases only; no follower count in output |
| `harvestapi/linkedin-post-comments` | commenters of any public post, no cookie | $0.002/comment (549 for $1.10, 2026-10-29). Store: "from $1.50/1k", README $2/1k; 3,241 monthly users (sourced 2026-11-08) | Cap ~75–130 per post |
| `harvestapi/linkedin-profile-posts` | an author's recent posts (velocity baseline) | 80 posts $0.16 | |
| `harvestapi/linkedin-profile-comments` / `harvestapi/linkedin-profile-reactions` | a prospect's own comments and likes | $2/1k each (sourced 2026-11-08); 11 prospects → 342 comments + 440 likes ≈ $1.60 (2026-11-06) | activity-research |
| `harvestapi/linkedin-profile-search` | people by keyword + title + size | $0.10 per 25; $4/1k full; $10/1k with email search (sourced); 47 profiles $0.20 | 18 of 47 were sellers: use it for the person at a known company |
| `apidojo/tweet-scraper`, `kaitoeasyapi` X actors | X search + replies | $0.40/1k and $0.25/1k (sourced 2026-11-06) | apidojo needs ≥ 50 items; kaito returns ~20 minimum |
| `xquik/x-reply-scraper`, `fastcrawler/twitter-reply-scraper` | X replies | $0.15/1k, $0.40/1k (sourced 2026-11-08) | Several X actors show maintenance flags: test on 1 post first |
| `clockworks~tiktok-*`, `apify~instagram-*` | comments | $0.14 total | Usernames only, can't classify |
| `builtwith/builtwith-official-technology-scraper` | stack of one apex domain | $0.002/domain | Misses subdomain portals |
| `apify/google-search-scraper` | Google dorks | $0.50 minimum per run | 10 portals for $0.56; `site:`/`inurl:` ignored: skip |
| `apify/facebook-ads-scraper` | Meta ads (US) | ~400 ads ≈ $0.60 | 5 of 8 runs had wrong page slugs: check the page first |
| `neatrat/upwork-job-scraper`, `powerai/g2-product-reviews-scraper` | Upwork, G2 | $0.34/99 jobs, $0.48/60 reviews | G2 shows no company names |
| `unseenuser/*` wrappers, `atomus/linkedin-comments-scraper-pro` | LinkedIn comments | ~$5/1k; vendor page lists $4.80/1k (sourced 2026-11-08) | The wrappers make 2+ harvestapi calls each |

**Pitfalls (measured):** the monthly Apify cap was hit twice ($19, then $60), and duplicate runs cost $3.90
(2026-11-02). That is why the app keeps a ledger keyed on (actor, input hash) and refuses a rerun inside 24 h.
No free official route to LinkedIn comments: reading them needs `r_member_social`, granted to select developers only.
Other free routes: Threads `/keyword_search` (2,200 queries/24 h once approved; buyers weren't there), Reddit via the
Arctic Shift API (free; send a User-Agent) or per-subreddit RSS.
