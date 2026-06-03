#!/usr/bin/env sh
# huhhb UserPromptSubmit hook — cadence/nudge for the grounding skill.
#
# Opt-in. Active ONLY when:
#   * env var  HUHHB_GROUNDING  is truthy (1/true/on/yes), or
#   * marker file  ~/.claude/grounding.on  exists.
# Otherwise it is a silent no-op (emits nothing, exits 0).
#
# When active it keeps a per-session clock and, when the configured interval has elapsed
# (default 120 min) OR the user returned after a long idle gap, emits additionalContext nudging
# the model to run the /grounding checkpoint. It can only NUDGE — it cannot force the checkpoint.
#
# Config (precedence high->low): env  HUHHB_GROUNDING_INTERVAL_MIN  >  interval_min=<n> in the
# marker file  >  120. Idle threshold: HUHHB_GROUNDING_IDLE_MIN (default 30). Anti-nag cooldown:
# HUHHB_GROUNDING_COOLDOWN_MIN (default 15).
#
# Reads the UserPromptSubmit JSON payload on stdin. Never blocks; always exits 0.

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

# --- interval (minutes): env > marker > 120 ---
interval_min="${HUHHB_GROUNDING_INTERVAL_MIN:-}"
if [ -z "$interval_min" ] && [ -f "$marker" ]; then
  interval_min=$(sed -n 's/^[[:space:]]*interval_min[[:space:]]*=[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$marker" 2>/dev/null | head -n1)
fi
case "$interval_min" in ''|*[!0-9]*) interval_min=120 ;; esac
[ "$interval_min" -ge 1 ] || interval_min=120
interval_s=$((interval_min * 60))

idle_min="${HUHHB_GROUNDING_IDLE_MIN:-30}"
case "$idle_min" in ''|*[!0-9]*) idle_min=30 ;; esac
idle_s=$((idle_min * 60))

cooldown_min="${HUHHB_GROUNDING_COOLDOWN_MIN:-15}"
case "$cooldown_min" in ''|*[!0-9]*) cooldown_min=15 ;; esac
cooldown_s=$((cooldown_min * 60))

# --- session id -> per-session state file ---
sid=$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
sid=$(printf '%s' "$sid" | tr -cd 'A-Za-z0-9._-')   # sanitize: keep the state-file name inside TMPDIR (no path traversal)
[ -n "$sid" ] || sid="nosession"
state="${TMPDIR:-/tmp}/huhhb-grounding-$sid"

last_ground=0; last_prompt=0; last_nudge=0
if [ -f "$state" ]; then
  last_ground=$(sed -n 's/^last_ground=\([0-9][0-9]*\).*/\1/p' "$state" | head -n1)
  last_prompt=$(sed -n 's/^last_prompt=\([0-9][0-9]*\).*/\1/p' "$state" | head -n1)
  last_nudge=$(sed -n 's/^last_nudge=\([0-9][0-9]*\).*/\1/p' "$state" | head -n1)
fi
case "$last_ground" in ''|*[!0-9]*) last_ground=0 ;; esac
case "$last_prompt" in ''|*[!0-9]*) last_prompt=0 ;; esac
case "$last_nudge"  in ''|*[!0-9]*) last_nudge=0 ;; esac

# --- decide (before updating timestamps) ---
nudge=0; reason=""
if [ "$last_ground" -eq 0 ]; then
  # first prompt of a session — treat as baseline-grounded: stamp, do not nudge
  last_ground=$now
elif [ $((now - last_ground)) -ge "$interval_s" ]; then
  nudge=1; reason="the configured interval (${interval_min} min) has elapsed since the last checkpoint"
elif [ "$last_prompt" -gt 0 ] && [ $((now - last_prompt)) -ge "$idle_s" ]; then
  nudge=1; reason="you returned after a long idle gap (>= ${idle_min} min)"
fi

# anti-nag cooldown: don't re-nudge within cooldown of the last nudge
if [ "$nudge" = "1" ] && [ "$last_nudge" -gt 0 ] && [ $((now - last_nudge)) -lt "$cooldown_s" ]; then
  nudge=0
fi

# --- persist state atomically (temp + mv) ---
new_nudge=$last_nudge
[ "$nudge" = "1" ] && new_nudge=$now
tmp="$state.tmp.$$"
{
  printf 'last_ground=%s\n' "$last_ground"
  printf 'last_prompt=%s\n' "$now"
  printf 'last_nudge=%s\n'  "$new_nudge"
} > "$tmp" 2>/dev/null && mv -f "$tmp" "$state" 2>/dev/null
rm -f "$tmp" 2>/dev/null

[ "$nudge" = "1" ] || exit 0

# --- emit the advisory nudge; include the state-file path so the skill can stamp last_ground ---
ctx="Grounding checkpoint due — ${reason}. Finish the user's current request first, then at the next natural pause run the /grounding skill: offer the check menu (default all), run the selected checks (work snapshot, /simplify + /security-review, test/build/lint health, repo conformance, goal/scope, gaps & next steps), report (naming any skipped), and propose any edits confirm-first. State file for this session: ${state} — when the checkpoint genuinely completes, stamp last_ground there (see the grounding skill's reference.md). Advisory only: 'not now' snoozes, 'skip' skips once, 'stop grounding' disables for the session."

# JSON-escape backslashes then double quotes
esc=$(printf '%s' "$ctx" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$esc"
exit 0
