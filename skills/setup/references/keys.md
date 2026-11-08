# Keys: where to get them, what they cost

Each key goes to `.env.local` and Vercel (`vercel env add <NAME> production`), then redeploy. None goes to `kb/` or git.
Prices: sourced from the provider or measured in the author's runs (2026-10/11); check the provider before paying.

| Variable | Where | Cost | Needed for |
|---|---|---|---|
| `URLSCAN_API_KEY` | urlscan.io → sign up → Settings & API → new API key | free: 1,000 searches/day, last 30 days | source-tech, daily cron |
| `GCP_SA_KEY` | Google Cloud (below) | BigQuery free tier 1 TB of queries/month; one crawl export ~3 GB (measured) | source-tech (HTTP Archive) |
| `MILLIONVERIFIER_API_KEY` | millionverifier.com → API | ~$0.0037/check on one-time packs (to confirm on their page) | verify |
| `APOLLO_API_KEY` | Apollo → Settings → Integrations → API | free people search only (the app never calls paid endpoints) | source-people |
| `MONID_API_KEY` | monid.ai | pay per call; $1 free credit (sourced 2026-11-08) | find-contact, verify fallback |
| `APIFY_TOKEN` | console.apify.com → Settings → Integrations | pay per result (see source-social references) | source-social, activity-research |
| `HACKERTARGET_API_KEY` | hackertarget.com | free tier limited; membership $10/mo (reverse-IP coverage unverified) | optional reverse IP |

## Google Cloud service account for BigQuery (5 minutes)
Console: create a project → enable the BigQuery API → IAM → Service accounts → create `lead-engine` → role
**BigQuery Job User** → Keys → add JSON key. Or with gcloud:
```bash
P=lead-engine-bq-$RANDOM
gcloud projects create $P && gcloud services enable bigquery.googleapis.com --project $P
gcloud iam service-accounts create lead-engine --project $P
gcloud projects add-iam-policy-binding $P --member "serviceAccount:lead-engine@$P.iam.gserviceaccount.com" --role roles/bigquery.jobUser
gcloud iam service-accounts keys create key.json --iam-account "lead-engine@$P.iam.gserviceaccount.com"
echo "GCP_SA_KEY=$(base64 < key.json | tr -d '\n')" >> .env.local && rm key.json
```
A project without billing runs in the BigQuery sandbox (free tier limits). The app caps every query with
`maximumBytesBilled` and a dry run, so a mistake cannot scan terabytes.

## Mailboxes (later, before the first send)
Buy or reuse secondary domains (never the main one) and warmed mailboxes; see
`.claude/skills/outreach-review/references/sending-infra.md` (Zapmail facts, caps, warm-up, app passwords).
Add them in the app: Settings → Mailboxes.
