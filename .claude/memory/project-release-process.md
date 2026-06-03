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

**How to apply:** Update both files to the same new version in your PR; on merge, CI tags the release (see below).

## After merging a PR

Tagging is automated. The **Tag release** workflow (`.github/workflows/tag-release.yml`) runs on every
push to `main`; when the version in the two manifests changes, it creates and pushes `vX.Y.Z` and a
GitHub Release. No manual `git tag` step.

(The plugin marketplace tracks `main` HEAD for version detection — installs picked up 0.4.3 from `main`
before any tag existed — so tags/releases are for version history and changelog, not a prerequisite for
`claude plugin marketplace update`.)

## Forcing a plugin update locally

`claude plugin install --scope user huhhb` silently skips if already installed. To pick up a new version:

```bash
claude plugin marketplace update
claude plugin uninstall huhhb
claude plugin install --scope user huhhb
```

There is no in-place upgrade command — uninstall/reinstall is required.
