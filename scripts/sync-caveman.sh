#!/usr/bin/env bash
# Syncs caveman skills from https://github.com/JuliusBrussee/caveman
# Run this to pull the latest skill definitions into huhhb.
# Usage: ./scripts/sync-caveman.sh
set -euo pipefail

CAVEMAN_BASE="https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills"
SKILLS=(caveman caveman-commit caveman-compress caveman-help caveman-review caveman-stats cavecrew)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Syncing caveman skills from JuliusBrussee/caveman..."
for skill in "${SKILLS[@]}"; do
  mkdir -p "$REPO_ROOT/skills/$skill"
  curl -fsSL "$CAVEMAN_BASE/$skill/SKILL.md" -o "$REPO_ROOT/skills/$skill/SKILL.md"
  echo "  ✓ $skill"
done

echo ""
echo "Done. Review changes with: git diff skills/"
echo "Note: bump version in marketplace.json and .claude-plugin/plugin.json before releasing."
