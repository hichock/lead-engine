#!/usr/bin/env bash
# Prints the knowledge base map, the latest decisions and the routing reminder at the start of every session
# (local, cloud, scheduled task), so every skill starts from what the system already knows.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
[ -f kb/README.md ] || exit 0
echo "## Lead Engine: read kb/RULES.md and follow it. Read kb/context.md before any task."
echo "Route requests with the table in CLAUDE.md (owner says X -> skill Y). Paid calls only via node scripts/le.mjs."
echo
sed -n '1,40p' kb/README.md
if [ -f kb/decisions.md ]; then
  echo; echo "## Latest decisions"
  grep -m 10 -E '^- ' kb/decisions.md
fi
if [ -f kb/setup-state.md ] && grep -q '\[ \]' kb/setup-state.md; then
  echo; echo "## Setup is not finished. Open steps:"; grep '\[ \]' kb/setup-state.md | head -5
  echo "Resume with /lead-engine:setup (or follow kb/setup-state.md) before other work."
fi
latest=$(ls -1 kb/runs/*.md 2>/dev/null | sort | tail -3)
if [ -n "$latest" ]; then echo; echo "## Latest runs"; echo "$latest"; fi
exit 0
