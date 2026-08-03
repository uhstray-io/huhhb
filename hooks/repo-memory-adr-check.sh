#!/bin/sh
# repo-memory ADR nudge — runs from .githooks/post-commit.
#
# Prints ONE line when a commit looks architecturally significant and no ADR index
# moved with it. Never writes, never blocks, never fails a commit: post-commit runs
# after the commit exists, so a non-zero exit here would only produce noise. Every
# path returns 0.
#
# A commit touching architecture without an ADR is frequently correct — the decision
# may already be recorded, or may not qualify. This is a reminder, not a gate.

set -u

# Never let this hook take a repo down.
fail_open() { exit 0; }
trap fail_open EXIT

command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null) || exit 0
[ -n "$CHANGED" ] || exit 0

# Did this commit already touch the decision log? Then nothing to say.
if printf '%s\n' "$CHANGED" | grep -q '^plans/architecture/'; then
  exit 0
fi

# Signals that a change may be architecturally significant. Deliberately narrow:
# a noisy nudge is one people learn to ignore, which is worse than none.
SIGNIFICANT=$(printf '%s\n' "$CHANGED" | grep -E \
  -e '^\.claude-plugin/' \
  -e '^marketplace\.json$' \
  -e '^AGENTS\.md$' \
  -e '^skills/[^/]+/SKILL\.md$' \
  -e '^hooks/' \
  -e '^scripts/[^/]+\.(ts|sh)$' \
  -e '^plans/development/openspec/changes/[^/]+/specs/' \
  -e '(^|/)(Dockerfile|docker-compose\.ya?ml)$' \
  -e '^\.github/workflows/' \
  || true)

[ -n "$SIGNIFICANT" ] || exit 0

COUNT=$(printf '%s\n' "$SIGNIFICANT" | grep -c . 2>/dev/null || echo 0)
FIRST=$(printf '%s\n' "$SIGNIFICANT" | head -1)

printf 'repo-memory: %s architecture-adjacent file(s) changed (e.g. %s) with no ADR.\n' \
  "$COUNT" "$FIRST" >&2
printf '             If a decision was made here, record it: /repo-memory\n' >&2
printf '             If not — reversible, or already recorded — ignore this.\n' >&2

exit 0
