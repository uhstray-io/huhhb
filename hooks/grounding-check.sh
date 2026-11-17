#!/usr/bin/env sh
# huhhb UserPromptSubmit hook — volume-of-work nudge for the grounding skill.
#
# Opt-in. Active ONLY when:
#   * env var  HUHHB_GROUNDING  is truthy (1/true/on/yes), or
#   * marker file  ~/.claude/grounding.on  exists.
# Otherwise it is a silent no-op (emits nothing, exits 0).
#
# When active it keeps a per-session baseline commit and nudges the model to run the /grounding
# checkpoint once the lines this session changed reach the threshold (default 2500). It can only NUDGE.
# After a nudge, the next one waits for another full threshold of changed lines.
#
# Lines changed = own commits since the baseline + uncommitted work (tracked added+deleted vs HEAD, plus
# lines in untracked non-ignored files), minus whatever was already uncommitted at the baseline.
# Own commits are baseline..HEAD commits that no other local branch or remote-tracking ref contains, so
# merging or fast-forwarding in someone else's work does not count. Lockfiles and binary files do not
# count. Committing your own work does not change the count. Outside a git repo nothing is counted.
#
# Only typed prompts nudge. Turns the harness injects (task notifications, cross-session messages,
# CI monitor events) still update the baseline and state, but never nudge.
#
# Config (precedence high->low): env  HUHHB_GROUNDING_LINES  >  lines=<n> in the marker file  >  2500.
#
# Reads the hook JSON payload on stdin. Never blocks; always exits 0.

set -u
payload=$(cat 2>/dev/null || printf '')

# --- opt-in gate ---
on=0
case "$(printf '%s' "${HUHHB_GROUNDING:-}" | tr '[:upper:]' '[:lower:]')" in
  1|true|on|yes) on=1 ;;
esac
marker="$HOME/.claude/grounding.on"
[ -f "$marker" ] && on=1
[ "$on" = "1" ] || exit 0

# --- threshold (lines): env > marker > 2500 ---
threshold="${HUHHB_GROUNDING_LINES:-}"
if [ -z "$threshold" ] && [ -f "$marker" ]; then
  threshold=$(sed -n 's/^[[:space:]]*lines[[:space:]]*=[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$marker" 2>/dev/null | head -n1)
fi
case "$threshold" in ''|*[!0-9]*) threshold=2500 ;; esac
[ "$threshold" -ge 1 ] || threshold=2500

# --- payload fields ---
field() { printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1; }
sid=$(field session_id | tr -cd 'A-Za-z0-9._-')   # sanitize: keep the state-file name inside TMPDIR
[ -n "$sid" ] || sid="nosession"
cwd=$(field cwd)
[ -n "$cwd" ] || cwd=$PWD
state="${TMPDIR:-/tmp}/huhhb-grounding-$sid"

# SessionStart is no longer registered; a stray one only exits, printing nothing.
[ "$(field hook_event_name)" = "SessionStart" ] && exit 0

# --- typed prompt? The value runs to the end of the JSON line, so escaped quotes and backslashes stay in.
# Leading whitespace and literal \n \r \t escapes are skipped. A leading bare quote is the closing quote
# of an empty value. Harness-injected turns are not the user typing.
prompt=$(printf '%s' "$payload" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"//p' | head -n1)
tab=$(printf '\t')
while :; do
  case "$prompt" in
    " "*|"$tab"*) prompt=${prompt#?} ;;
    '\n'*|'\r'*|'\t'*) prompt=${prompt#??} ;;
    *) break ;;
  esac
done
typed=1
case "$prompt" in
  ''|'"'*|'<task-notification'*|'<cross-session-message'*|'<ci-monitor-event'*) typed=0 ;;
esac

# --- read state ---
get() { [ -f "$state" ] && sed -n "s/^$1=//p" "$state" | head -n1; }
num() { case "$1" in ''|*[!0-9]*) echo 0 ;; *) echo "$1" ;; esac; }
base_repo=$(get base_repo)
base_commit=$(get base_commit)
base_lines=$(num "$(get base_lines)")
nudged=$(num "$(get nudged_lines)")
reset=0
[ -f "$state" ] && grep -q '^reset=1' "$state" 2>/dev/null && reset=1

# Lockfiles, excluded from both counters (glob pathspecs; set -f in the subshells keeps them literal).
LOCK_GLOBS='**/package-lock.json **/yarn.lock **/pnpm-lock.yaml **/bun.lock **/bun.lockb **/Cargo.lock **/poetry.lock **/uv.lock **/go.sum **/composer.lock **/Gemfile.lock'

# Lines changed vs a commit: tracked added+deleted (binary "-" rows skipped) + untracked text lines.
# ponytail: counts every untracked non-ignored file each prompt; a huge un-ignored tree could near the 5 s hook timeout.
count_lines() (
  cd "$1" 2>/dev/null || { echo 0; exit 0; }
  set -f
  base=$2
  set -- .
  for g in $LOCK_GLOBS; do set -- "$@" ":(exclude,glob)$g"; done
  t=$(git diff --numstat "$base" -- "$@" 2>/dev/null | awk '$1 != "-" { s += $1 + $2 } END { print s + 0 }')
  # attr:-diff drops untracked files .gitattributes marks -diff (git counts tracked ones as binary already)
  u=$(git ls-files -z --others --exclude-standard -- "$@" ':(exclude,attr:-diff)' 2>/dev/null \
    | xargs -0 grep -IcH '' 2>/dev/null | awk -F: '{ s += $NF } END { print s + 0 }')
  echo $((t + u))
)

