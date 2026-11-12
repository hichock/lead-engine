#!/usr/bin/env bash
# Refuses a commit when an env file or prospects' personal data is staged. Setup runs it before every commit:
#   git add -A && bash scripts/check-staged.sh && git commit -m "…"
# and scripts/scaffold.sh (in the bundle) installs it as the repo's pre-commit hook when the repo has none.
# Blocks: .env and .env.* (except .env.example), data/ and *.db (local store in data/), docs/report.html, *.pem and *.key.
set -euo pipefail
bad=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '(^|/)\.env($|\.)|^data/|\.db(-wal|-shm)?$|(^|/)docs/report\.html$|\.(pem|key)$' | grep -vE '(^|/)\.env\.example$' || true)
if [ -n "$bad" ]; then
  echo "Refusing to commit. These files must never be in git:" >&2
  printf '%s\n' "$bad" | sed 's/^/  /' >&2
  echo "Unstage them with: git restore --staged <file>   (.gitignore needs: .env*  !.env.example  data/  *.db  docs/report.html)" >&2
  exit 1
fi
echo "Staged files checked: no env or personal-data files."
