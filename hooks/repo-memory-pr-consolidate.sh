#!/usr/bin/env sh
# huhhb PostToolUse (Bash) hook — PR-creation consolidation trigger for
# repo-memory's per-commit staging journals.
#
# All logic lives in repo-memory-pr-consolidate.js (payload parsing via
# tool_input.command — output text mentioning "gh pr create" must not
# false-trigger — and JSON-safe emission). The wrapper buffers stdin so it
# can pre-filter with a shell-builtin match BEFORE paying node startup (this
# hook fires on every Bash tool call; `gh pr create` happens ~once a branch),
# then feeds the payload to the program. The program must be a file, not a
# `node -` heredoc, or the payload read would see EOF. Degrades to a no-op
# without node.

payload=$(cat)

# Over-broad superset filter — the JS regex on tool_input.command stays the
# authoritative trigger check (guards against output-text false mentions).
case "$payload" in
  *gh*pr*create*) ;;
  *) exit 0 ;;
esac

command -v node >/dev/null 2>&1 || exit 0
js="${CLAUDE_PLUGIN_ROOT}/hooks/repo-memory-pr-consolidate.js"
[ -f "$js" ] || js="$(dirname "$0")/repo-memory-pr-consolidate.js"
[ -f "$js" ] || exit 0

printf '%s' "$payload" | node "$js"
exit 0
