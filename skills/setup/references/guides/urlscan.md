# urlscan.io API key

1. Sign up with the urlscan link in `kb/tools.md` and confirm your email.
2. Top right → your name → **Settings & API** (or **Profile** → **API keys**) → **New API key** → description
   `lead-engine` → **Create**. Copy the key.
3. Give it to Claude as `URLSCAN_API_KEY` (local `.env.local`; cloud: environment secret).

The free key sees public scans of the last 30 days, about 1,000 searches a day (sourced; your account page shows the
exact quota). Two third-party sources say the free tier is for non-commercial use: read urlscan's terms, and if your
use is commercial, check their paid plans (30-day trial).
