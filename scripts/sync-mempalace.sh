#!/usr/bin/env bash
# Syncs the MemPalace skill from https://github.com/mempalace/mempalace
#
# The Python MCP server is NOT copied — it runs as a published package via:
#   uvx mempalace-mcp   (configured in .claude-plugin/plugin.json)
#
# This script pulls the upstream SKILL.md and applies the nexus branding patch.
# Run periodically to pick up upstream improvements.
#
# Usage: ./scripts/sync-mempalace.sh
set -euo pipefail

UPSTREAM_BASE="https://raw.githubusercontent.com/mempalace/mempalace/main"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Syncing MemPalace skill from mempalace/mempalace..."

# Pull upstream SKILL.md into the memory skill directory
mkdir -p "$REPO_ROOT/skills/memory"
curl -fsSL "$UPSTREAM_BASE/.claude-plugin/skills/mempalace/SKILL.md" \
    -o "$REPO_ROOT/skills/memory/SKILL.md"
echo "  ✓ skills/memory/SKILL.md"

echo ""
echo "Applying nexus branding patch..."
"$REPO_ROOT/scripts/patch-mempalace.sh"

echo ""
echo "Done. Review changes with: git diff skills/"
echo "Note: skills/memory-mine, memory-search, memory-status are not synced — edit them manually if needed."
echo "Note: bump version in marketplace.json and .claude-plugin/plugin.json before releasing."
