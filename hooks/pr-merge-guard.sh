#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — no merge while review findings are unanswered.
#
# Denies `gh pr merge` while the PR has an unresolved review thread whose last
# comment is not by the merging user, i.e. a finding nobody has fixed-and-resolved
# or replied to. The deny reason (shown to Claude) names the count; re-running the
# merge with REVIEW_ANSWERED=1 directly in front of that gh call lets it through.
# Guard for docs/MISTAKES.md entry 2.1 (PR #60 merged with 4 findings unanswered).
#
# One GraphQL query per merge (two when the PR number is omitted). Fails open: if gh
# cannot answer (offline, not a repo, no auth) the merge proceeds as before.
# ponytail: first 100 threads only; `gh pr merge -R o/r` checks the cwd repo instead.

payload=$(cat)

start='("command"[[:space:]]*:[[:space:]]*"|[;&|`]|\$\()[[:space:]]*'
envs='([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
seg=$(printf '%s' "$payload" | sed -e 's/\\\\\\n/ /g' -e 's/\\n/;/g' \
  | grep -Eo "${start}${envs}gh[[:space:]]+pr[[:space:]]+merge[^;&|]*" 2>/dev/null | head -n1)
[ -n "$seg" ] || exit 0

pre=${seg%%gh[[:space:]]*}
case "$pre" in REVIEW_ANSWERED=1' '*|*[!A-Za-z0-9_]REVIEW_ANSWERED=1' '*) exit 0 ;; esac

cwd=$(printf '%s' "$payload" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[ -n "$cwd" ] && cd "$cwd" 2>/dev/null

n=$(printf '%s' "$seg" | sed -n 's/.*gh[[:space:]]*pr[[:space:]]*merge[[:space:]]*\([0-9][0-9]*\).*/\1/p')
[ -n "$n" ] || n=$(gh pr view --json number -q .number 2>/dev/null)
case "$n" in ''|*[!0-9]*) exit 0 ;; esac

open=$(gh api graphql -F owner='{owner}' -F name='{repo}' -F n="$n" -f query='
query($owner: String!, $name: String!, $n: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) { pullRequest(number: $n) {
    reviewThreads(first: 100) { nodes { isResolved comments(last: 1) { nodes { author { login } } } } }
  } }
}' --jq '.data.viewer.login as $me | [.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved | not) | select(.comments.nodes[0].author.login != $me)] | length' 2>/dev/null)
case "$open" in ''|*[!0-9]*|0) exit 0 ;; esac

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"pr-merge-guard: PR #%s has %s unresolved review thread(s) whose last comment is not yours. Fix each finding and push, or reply on its thread with the reason it is not changed, then merge again. If every finding is already answered elsewhere, re-run the merge with REVIEW_ANSWERED=1 directly in front of that gh call."}}\n' "$n" "$open"
exit 0
