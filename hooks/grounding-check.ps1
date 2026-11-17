#!/usr/bin/env pwsh
# huhhb UserPromptSubmit hook (PowerShell) — volume-of-work nudge for the grounding skill.
# Mirrors grounding-check.sh. Opt-in only; silent no-op otherwise. Never blocks; always exits 0.
#
# Lines changed = own commits since the baseline (baseline..HEAD commits no other local branch or
# remote-tracking ref reaches) + uncommitted work vs HEAD (tracked added+deleted plus untracked text lines),
# minus what was already uncommitted at the baseline. Lockfiles and binary files skipped. Merged-in or
# fast-forwarded work from other branches does not count. Outside a git repo nothing is counted.
# Only typed prompts nudge, once per threshold crossing: the next nudge waits for another full threshold.
#
# Config (precedence high->low): env HUHHB_GROUNDING_LINES > lines=<n> in the marker file > 2500.

$ErrorActionPreference = 'SilentlyContinue'
try { $payload = [Console]::In.ReadToEnd() } catch { $payload = '' }

$homeDir = if ($env:HOME) { $env:HOME } elseif ($env:USERPROFILE) { $env:USERPROFILE } else { '' }
$marker  = Join-Path $homeDir '.claude/grounding.on'

# opt-in gate
$on = $false
if ($env:HUHHB_GROUNDING -and ($env:HUHHB_GROUNDING.ToLower() -in @('1','true','on','yes'))) { $on = $true }
if (Test-Path -LiteralPath $marker) { $on = $true }
if (-not $on) { exit 0 }

# pathspecs left out of the count (lockfiles): same 11 as grounding-check.sh
$excl = @(
  ':(exclude,glob)**/package-lock.json', ':(exclude,glob)**/yarn.lock', ':(exclude,glob)**/pnpm-lock.yaml',
  ':(exclude,glob)**/bun.lock', ':(exclude,glob)**/bun.lockb', ':(exclude,glob)**/Cargo.lock',
  ':(exclude,glob)**/poetry.lock', ':(exclude,glob)**/uv.lock', ':(exclude,glob)**/go.sum',
  ':(exclude,glob)**/composer.lock', ':(exclude,glob)**/Gemfile.lock'
)

# digits-only string -> [int64]; empty, non-digit or overflowing input -> $default
function Get-DigitsOr([string]$s, [int64]$default) {
  $v = [int64]0
  if ($s -and [regex]::IsMatch($s, '\A[0-9]+\z') -and [int64]::TryParse($s, [ref]$v)) { return $v }
  return $default
}

# value of key=... in the state text; the value stops at CR or LF (Set-Content may write CRLF)
function Get-StateValue([string]$key) {
  $m = [regex]::Match($txt, '(?m)^' + $key + '=([^\r\n]*)')
  if ($m.Success) { return $m.Groups[1].Value }
  return ''
}

# run git; returns its stdout lines, or $null when git is missing or exits non-zero
function Invoke-Git([string[]]$GitArgs) {
  try {
    $out = & git @GitArgs 2>$null
    if ($LASTEXITCODE -eq 0) { return $out }
  } catch { }
  return $null
}

# lines in one untracked file; 0 if missing, empty, binary (NUL in first 8000 bytes, as grep -I), or unreadable
function Get-TextLineCount([string]$path) {
  try {
    if (-not [System.IO.File]::Exists($path)) { return [int64]0 }
    $b = [System.IO.File]::ReadAllBytes($path)
    if ($b.Length -eq 0) { return [int64]0 }
    if ([Array]::IndexOf($b, [byte]0, 0, [Math]::Min(8000, $b.Length)) -ge 0) { return [int64]0 }
    $s = [System.Text.Encoding]::GetEncoding(28591).GetString($b)   # Latin1: one char per byte
    $n = [int64]($s.Length - $s.Replace([string][char]10, '').Length)
    if ($b[$b.Length - 1] -ne 10) { $n += 1 }                        # final line without trailing LF
    return $n
  } catch { return [int64]0 }
}

