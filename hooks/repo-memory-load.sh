#!/usr/bin/env sh
# huhhb SessionStart hook — auto-loads repo memory index at session start.
#
# Fires automatically when .claude/memory/MEMORY.md exists in the project root.
# Instructs Claude to read the memory index so project knowledge is available
# without requiring the user to invoke /repo-memory manually each session.
#
# No opt-in required — presence of MEMORY.md is the signal.

if [ ! -f ".claude/memory/MEMORY.md" ]; then
    exit 0
fi

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Repo memory is active for this project. Read .claude/memory/MEMORY.md now to load the project knowledge index, then open any memory files relevant to the current task. Check memory before answering questions about project decisions, conventions, or context. Use /repo-memory to save new memories during this session."}}
JSON

exit 0
