---
name: project-caveman-sync
description: Run scripts/sync-caveman.sh periodically to keep caveman skills up to date from upstream
metadata:
  node_type: memory
  type: project
---

The caveman skills (caveman, caveman-commit, caveman-compress, caveman-help, caveman-review, caveman-stats, cavecrew) are synced from https://github.com/JuliusBrussee/caveman — they are not maintained in this repo.

**How to apply:** Periodically run `scripts/sync-caveman.sh` to pull the latest versions. After syncing, bump versions in `marketplace.json` and `.claude-plugin/plugin.json` and cut a release.
