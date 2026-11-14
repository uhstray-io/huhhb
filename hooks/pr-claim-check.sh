#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — verify claims before posting PR text to GitHub.
#
# Denies `gh pr create|edit|comment|review`, and `gh api` writes to a comments
# endpoint, unless that gh call is prefixed with CLAIMS_VERIFIED=1. The deny reason
# (shown to Claude) asks it to check every file:line, count, list and test name in
# the text against the current head, then re-run the same command with the prefix.
# Guard for docs/MISTAKES.md entry 1.1. Covers the Bash `gh` path only; GitHub MCP
# tools do not pass through this hook.
#
# Why deny, not additionalContext: PreToolUse additionalContext is added
# alongside the tool result, so a reminder would arrive after the text was posted.
#
# A gh call only counts at a command start: right after "command":", after ; & |
# $( or a backtick, or at a line start, optionally behind NAME=value prefixes.
# So a commit message that mentions `gh pr create` mid-line passes; one with a
# line that starts with `gh pr create` is denied (rephrase it).
# ponytail: regex over the JSON payload, not a shell parser; wrappers such as
# `bash -c`, `xargs gh` or `gh -R o/r pr …` are not caught.

payload=$(cat)

start='("command"[[:space:]]*:[[:space:]]*"|[;&|`]|\$\(|\\n)[[:space:]]*'
envs='([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
segs=$(printf '%s' "$payload" \
  | grep -Eo "${start}${envs}gh[[:space:]]+(pr[[:space:]]+(create|edit|comment|review)|api[[:space:]][^;&|]*)" 2>/dev/null)
[ -n "$segs" ] || exit 0

fire=0
set -f
IFS='
'
for seg in $segs; do
  pre=${seg%%gh[[:space:]]*}                 # the env prefix in front of this gh call
  case "$pre" in *CLAIMS_VERIFIED=1*) continue ;; esac
  if printf '%s' "$seg" | grep -Eq 'gh[[:space:]]+pr[[:space:]]'; then
    fire=1; break
  fi
  # gh api: only writes to a comments endpoint (an explicit GET is a read)
  printf '%s' "$seg" | grep -q '/comments' || continue
  printf '%s' "$seg" | grep -Eq '(-X|--method)[[:space:]=]*GET' && continue
  if printf '%s' "$seg" | grep -Eq '(-X|--method)[[:space:]=]*(POST|PATCH|PUT)|[[:space:]]-[fF]|--(raw-)?field'; then
    fire=1; break
  fi
done
[ "$fire" = "1" ] || exit 0

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"pr-claim-check: this posts text to GitHub. First confirm every file:line, count, list, version and test name in that text came from a command run against the current head in this session; a number from memory, an earlier commit, or another agent's report is not verified until re-read now (docs/MISTAKES.md 1.1). Then re-run the same command with CLAIMS_VERIFIED=1 directly in front of that gh call. If the command does not post (e.g. a commit message with a line starting `gh pr …`), rephrase that line instead."}}
JSON
exit 0
