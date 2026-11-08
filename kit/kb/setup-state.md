# Setup state

Status: not started. The setup skill ticks items as they finish and resumes from the first open one.
Values that are not secret (project ref, URLs) go in the right-hand column; keys never go here.

## 1. Tools
- [ ] node ≥ 20, git, gh, supabase CLI, vercel CLI installed
## 2. Logins
- [ ] `gh auth status` ok
- [ ] `supabase projects list` ok
- [ ] `vercel whoami` ok
## 3. Knowledge base
- [ ] Website read, kb files auto-drafted (context, offer, icp, voice, sources)
- [ ] Owner answered "what's wrong?" (max 8 questions) and corrections written
## 4. Infrastructure
- [ ] GitHub repo created (private) and pushed - repo:
- [ ] Supabase project created - ref: , region:
- [ ] Migrations applied (`supabase db push`)
- [ ] Owner email added to `team_members`; auth site URL + redirect set
- [ ] Vercel project linked, env vars set, deployed - URL:
- [ ] pg_cron schedule installed (`supabase/sql/schedule.sql` filled and run)
## 5. Keys (names only; values live in .env.local, Vercel and the cloud environment)
- [ ] URLSCAN_API_KEY
- [ ] GCP_SA_KEY (BigQuery, for HTTP Archive)
- [ ] MILLIONVERIFIER_API_KEY
- [ ] optional: APOLLO_API_KEY, MONID_API_KEY, APIFY_TOKEN, HACKERTARGET_API_KEY
## 6. Sending (can wait until leads exist)
- [ ] Sending domains and mailboxes chosen (never the main domain), SPF/DKIM/DMARC checked
- [ ] Mailboxes added in Settings; forward-to address set
## 7. Schedule
- [ ] Recurring runs scheduled (Claude Code scheduled tasks or GitHub Actions) - where:
## 8. First run
- [ ] `source-tech` ran with $0 sources; first companies visible on the Leads page
- [ ] "What happens next" shown to the owner
