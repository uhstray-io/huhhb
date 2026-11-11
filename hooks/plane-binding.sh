#!/usr/bin/env sh
# huhhb SessionStart hook — tells the session which Plane module this worktree works on,
# and whether a work item was left claimed without its close-out.
#
# Opt-in. Active ONLY when:
#   * env var  HUHHB_PLANE  is truthy (1/true/on/yes), or
#   * marker file  ~/.claude/plane-tracking.on  exists (the plane-work-tracking skill's setup writes it).
# Otherwise, and outside a git work tree, it is a silent no-op.
#
# The binding lives in git config on the current branch, so it travels with the worktree and is
# never committed:
#   branch.<b>.planeProject    Plane project UUID
#   branch.<b>.planeModule     Plane module UUID
#   branch.<b>.planeItem       identifier of the claimed work item (e.g. AC-612), set at claim
#   branch.<b>.planeItemStart  epoch seconds of the claim, for the wall-clock work log
# Git matches these keys case-insensitively. Reads only; never writes; always exits 0.

set -u

on=0
case "$(printf '%s' "${HUHHB_PLANE:-}" | tr '[:upper:]' '[:lower:]')" in
  1|true|on|yes) on=1 ;;
esac
[ -f "$HOME/.claude/plane-tracking.on" ] && on=1
[ "$on" = "1" ] || exit 0

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
b=$(git branch --show-current 2>/dev/null)

if [ -z "$b" ]; then
  ctx="Plane work tracking: HEAD is detached, so this checkout has no Plane module binding. Do not claim Plane work items from a detached HEAD."
else
  get() { git config --get "branch.$b.$1" 2>/dev/null; }
  project=$(get planeProject); module=$(get planeModule)
  item=$(get planeItem); start=$(get planeItemStart)

  if [ -n "$module" ]; then
    ctx="Plane work tracking: branch $b is bound to Plane project $project, module $module. Work that module's items one at a time in dependency order, using the plane-work-tracking skill."
  else
    ctx="Plane work tracking: branch $b has no Plane module binding. Before starting tracked work, use the plane-work-tracking skill to choose this worktree's module with the user and record it as git config branch.$b.planeModule (and planeProject)."
  fi

  if [ -n "$item" ]; then
    case "$start" in ''|*[!0-9]*) since="an unrecorded time" ;;
      *) since=$(date -r "$start" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date -d "@$start" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || printf 'epoch %s' "$start") ;;
    esac
    ctx="$ctx OPEN CLAIM: work item $item has been claimed since $since. Either keep working it, or finish its close-out (time log, outcome, read-back) before claiming anything else. Close it out before any branch or worktree cleanup, which deletes this config."
  fi
fi

esc=$(printf '%s' "$ctx" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
exit 0
