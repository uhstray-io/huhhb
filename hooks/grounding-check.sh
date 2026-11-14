#!/usr/bin/env sh
# huhhb UserPromptSubmit hook — volume-of-work nudge for the grounding skill.
#
# Opt-in. Active ONLY when:
#   * env var  HUHHB_GROUNDING  is truthy (1/true/on/yes), or
#   * marker file  ~/.claude/grounding.on  exists.
# Otherwise it is a silent no-op (emits nothing, exits 0).
#
# When active it keeps a per-session baseline commit and, once the lines changed since that baseline
# reach the configured threshold (default 2500) OR the user returned after a long idle gap, emits
# additionalContext nudging the model to run the /grounding checkpoint. It can only NUDGE.
#
# Lines changed = added + deleted (git diff --numstat, baseline commit -> working tree) plus lines in
# untracked non-ignored files, minus what was already there at the baseline. Lockfiles and binary
# files do not count. Committing does not change the count. Outside a git repo only the idle check runs.
#
# Config (precedence high->low): env  HUHHB_GROUNDING_LINES  >  lines=<n> in the marker file  >  2500.
# Idle threshold: HUHHB_GROUNDING_IDLE_MIN (default 30). Anti-nag cooldown:
# HUHHB_GROUNDING_COOLDOWN_MIN (default 15).
#
# Also registered on SessionStart: on a resume it only marks the session so the next prompt, usually
# work handed to the session, gets no idle nudge. Prints nothing there.
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

now=$(date +%s 2>/dev/null) || exit 0

# --- threshold (lines): env > marker > 2500 ---
threshold="${HUHHB_GROUNDING_LINES:-}"
if [ -z "$threshold" ] && [ -f "$marker" ]; then
  threshold=$(sed -n 's/^[[:space:]]*lines[[:space:]]*=[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$marker" 2>/dev/null | head -n1)
fi
case "$threshold" in ''|*[!0-9]*) threshold=2500 ;; esac
[ "$threshold" -ge 1 ] || threshold=2500

idle_min="${HUHHB_GROUNDING_IDLE_MIN:-30}"
case "$idle_min" in ''|*[!0-9]*) idle_min=30 ;; esac
idle_s=$((idle_min * 60))

cooldown_min="${HUHHB_GROUNDING_COOLDOWN_MIN:-15}"
case "$cooldown_min" in ''|*[!0-9]*) cooldown_min=15 ;; esac
cooldown_s=$((cooldown_min * 60))

# --- payload fields ---
field() { printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1; }
sid=$(field session_id | tr -cd 'A-Za-z0-9._-')   # sanitize: keep the state-file name inside TMPDIR
[ -n "$sid" ] || sid="nosession"
cwd=$(field cwd)
[ -n "$cwd" ] || cwd=$PWD
state="${TMPDIR:-/tmp}/huhhb-grounding-$sid"

# --- session resume: skip the idle nudge on the next prompt (a new session has no state, so no idle gap) ---
# Only resume/fork: a compaction before a break must not silence the nudge for the return.
if [ "$(field hook_event_name)" = "SessionStart" ]; then
  case "$(field source)" in
    resume|fork) [ -f "$state" ] && ! grep -q '^fresh=1' "$state" 2>/dev/null && printf 'fresh=1\n' >> "$state" 2>/dev/null ;;
  esac
  exit 0
fi

# --- read state ---
get() { [ -f "$state" ] && sed -n "s/^$1=//p" "$state" | head -n1; }
num() { case "$1" in ''|*[!0-9]*) echo 0 ;; *) echo "$1" ;; esac; }
last_prompt=$(num "$(get last_prompt)")
last_nudge=$(num "$(get last_nudge)")
base_repo=$(get base_repo)
base_commit=$(get base_commit)
base_lines=$(num "$(get base_lines)")
reset=0
[ -f "$state" ] && grep -q '^reset=1' "$state" 2>/dev/null && reset=1
fresh=0   # set by SessionStart; consumed (not rewritten) by this prompt's state write
[ -f "$state" ] && grep -q '^fresh=1' "$state" 2>/dev/null && fresh=1

