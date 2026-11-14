#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — verify-before-posting reminder for PR text.
#
# Right before text is posted to GitHub (gh pr create/edit/comment/review, or a
# gh api write to a comments endpoint), injects a reminder that every file:line,
# count, list and test name in that text must come from a command run against the
# current head in this session. Guard for docs/MISTAKES.md entry 1.1.
#
# Advisory ONLY: emits additionalContext and exits 0. Sets no permissionDecision.
# Matches against the whole payload, so a command that merely mentions these
# strings (e.g. inside a heredoc) also triggers; the cost is one extra reminder.

payload=$(cat)

fire=0
if printf '%s' "$payload" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+(create|edit|comment|review)'; then
  fire=1
elif printf '%s' "$payload" | grep -Eq 'gh[[:space:]]+api[[:space:]][^"]*/comments' \
  && printf '%s' "$payload" | grep -Eq '(-X|--method)[[:space:]=]*(POST|PATCH|PUT)|[[:space:]]-[fF][[:space:]]|--(raw-)?field[[:space:]=]'; then
  fire=1
fi
[ "$fire" = "1" ] || exit 0

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"pr-claim-check: this posts text to GitHub. Before it runs, confirm every file:line, count, list, version and test name in that text came from a command run against the current head in this session. A number from memory, an earlier commit, or another agent's report is not verified until re-read now (docs/MISTAKES.md 1.1). Advisory only."}}
JSON
exit 0
