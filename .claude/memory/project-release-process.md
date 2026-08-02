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

`claude plugin install --scope user huhhb` silently skips if already installed — still true,
and it is the trap: it reports success, builds the new version's cache directory, and leaves
`installed_plugins.json` pointing at the old one. A cache directory existing is not the same
as it being installed.

**`claude plugin update` is the command that actually flips it** (verified 2026-08-02,
`0.7.18 → 0.7.20`):

```bash
claude plugin marketplace update      # refresh the marketplace clone from its source
claude plugin update huhhb@huhhb      # flips installed_plugins.json to the new version
```

Restart to apply — already-running sessions keep the version they loaded at start.

Confirm it took by reading `installed_plugins.json`, not by trusting the success line:

```bash
node -e 'const j=require(process.env.HOME+"/.claude/plugins/installed_plugins.json");
for(const [k,v] of Object.entries(j.plugins)) if(/huhhb/.test(k)) console.log(JSON.stringify(v))'
```

**Testing an unpushed branch:** `marketplace update` pulls from GitHub and will never see a
local-only commit. Fetch into the marketplace clone from the working repo instead, then
update:

```bash
cd ~/.claude/plugins/marketplaces/huhhb
git fetch /path/to/your/repo <branch>:<temp-branch> && git checkout <temp-branch>
claude plugin update huhhb@huhhb
```

That clone has `autoUpdate: true`, so it can pull `main` back over the temp branch on its own
schedule — if a bench run suddenly reports a skill missing, check the clone's branch first.
Snapshot `installed_plugins.json` and the clone's HEAD before starting, and check out `main`
again afterwards.

**Superseded:** an earlier version of this note said there was no in-place upgrade command and
that uninstall/reinstall was required. `claude plugin update` exists and works.
