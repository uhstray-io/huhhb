#!/usr/bin/env sh
# huhhb SessionStart hook — opt-in always-on narration for the explaining-changes skill.
#
# Off by default. Activates ONLY when the user opts in, via either:
#   * env var   HUHHB_EXPLAIN_CHANGES  set to a truthy value (1/true/on/yes), or
#   * marker file  ~/.claude/explaining-changes.on
# Otherwise it is a silent no-op (emits nothing, exits 0).
#
# When on, it emits additionalContext so the harness primes narration every
# session. Skill auto-matching can't guarantee "always on"; this hook can.

on=0
case "$(printf '%s' "${HUHHB_EXPLAIN_CHANGES:-}" | tr '[:upper:]' '[:lower:]')" in
  1|true|on|yes) on=1 ;;
esac
[ -f "$HOME/.claude/explaining-changes.on" ] && on=1

if [ "$on" = "1" ]; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"explaining-changes narration is ON for this session (opt-in via huhhb). Treat narration as standing behavior: after each logical change, after each completed plan task, and before every commit, give a brief summary — at most ~4 sentences plus at most one simple ASCII diagram, and include the diagram only when structure or flow actually changed. Educate, don't report: frame what the system now does, not the edit list. Use ASCII (not mermaid) in chat. Say 'stop explaining' to disable for this session."}}
JSON
fi

exit 0
