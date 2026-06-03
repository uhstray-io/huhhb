#!/usr/bin/env pwsh
# huhhb UserPromptSubmit hook (PowerShell) — cadence/nudge for the grounding skill.
# Mirrors grounding-check.sh. Opt-in only; silent no-op otherwise. Never blocks; always exits 0.
# Uses integer Unix epoch via [DateTimeOffset] (NOT Get-Date -UFormat %s, which is float + locale-dependent).

$ErrorActionPreference = 'SilentlyContinue'
try { $payload = [Console]::In.ReadToEnd() } catch { $payload = '' }

$homeDir = if ($env:HOME) { $env:HOME } elseif ($env:USERPROFILE) { $env:USERPROFILE } else { '' }
$marker  = Join-Path $homeDir '.claude/grounding.on'

# opt-in gate
$on = $false
if ($env:HUHHB_GROUNDING -and ($env:HUHHB_GROUNDING.ToLower() -in @('1','true','on','yes'))) { $on = $true }
if (Test-Path -LiteralPath $marker) { $on = $true }
if (-not $on) { exit 0 }

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

# interval (minutes): env > marker > 120
$intervalMin = 0
if ($env:HUHHB_GROUNDING_INTERVAL_MIN -match '^\d+$') { $intervalMin = [int]$env:HUHHB_GROUNDING_INTERVAL_MIN }
if ($intervalMin -lt 1 -and (Test-Path -LiteralPath $marker)) {
  $m = Select-String -LiteralPath $marker -Pattern '^\s*interval_min\s*=\s*(\d+)' | Select-Object -First 1
  if ($m) { $intervalMin = [int]$m.Matches[0].Groups[1].Value }
}
if ($intervalMin -lt 1) { $intervalMin = 120 }
$intervalS = $intervalMin * 60

$idleMin = 30
if ($env:HUHHB_GROUNDING_IDLE_MIN -match '^\d+$') { $idleMin = [int]$env:HUHHB_GROUNDING_IDLE_MIN }
$idleS = $idleMin * 60

$cooldownMin = 15
if ($env:HUHHB_GROUNDING_COOLDOWN_MIN -match '^\d+$') { $cooldownMin = [int]$env:HUHHB_GROUNDING_COOLDOWN_MIN }
$cooldownS = $cooldownMin * 60

# session id -> per-session state file
$sid = 'nosession'
$sm = [regex]::Match($payload, '"session_id"\s*:\s*"([^"]*)"')
if ($sm.Success -and $sm.Groups[1].Value) { $sid = $sm.Groups[1].Value }
$tmpDir = if ($env:TMPDIR) { $env:TMPDIR } else { [System.IO.Path]::GetTempPath() }
$state = Join-Path $tmpDir ("huhhb-grounding-" + $sid)

$lastGround = 0; $lastPrompt = 0; $lastNudge = 0
if (Test-Path -LiteralPath $state) {
  $txt = Get-Content -LiteralPath $state -Raw
  $g = [regex]::Match($txt, '(?m)^last_ground=(\d+)'); if ($g.Success) { $lastGround = [int64]$g.Groups[1].Value }
  $p = [regex]::Match($txt, '(?m)^last_prompt=(\d+)'); if ($p.Success) { $lastPrompt = [int64]$p.Groups[1].Value }
  $n = [regex]::Match($txt, '(?m)^last_nudge=(\d+)');  if ($n.Success) { $lastNudge  = [int64]$n.Groups[1].Value }
}

# decide (before updating timestamps)
$nudge = $false; $reason = ''
if ($lastGround -eq 0) {
  $lastGround = $now                      # first prompt of a session — baseline-grounded, no nudge
} elseif (($now - $lastGround) -ge $intervalS) {
  $nudge = $true; $reason = "the configured interval ($intervalMin min) has elapsed since the last checkpoint"
} elseif ($lastPrompt -gt 0 -and ($now - $lastPrompt) -ge $idleS) {
  $nudge = $true; $reason = "you returned after a long idle gap (>= $idleMin min)"
}
if ($nudge -and $lastNudge -gt 0 -and ($now - $lastNudge) -lt $cooldownS) { $nudge = $false }

# persist state atomically
$newNudge = if ($nudge) { $now } else { $lastNudge }
$tmp = "$state.tmp.$PID"
try {
  Set-Content -LiteralPath $tmp -Value @("last_ground=$lastGround", "last_prompt=$now", "last_nudge=$newNudge")
  Move-Item -LiteralPath $tmp -Destination $state -Force
} catch { }

if (-not $nudge) { exit 0 }

$ctx = "Grounding checkpoint due — $reason. Finish the user's current request first, then at the next natural pause run the /grounding skill: offer the check menu (default all), run the selected checks (work snapshot, /simplify + /security-review, test/build/lint health, repo conformance, goal/scope, gaps & next steps), report (naming any skipped), and propose any edits confirm-first. State file for this session: $state — when the checkpoint genuinely completes, stamp last_ground there (see the grounding skill's reference.md). Advisory only: 'not now' snoozes, 'skip' skips once, 'stop grounding' disables for the session."
$esc = $ctx.Replace('\', '\\').Replace('"', '\"')
Write-Output ('{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"' + $esc + '"}}')
exit 0