# Lines changed vs a commit: tracked added+deleted (binary "-" rows skipped) + untracked text lines.
# ponytail: counts every untracked non-ignored file each prompt; a huge un-ignored tree could near the 5 s hook timeout.
count_lines() (
  cd "$1" 2>/dev/null || { echo 0; exit 0; }
  set -- "$2" . \
    ':(exclude,glob)**/package-lock.json' ':(exclude,glob)**/yarn.lock' ':(exclude,glob)**/pnpm-lock.yaml' \
    ':(exclude,glob)**/bun.lock' ':(exclude,glob)**/bun.lockb' ':(exclude,glob)**/Cargo.lock' \
    ':(exclude,glob)**/poetry.lock' ':(exclude,glob)**/uv.lock' ':(exclude,glob)**/go.sum' \
    ':(exclude,glob)**/composer.lock' ':(exclude,glob)**/Gemfile.lock'
  base=$1; shift
  t=$(git diff --numstat "$base" -- "$@" 2>/dev/null | awk '$1 != "-" { s += $1 + $2 } END { print s + 0 }')
  # attr:-diff drops untracked files .gitattributes marks -diff (git counts tracked ones as binary already)
  u=$(git ls-files -z --others --exclude-standard -- "$@" ':(exclude,attr:-diff)' 2>/dev/null \
    | xargs -0 grep -IcH '' 2>/dev/null | awk -F: '{ s += $NF } END { print s + 0 }')
  echo $((t + u))
)

# --- line trigger (git repos with at least one commit only) ---
nudge=0; reason=""; lines=0
top=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)
head=""
[ -n "$top" ] && head=$(git -C "$top" rev-parse -q --verify HEAD 2>/dev/null)
if [ -n "$head" ]; then
  # Re-baseline (no nudge) on: first prompt, skill reset, other repo, or a baseline HEAD no longer
  # descends from (branch switch / rebase / amend) — a merge-base diff would count others' commits.
  if [ "$reset" = "1" ] || [ -z "$base_commit" ] || [ "$base_repo" != "$top" ] \
     || ! git -C "$top" merge-base --is-ancestor "$base_commit" HEAD 2>/dev/null; then
    base_repo=$top; base_commit=$head; base_lines=$(count_lines "$top" "$head"); reset=0
  else
    lines=$(( $(count_lines "$top" "$base_commit") - base_lines ))
    [ "$lines" -ge 0 ] || lines=0
    if [ "$lines" -ge "$threshold" ]; then
      nudge=1; reason="${lines} lines changed since the last checkpoint (threshold ${threshold})"
    fi
  fi
fi

# --- idle-return trigger ---
if [ "$nudge" = "0" ] && [ "$fresh" = "0" ] && [ "$last_prompt" -gt 0 ] && [ $((now - last_prompt)) -ge "$idle_s" ]; then
  nudge=1; reason="you returned after a long idle gap (>= ${idle_min} min)"
fi

# anti-nag cooldown: don't re-nudge within cooldown of the last nudge
if [ "$nudge" = "1" ] && [ "$last_nudge" -gt 0 ] && [ $((now - last_nudge)) -lt "$cooldown_s" ]; then
  nudge=0
fi

# --- persist state atomically (temp + mv); reset=1 is kept until a re-baseline consumes it ---
new_nudge=$last_nudge
[ "$nudge" = "1" ] && new_nudge=$now
tmp="$state.tmp.$$"
{
  printf 'last_prompt=%s\n' "$now"
  printf 'last_nudge=%s\n'  "$new_nudge"
  printf 'base_repo=%s\n'   "$base_repo"
  printf 'base_commit=%s\n' "$base_commit"
  printf 'base_lines=%s\n'  "$base_lines"
  if [ "$reset" = "1" ]; then printf 'reset=1\n'; fi
} > "$tmp" 2>/dev/null && mv -f "$tmp" "$state" 2>/dev/null
rm -f "$tmp" 2>/dev/null

[ "$nudge" = "1" ] || exit 0

# --- emit the advisory nudge; name the review scope and the state file so the skill can reset it ---
scope=""
[ -n "$base_commit" ] && scope=" Review scope: \`git diff ${base_commit}\` in ${base_repo} (committed + uncommitted since the checkpoint) plus untracked files."
ctx="Grounding checkpoint due — ${reason}. Finish the user's current request first, then at the next natural pause run the /grounding skill: offer the check menu (default all), run the selected checks (work snapshot, /simplify + /security-review, test/build/lint health, repo conformance, goal/scope, gaps & next steps), report (naming any skipped), and propose any edits confirm-first.${scope} State file for this session: ${state} — when the checkpoint genuinely completes, append the line reset=1 there (see the grounding skill's reference.md). Advisory only: 'not now' snoozes, 'skip' skips once, 'stop grounding' disables for the session."

# JSON-escape backslashes then double quotes
esc=$(printf '%s' "$ctx" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$esc"
exit 0
