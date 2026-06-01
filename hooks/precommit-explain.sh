#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — pairs with the explaining-changes skill.
#
# When a `git commit` is about to run, this injects an advisory reminder to give
# the explaining-changes pre-commit summary before the message is composed.
#
# Advisory ONLY: it emits `additionalContext` and exits 0. It sets no
# permissionDecision, so the commit proceeds through the normal permission flow.
# A PreToolUse hook cannot force narration — it can only nudge.

payload=$(cat)

# The matcher already limits this to Bash calls; react only to git commits.
if printf '%s' "$payload" | grep -Eq 'git[[:space:]]+commit'; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"explaining-changes pre-commit checkpoint: before composing this commit, give a brief change summary that frames the new behavior (educate, don't report), with a small ASCII diagram only if structure or flow changed. Let that summary inform the commit message; if caveman-commit is active, hand it the summary. Advisory only — skip if explaining-changes is not active or the user turned it off."}}
JSON
fi

exit 0
