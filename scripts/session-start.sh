#!/usr/bin/env bash
# Lead Engine plugin hook. The real work lives in the project kit (copied by /lead-engine:setup), because plugins
# don't load in cloud sessions or scheduled tasks. This hook only points to setup when the kit is missing.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
# The project's own hook prints the knowledge base; stay quiet to avoid duplicates.
[ -f .claude/hooks/session-start.sh ] && exit 0
if [ -f kb/setup-state.md ]; then
  echo "Lead Engine: setup is in progress here (kb/setup-state.md). Resume with /lead-engine:setup."
else
  echo "Lead Engine plugin is installed. This folder has no Lead Engine project yet: run /lead-engine:setup to create one (repo, database, deploy, knowledge base)."
fi
echo "Lead Engine plugin root: ${CLAUDE_PLUGIN_ROOT}"
exit 0
