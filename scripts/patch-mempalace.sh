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

echo "  ✓ $SKILL patched (MemPalace → Nexus)"
