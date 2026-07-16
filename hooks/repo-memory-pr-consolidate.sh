#!/usr/bin/env sh
# huhhb PostToolUse (Bash) hook — PR-creation consolidation trigger for
# repo-memory's per-commit staging journals.
#
# When a `gh pr create` just ran and the current branch has a staging
# journal (.claude/memory/wip/<branch-slug>.md), instruct the session to
# consolidate it into ONE PR outcome record via the repo-memory skill.
# Advisory: additionalContext only; the agent does the judgment work.

payload=$(cat)
printf '%s' "$payload" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+create' || exit 0

branch=$(git branch --show-current 2>/dev/null)
[ -n "$branch" ] || exit 0
slug=$(printf '%s' "$branch" | tr '/' '-')
journal=".claude/memory/wip/${slug}.md"
[ -f "$journal" ] || exit 0

cat <<JSON
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"repo-memory PR consolidation: a staging journal exists at ${journal} for this branch. Per the repo-memory skill's Hooks section: read it, consolidate and /simplify its per-commit lines into ONE PR outcome record (agent Record Contract, kind: outcome, evidence = the PR number + commit range) saved via the repo-memory skill's save flow, then delete the journal in the same commit. Do this now, before moving on."}}
JSON
exit 0
