#!/usr/bin/env bash
# Applies Nexus branding patch to a freshly-synced MemPalace SKILL.md.
#
# Replaces MemPalace brand names with Nexus in prose while leaving
# mempalace_* MCP tool names and the mempalace CLI command unchanged.
#
# Run automatically by sync-mempalace.sh, or standalone after manual edits.
#
# Usage: ./scripts/patch-mempalace.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$REPO_ROOT/skills/memory/SKILL.md"

if [ ! -f "$SKILL" ]; then
    echo "Error: $SKILL not found. Run sync-mempalace.sh first." >&2
    exit 1
fi

# Replace brand name in prose (keeps mempalace_ tool names and CLI intact)
sed -i '' \
    -e 's/MemPalace/Nexus/g' \
    -e 's/memory palace/memory nexus/g' \
    -e 's/Memory Palace/Memory Nexus/g' \
    "$SKILL"

# Update frontmatter
sed -i '' -e 's/^name: mempalace$/name: memory/' "$SKILL"

# Re-apply the opt-in prerequisite. This file is overwritten wholesale by
# sync-mempalace.sh, so a local edit survives only by being re-applied here.
# Without it, a synced skill silently assumes an MCP server this plugin stopped
# registering — the dangling call the retirement exists to avoid.
# Idempotent: skipped when already present, so running standalone is safe.
if ! grep -q 'Prerequisite — the `memory` MCP server is opt-in' "$SKILL"; then
    tmp="$(mktemp)"
    cat > "$tmp" <<'BLOCK'

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](reference.md).
BLOCK
    # insert immediately after the H1, before upstream's opening paragraph
    sed -i '' -e "/^# memory$/r $tmp" "$SKILL"
    rm -f "$tmp"
    echo "  ✓ $SKILL opt-in prerequisite re-applied"
else
    echo "  · $SKILL opt-in prerequisite already present"
fi

echo "  ✓ $SKILL patched (MemPalace → Nexus)"
