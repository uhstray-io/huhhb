#!/usr/bin/env sh
# huhhb PostToolUse (Bash) hook — PR-creation consolidation trigger for
# repo-memory's per-commit staging journals.
#
# All logic lives in repo-memory-pr-consolidate.js (payload parsing via
# tool_input.command — output text mentioning "gh pr create" must not
# false-trigger — and JSON-safe emission). The wrapper only locates the
# program and passes stdin THROUGH to it; the program must be a file, not
# a `node -` heredoc, or the payload read would see EOF. Degrades to a
# no-op without node.

command -v node >/dev/null 2>&1 || exit 0
js="${CLAUDE_PLUGIN_ROOT}/hooks/repo-memory-pr-consolidate.js"
[ -f "$js" ] || js="$(dirname "$0")/repo-memory-pr-consolidate.js"
[ -f "$js" ] || exit 0

exec node "$js"
