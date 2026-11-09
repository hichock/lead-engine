# Google Cloud: a key for HTTP Archive on BigQuery

Free: BigQuery gives 1 TB of queries a month; one export of a tool's sites over a monthly crawl used about 3 GB in the
author's runs (measured 2026-11-03). The app dry-runs every query and caps it (30 GB a day, 200 GB per query), so a
mistake can't scan terabytes. New Google Cloud customers also get a $300 credit (`kb/tools.md`).

## With clicks (about 5 minutes)
1. Open console.cloud.google.com and sign in with any Google account. Accept the terms.
2. Top bar → project picker → **New project** → name `lead-engine-bq` → **Create**. Make sure it is selected.
3. Search bar → "BigQuery API" → **Enable**.
4. Menu → **IAM & Admin** → **Service accounts** → **Create service account** → name `lead-engine` → **Create and continue**.
5. Role: **BigQuery Job User** → **Continue** → **Done**.
6. Click the new account → **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**. A file downloads.
7. Give the file to Claude in a local session ("the key is in Downloads/<file>.json"). Claude stores it base64-encoded as
   `GCP_SA_KEY` in `.env.local` and your host, then deletes the file. In a cloud session, paste the file's contents
   into the environment's secret `GCP_SA_KEY` yourself.
No billing account is needed: without one the project runs in the BigQuery sandbox.

## With gcloud (local)
```bash
P=lead-engine-bq-$RANDOM
gcloud projects create $P && gcloud services enable bigquery.googleapis.com --project $P
gcloud iam service-accounts create lead-engine --project $P
gcloud projects add-iam-policy-binding $P --member "serviceAccount:lead-engine@$P.iam.gserviceaccount.com" --role roles/bigquery.jobUser
gcloud iam service-accounts keys create key.json --iam-account "lead-engine@$P.iam.gserviceaccount.com"
echo "GCP_SA_KEY=$(base64 < key.json | tr -d '\n')" >> .env.local && rm key.json
```
Some organisations block key creation ("iam.disableServiceAccountKeyCreation"): use a personal Google account instead.