# lines changed between $base and the working tree of $top: tracked added+deleted (binary "-" rows skipped)
# plus untracked text lines
function Get-ChangedLineCount([string]$top, [string]$base) {
  [int64]$total = 0
  $rows = Invoke-Git (@('-C', $top, 'diff', '--numstat', $base, '--', '.') + $excl)
  foreach ($row in $rows) {
    $f = $row -split '\t'
    if ($f.Count -ge 2 -and $f[0] -ne '-') { $total += [int64]($f[0]) + [int64]($f[1]) }
  }
  $paths = Invoke-Git (@('-C', $top, '-c', 'core.quotePath=false', 'ls-files', '--others', '--exclude-standard', '--', '.') + $excl + @(':(exclude,attr:-diff)'))   # drop untracked -diff files
  foreach ($p in $paths) {
    if ($p) {
      $n = Get-TextLineCount ([System.IO.Path]::Combine($top, $p))
      $total += $n
    }
  }
  return $total
}

# added+deleted lines of own non-merge commits in $base..HEAD: commits no other local branch or remote-tracking
# ref reaches ($cur and its same-name remotes stay in; origin/HEAD excluded). Detached HEAD: no branch excludes.
# ponytail: own commits stop counting once another branch reaches them; a pull while ON main/dev still counts. Accepted.
function Get-OwnChurn([string]$top, [string]$base, [string]$cur) {
  [int64]$total = 0
  $a = @('-C', $top, 'log', '--no-merges', '--numstat', '--format=', "$base..HEAD", '--not')
  if ($cur) { $a += "--exclude=$cur" }
  $a += '--branches'
  if ($cur) { $a += "--exclude=*/$cur" }
  $a += @('--exclude=*/HEAD', '--remotes', '--', '.')
  $rows = Invoke-Git ($a + $excl)
  foreach ($row in $rows) {
    $f = $row -split '\t'
    if ($f.Count -ge 2 -and $f[0] -ne '-' -and $f[0] -match '^[0-9]+$') { $total += [int64]($f[0]) + [int64]($f[1]) }
  }
  return $total
}

# --- threshold (lines): env > marker > 2500; below 1 -> 2500 ---
$thrRaw = $env:HUHHB_GROUNDING_LINES
if ([string]::IsNullOrEmpty($thrRaw) -and (Test-Path -LiteralPath $marker)) {
  $mt = [string](Get-Content -LiteralPath $marker -Raw)
  $mm = [regex]::Match($mt, '(?m)^[ \t]*lines[ \t]*=[ \t]*([0-9]+)')
  if ($mm.Success) { $thrRaw = $mm.Groups[1].Value }
}
$threshold = Get-DigitsOr $thrRaw 2500
if ($threshold -lt 1) { $threshold = 2500 }

# --- payload fields ---
$sid = 'nosession'
$sm = [regex]::Match($payload, '"session_id"\s*:\s*"([^"]*)"')
if ($sm.Success -and $sm.Groups[1].Value) { $sid = ($sm.Groups[1].Value -replace '[^A-Za-z0-9._-]', '') }  # sanitize: no path traversal
if (-not $sid) { $sid = 'nosession' }

