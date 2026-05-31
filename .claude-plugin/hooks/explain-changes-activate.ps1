# huhhb SessionStart hook — opt-in always-on narration for explaining-changes.
# PowerShell parity of explain-changes-activate.sh.
#
# Off by default. Activates ONLY when the user opts in, via either:
#   * env var   HUHHB_EXPLAIN_CHANGES  set to a truthy value (1/true/on/yes), or
#   * marker file  ~/.claude/explaining-changes.on
# Otherwise it is a silent no-op (emits nothing, exits 0).

$on = $false
if ("$env:HUHHB_EXPLAIN_CHANGES".ToLower() -in @('1','true','on','yes')) { $on = $true }
foreach ($home in @($env:HOME, $env:USERPROFILE)) {
  if ($home -and (Test-Path (Join-Path $home '.claude/explaining-changes.on'))) { $on = $true }
}

if ($on) {
  $ctx = 'explaining-changes narration is ON for this session (opt-in via huhhb). Treat narration as standing behavior: after each logical change, after each completed plan task, and before every commit, give a brief summary — at most ~4 sentences plus at most one simple ASCII diagram, and include the diagram only when structure or flow actually changed. Educate, don''t report: frame what the system now does, not the edit list. Use ASCII (not mermaid) in chat. Say ''stop explaining'' to disable for this session.'
  $out = @{ hookSpecificOutput = @{ hookEventName = 'SessionStart'; additionalContext = $ctx } } | ConvertTo-Json -Compress
  Write-Output $out
}

exit 0
