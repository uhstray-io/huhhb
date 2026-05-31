# huhhb PreToolUse (Bash) hook — PowerShell parity of precommit-explain.sh.
#
# When a `git commit` is about to run, injects an advisory reminder to give the
# explaining-changes pre-commit summary before the message is composed.
#
# Advisory ONLY: emits `additionalContext` and exits 0. Sets no permissionDecision,
# so the commit proceeds through the normal permission flow. A PreToolUse hook
# cannot force narration — it can only nudge.

$payload = [Console]::In.ReadToEnd()

# The matcher already limits this to Bash calls; react only to git commits.
if ($payload -match 'git\s+commit') {
  $ctx = 'explaining-changes pre-commit checkpoint: before composing this commit, give a brief change summary that frames the new behavior (educate, don''t report), with a small ASCII diagram only if structure or flow changed. Let that summary inform the commit message; if caveman-commit is active, hand it the summary. Advisory only — skip if explaining-changes is not active or the user turned it off.'
  $out = @{ hookSpecificOutput = @{ hookEventName = 'PreToolUse'; additionalContext = $ctx } } | ConvertTo-Json -Compress
  Write-Output $out
}

exit 0