$cwd = ''
$cm = [regex]::Match($payload, '"cwd"\s*:\s*"([^"]*)"')
if ($cm.Success) { $cwd = $cm.Groups[1].Value.Replace('\\', '\') }   # payload JSON doubles Windows backslashes
if (-not $cwd) { $cwd = (Get-Location).Path }

$tmpDir = if ($env:TMPDIR) { $env:TMPDIR } else { [System.IO.Path]::GetTempPath() }
$state = Join-Path $tmpDir ('huhhb-grounding-' + $sid)

# SessionStart is no longer registered; a stray one only exits, printing nothing.
if ([regex]::IsMatch($payload, '"hook_event_name"\s*:\s*"SessionStart"')) { exit 0 }

# --- typed prompt? Raw JSON value to the end of the payload; skip leading whitespace and \n \r \t escapes.
# A leading bare quote is the closing quote of an empty value. Harness-injected turns are not the user typing.
$typed = $true
$pm = [regex]::Match($payload, '"prompt"\s*:\s*"(.*)', 'Singleline')
$pv = if ($pm.Success) { $pm.Groups[1].Value } else { '' }
$pv = [regex]::Replace($pv, '\A(?:[ \t]|\\[nrt])+', '')
if ($pv -eq '' -or [regex]::IsMatch($pv, '\A(?:"|<task-notification|<cross-session-message|<ci-monitor-event)')) { $typed = $false }

# --- read state ---
$txt = ''
if (Test-Path -LiteralPath $state) { $txt = [string](Get-Content -LiteralPath $state -Raw) }
$baseRepo   = Get-StateValue 'base_repo'
$baseCommit = Get-StateValue 'base_commit'
$baseLines  = Get-DigitsOr (Get-StateValue 'base_lines') 0
$nudged     = Get-DigitsOr (Get-StateValue 'nudged_lines') 0
$reset = [regex]::IsMatch($txt, '(?m)^reset=1')

# --- git: repo top and HEAD (line trigger runs only in a repo with at least one commit) ---
$top = ''
$topOut = Invoke-Git @('-C', $cwd, 'rev-parse', '--show-toplevel')
if ($topOut) { $top = ([string]($topOut | Select-Object -First 1)).Trim() }
$head = ''
if ($top) {
  $headOut = Invoke-Git @('-C', $top, 'rev-parse', '-q', '--verify', 'HEAD')
  if ($headOut) { $head = ([string]($headOut | Select-Object -First 1)).Trim() }
}

# --- line trigger ---
$nudge = $false; $reason = ''; [int64]$lines = 0; $cur = ''
if ($head) {
  $curOut = Invoke-Git @('-C', $top, 'branch', '--show-current')   # empty on a detached HEAD
  if ($curOut) { $cur = ([string]($curOut | Select-Object -First 1)).Trim() }
  # Re-baseline (no nudge) on: first prompt, skill reset, other repo, or a baseline HEAD no longer
  # descending from (branch switch / rebase / amend): a merge-base diff would count others' commits.
  $rebase = $reset -or (-not $baseCommit) -or ($baseRepo -ne $top)
  if (-not $rebase) {
    $anc = @('-C', $top, 'merge-base', '--is-ancestor', $baseCommit, 'HEAD')
    $null = & git @anc 2>$null
    if ($LASTEXITCODE -ne 0) { $rebase = $true }
  }
  if ($rebase) {
    $baseRepo = $top; $baseCommit = $head; $baseLines = Get-ChangedLineCount $top $head; $reset = $false; $nudged = 0
  } else {
    $lines = (Get-OwnChurn $top $baseCommit $cur) + (Get-ChangedLineCount $top 'HEAD') - $baseLines
    if ($lines -lt 0) { $lines = 0 }
    if ($lines -lt $nudged) { $nudged = $lines }   # the count fell: re-arm from the lower figure
    if ($typed -and $lines -ge ($nudged + $threshold)) {   # once per crossing
      $nudge = $true; $reason = "$lines lines changed since the last checkpoint (threshold $threshold)"
      $nudged = $lines
    }
  }
}

# --- persist state atomically (temp + move); reset=1 is kept until a re-baseline consumes it ---
$tmp = "$state.tmp.$PID"
$out = @(
  "base_repo=$baseRepo",
  "base_commit=$baseCommit",
  "base_lines=$baseLines",
  "nudged_lines=$nudged"
)
if ($reset) { $out += 'reset=1' }
try {
  Set-Content -LiteralPath $tmp -Value $out
  Move-Item -LiteralPath $tmp -Destination $state -Force
} catch { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }

if (-not $nudge) { exit 0 }

# --- emit the advisory nudge; name the review scope and the state file so the skill can reset it ---
$scope = ''
if ($baseCommit) {
  # Branch names may hold $( ) ` ; | ' — single-quote for the shell (' -> '\'') so the model never runs them.
  $curQ = $cur.Replace("'", "'\''")
  $notArgs = if ($cur) { "--not --exclude='$curQ' --branches --exclude='*/$curQ' --exclude='*/HEAD' --remotes" } else { "--not --branches --exclude='*/HEAD' --remotes" }
  $scope = " Review scope: this session's own work since $baseCommit in $baseRepo — ``git log -p --no-merges $baseCommit..HEAD $notArgs`` plus uncommitted (``git diff HEAD``) and untracked files."
}
$ctx = "Grounding checkpoint due — $reason. Finish the user's current request first, then at the next natural pause run the /grounding skill: offer the check menu (default all), run the selected checks (work snapshot, /simplify + /security-review, test/build/lint health, repo conformance, goal/scope, gaps & next steps), report (naming any skipped), and propose any edits confirm-first.$scope State file for this session: $state — when the checkpoint genuinely completes, append the line reset=1 there (see the grounding skill's reference.md). Advisory and sent once: the next nudge comes only after another $threshold changed lines. 'not now' or 'skip' needs no action; 'stop grounding' disables for the session."

# JSON-escape backslashes then double quotes
$esc = $ctx.Replace('\', '\\').Replace('"', '\"')
Write-Output ('{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"' + $esc + '"}}')
exit 0
