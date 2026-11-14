#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — verify claims before posting PR text to GitHub.
#
# Denies `gh pr create|edit|comment|review`, and `gh api` writes to a comments
# endpoint, until the command carries CLAIMS_VERIFIED=1. The deny reason (shown to
# Claude) asks it to check every file:line, count, list and test name in the text
# against the current head, then re-run the same command prefixed with
# CLAIMS_VERIFIED=1. Guard for docs/MISTAKES.md entry 1.1.
#
# Why deny, not additionalContext: PreToolUse additionalContext is added
# alongside the tool result, so a reminder would arrive after the text was posted.
#
# `gh` only counts at a command start: right after "command":", or after ; & | (
# or an escaped newline, optionally behind NAME=value env prefixes. A commit message
# that merely mentions `gh pr create` passes.

payload=$(cat)

case "$payload" in *CLAIMS_VERIFIED=1*) exit 0 ;; esac

start='("command"[[:space:]]*:[[:space:]]*"|[;&|(][[:space:]]*|\\n[[:space:]]*)([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
fire=0
if printf '%s' "$payload" | grep -Eq "${start}gh[[:space:]]+pr[[:space:]]+(create|edit|comment|review)"; then
  fire=1
elif printf '%s' "$payload" | grep -Eq "${start}gh[[:space:]]+api[[:space:]][^;&|]*/comments" \
  && printf '%s' "$payload" | grep -Eq '(-X|--method)[[:space:]=]*(POST|PATCH|PUT)|[[:space:]]-[fF][[:space:]]|--(raw-)?field[[:space:]=]'; then
  fire=1
fi
[ "$fire" = "1" ] || exit 0

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"pr-claim-check: this posts text to GitHub. First confirm every file:line, count, list, version and test name in that text came from a command run against the current head in this session; a number from memory, an earlier commit, or another agent's report is not verified until re-read now (docs/MISTAKES.md 1.1). Then re-run the same command prefixed with CLAIMS_VERIFIED=1."}}
JSON
exit 0
