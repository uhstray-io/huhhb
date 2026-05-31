---
name: project-release-process
description: How to correctly cut a release — both files that need version bumps and how to force the plugin to update
metadata:
  node_type: memory
  type: project
---

Two files must be bumped on every release, not just one:

1. `marketplace.json` — top-level `"version"` field
2. `.claude-plugin/plugin.json` — `"version"` field (this is what the Claude Code plugin system reads for update detection)

Bumping only `marketplace.json` does nothing — the plugin system ignores it for version checks.

**Why:** We shipped v0.2.2 with only `marketplace.json` bumped. Claude Code still reported v0.2.1 because it reads `.claude-plugin/plugin.json` exclusively for the installed version.

**How to apply:** Before tagging a release, update both files to the new version, then commit, tag, and push.

## After merging a PR

The tag is NOT created automatically by merging. After every merge:

1. `git pull origin main`
2. `git tag vX.Y.Z`
3. `git push origin vX.Y.Z`

Without the tag, `claude plugin marketplace update` sees no new version.

## Forcing a plugin update locally

`claude plugin install --scope user huhhb` silently skips if already installed. To pick up a new version:

```bash
claude plugin marketplace update
claude plugin uninstall huhhb
claude plugin install --scope user huhhb
```

There is no in-place upgrade command — uninstall/reinstall is required.