# Own commits since the baseline: baseline..HEAD minus anything another local branch or any remote-tracking
# ref reaches. The current branch and its same-name remote stay in. origin/HEAD is excluded too: it aliases
# the default branch, so a clone would otherwise hide own commits pushed to it. Detached HEAD: no branch excludes.
# ponytail: own commits stop counting once another branch reaches them (e.g. a PR merged to dev, then
# merged back), and a pull while ON main/dev still counts the pulled commits (only cur and */cur reach
# them; ~3% of sessions start on a default branch). Accepted, advisory.
own_churn() (
  cd "$1" 2>/dev/null || { echo 0; exit 0; }
  set -f
  base=$2; cur=$3
  set -- "$base..HEAD" --not
  if [ -n "$cur" ]; then set -- "$@" "--exclude=$cur"; fi
  set -- "$@" --branches
  if [ -n "$cur" ]; then set -- "$@" "--exclude=*/$cur"; fi
  set -- "$@" '--exclude=*/HEAD' --remotes -- .
  for g in $LOCK_GLOBS; do set -- "$@" ":(exclude,glob)$g"; done
  git log --no-merges --numstat --format= "$@" 2>/dev/null | awk '$1 != "-" { s += $1 + $2 } END { print s + 0 }'
)

# --- line trigger (git repos with at least one commit only) ---
lines=0; nudge=0; reason=""; cur=""
top=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)
head=""
[ -n "$top" ] && head=$(git -C "$top" rev-parse -q --verify HEAD 2>/dev/null)
if [ -n "$head" ]; then
  cur=$(git -C "$top" branch --show-current 2>/dev/null)   # empty on a detached HEAD
  # Re-baseline (no nudge) on: first prompt, skill reset, other repo, or a baseline HEAD no longer
  # descends from (branch switch / rebase / amend) — a merge-base diff would count others' commits.
  if [ "$reset" = "1" ] || [ -z "$base_commit" ] || [ "$base_repo" != "$top" ] \
     || ! git -C "$top" merge-base --is-ancestor "$base_commit" HEAD 2>/dev/null; then
    base_repo=$top; base_commit=$head; base_lines=$(count_lines "$top" "$head"); reset=0; nudged=0
  else
    lines=$(( $(own_churn "$top" "$base_commit" "$cur") + $(count_lines "$top" HEAD) - base_lines ))
    [ "$lines" -ge 0 ] || lines=0
    # the count fell (own commits landed on another branch, or a reset): re-arm from the lower figure
    [ "$lines" -ge "$nudged" ] || nudged=$lines
    # once per crossing: the next nudge waits for another full threshold past the last one sent
    if [ "$typed" = "1" ] && [ "$lines" -ge $((nudged + threshold)) ]; then
      nudge=1; reason="${lines} lines changed since the last checkpoint (threshold ${threshold})"
      nudged=$lines
    fi
  fi
fi

# --- persist state atomically (temp + mv); reset=1 is kept until a re-baseline consumes it ---
tmp="$state.tmp.$$"
{
  printf 'base_repo=%s\n'    "$base_repo"
  printf 'base_commit=%s\n'  "$base_commit"
  printf 'base_lines=%s\n'   "$base_lines"
  printf 'nudged_lines=%s\n' "$nudged"
  if [ "$reset" = "1" ]; then printf 'reset=1\n'; fi
} > "$tmp" 2>/dev/null && mv -f "$tmp" "$state" 2>/dev/null
rm -f "$tmp" 2>/dev/null

[ "$nudge" = "1" ] || exit 0

# --- emit the advisory nudge; name the review scope and the state file so the skill can reset it ---
scope=""
if [ -n "$base_commit" ]; then
  # The model may run this command in sh or PowerShell, and git allows $( ) ` ; | ' in branch names. Name the
  # branch only when it is plain [A-Za-z0-9._/-]: single-quoted, that reads the same in both shells.
  safe=1
  case "$base_commit" in *[!0-9a-f]*) safe=0 ;; esac
  case "$cur" in *[!A-Za-z0-9._/-]*) safe=0 ;; esac
  if [ "$safe" = "0" ]; then
    scope=" Review scope: this session's own commits since the checkpoint in ${base_repo} (no command suggested: the branch name holds shell-special characters) plus uncommitted and untracked files."
  else
    if [ -n "$cur" ]; then
      not_args="--not --exclude='${cur}' --branches --exclude='*/${cur}' --exclude='*/HEAD' --remotes"
    else
      not_args="--not --branches --exclude='*/HEAD' --remotes"
    fi
    scope=" Review scope: this session's own work since ${base_commit} in ${base_repo} — \`git log -p --no-merges ${base_commit}..HEAD ${not_args}\` plus uncommitted (\`git diff HEAD\`) and untracked files."
  fi
fi
ctx="Grounding checkpoint due — ${reason}. Finish the user's current request first, then at the next natural pause run the /grounding skill: offer the check menu (default all), run the selected checks (work snapshot, /simplify + /security-review, test/build/lint health, repo conformance, goal/scope, gaps & next steps), report (naming any skipped), and propose any edits confirm-first.${scope} State file for this session: ${state} — when the checkpoint genuinely completes, append the line reset=1 there (see the grounding skill's reference.md). Advisory and sent once: the next nudge comes only after another ${threshold} changed lines. 'not now' or 'skip' needs no action; 'stop grounding' disables for the session."

# JSON-escape backslashes then double quotes
esc=$(printf '%s' "$ctx" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$esc"
exit 0
