#!/usr/bin/env sh
# huhhb PreToolUse (Write|Edit) hook — the repo-memory Record Contract gate.
#
# Delegates to scripts/repo-memory-lint.ts: BLOCKS in-place edits to an
# agent record's content (supersede-never-edit; status:/promote: metadata
# flips whitelisted), WARNS on prose heuristics. Silent for MEMORY.md,
# human-curated memories, wip/ journals, and everything outside
# .claude/memory/. Degrades to a no-op when node is unavailable.

payload=$(cat)

# Cheap pre-filter: only engage when the payload targets the memory store.
# Shell-builtin match — this path runs on every Write/Edit, zero forks.
case "$payload" in
  *'.claude/memory/'*) ;;
  *) exit 0 ;;
esac

command -v node >/dev/null 2>&1 || exit 0
script="${CLAUDE_PLUGIN_ROOT}/scripts/repo-memory-lint.ts"
[ -f "$script" ] || script="$(dirname "$0")/../scripts/repo-memory-lint.ts"
[ -f "$script" ] || exit 0

printf '%s' "$payload" | node "$script"
exit 0
