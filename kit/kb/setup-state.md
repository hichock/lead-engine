# Setup state

Status: not started. The setup skill ticks items as they finish and resumes from the first open one.
Values that are not secret (mode, project ref, URLs) go after the item; keys never go here.

## 1. Environment
- [ ] Session checked: local or cloud; repo situation; connectors (Supabase, Vercel, GitHub); CLIs logged in; env vars (names only) - found:
- [ ] Project folder ready, kit and app copied, `npm install` done
## 2. Plan
- [ ] Website researched; kb/context, offer, icp, voice and research/market drafted (labelled)
- [ ] kb/plan.md + docs/plan.html + docs/dashboard-mock.html written
- [ ] Plan approved by the owner (decision in kb/decisions.md)
## 3. Mode
- [ ] Mode chosen and confirmed (A Supabase + Vercel / B own host and database / C local) - mode:
## 4. Infrastructure (only what the mode needs)
- [ ] Repo: created or reused (private) and pushed - repo:
- [ ] A/B: database ready (Supabase project created or reused) - ref: , region:
- [ ] A/B: migrations applied
- [ ] A/B: owner email in `team_members`; auth site URL + redirect set
- [ ] A/B: app deployed with env vars - URL:
- [ ] A/B: frequent jobs scheduled (pg_cron, or the host's scheduler) - where:
- [ ] C: local store initialised (`le init`) - store:
## 5. Keys for the plan's sources (names only; values live in .env.local and the host or cloud environment)
- [ ] URLSCAN_API_KEY
- [ ] GCP_SA_KEY (BigQuery, for HTTP Archive), if the plan uses tech search
- [ ] MILLIONVERIFIER_API_KEY (before the first send)
- [ ] optional, per plan: APOLLO_API_KEY, MONID_API_KEY, APIFY_TOKEN, HACKERTARGET_API_KEY
## 6. Sending (can wait until leads exist)
- [ ] Sending domains and mailboxes chosen (never the main domain), SPF/DKIM/DMARC checked
- [ ] A/B: mailboxes added in Settings; forward-to address set. C: MAILBOX_n in .env.local, or a sequencer chosen
## 7. Schedule
- [ ] Recurring runs scheduled (Claude Code scheduled tasks, desktop tasks, GitHub Actions or cron) - where:
## 8. First run
- [ ] First $0 run done; first companies visible (app Leads page or docs/report.html)
- [ ] "What happens next" shown to the owner
