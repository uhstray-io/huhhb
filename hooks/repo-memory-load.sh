#!/usr/bin/env sh
# huhhb SessionStart hook — points the session at this repo's committed memory.
#
# ADR-0004 made plans/architecture/ the store and retired .claude/memory/ for
# new writes, so the ADR index is what a session should read first. A repo that
# has not adopted the ADR layout still gets the old .claude/memory/ pointer —
# there, that directory is the live store, not legacy.
#
# No opt-in required — presence of the file is the signal.

if [ -f "plans/architecture/DECISIONS.md" ]; then
    legacy=""
    if [ -f ".claude/memory/MEMORY.md" ]; then
        legacy=" Pre-ADR records remain in .claude/memory/MEMORY.md as read-only history: retired for new writes, triaged one at a time by fix-memory."
    fi
    cat <<JSON
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"This repo's architecture decisions live in plans/architecture/. Read DECISIONS.md before answering why the repo is built the way it is, and open the records it points at. Records are append-only — supersede, never edit. Save a new ratified decision with /repo-memory.${legacy} Everything else routes away from files: code structure to the code graph, and deliberation, outcomes and preferences to this repo's Hindsight bank."}}
JSON
    exit 0
fi

if [ -f ".claude/memory/MEMORY.md" ]; then
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Repo memory is active for this project. Read .claude/memory/MEMORY.md now to load the project knowledge index, then open any memory files relevant to the current task. Check memory before answering questions about project decisions, conventions, or context. Use /repo-memory to save new memories during this session."}}
JSON
fi

exit 0
