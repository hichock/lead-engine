# GitHub

## Account
Sign up at the GitHub link in `kb/tools.md` (free private repos are enough).

## Log in the GitHub CLI (local computer)
1. Install: macOS `brew install gh`; Windows `winget install GitHub.cli`; Linux: see cli.github.com.
2. Run `gh auth login`. Answer: GitHub.com → HTTPS → "Login with a web browser".
3. Copy the one-time code it shows, press Enter, paste the code in the browser page, click **Authorize**.
4. Check: `gh auth status` says "Logged in to github.com".

## The repo
Claude creates it for you after the plan is approved: `gh repo create <name> --private --source . --push`.
Keep it **private**: it holds your knowledge base.

## In a cloud session
Claude can't create a repo from a cloud session. See `claude-cloud-session.md` to make an empty repo and attach it.

## Make an empty private repo by hand (if asked)
1. github.com → top right **+** → **New repository**.
2. Name it (for example `lead-engine`), choose **Private**, leave "Add a README" unticked, click **Create repository**.
