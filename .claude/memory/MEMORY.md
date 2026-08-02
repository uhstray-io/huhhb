# Memory Index

- [No triggers field in SKILL.md](feedback-skill-frontmatter.md) — use description for trigger phrases; triggers is not supported by VS Code agents
- [No co-authors in commits](feedback-no-coauthors.md) — never add Co-Authored-By trailers to commit messages
- [Release process](project-release-process.md) — bump both marketplace.json AND .claude-plugin/plugin.json; uninstall+reinstall to force update locally
- [Caveman sync](project-caveman-sync.md) — run scripts/sync-caveman.sh periodically to pull latest caveman skills from JuliusBrussee/caveman
- [MemPalace architecture](project-mempalace-architecture.md) — no Python code in this repo; MCP server runs from PyPI via uvx; we only own SKILL.md files + plugin config
- [Two-store memory supersedes MemPalace](project-two-store-memory-supersedes-mempalace.md) — repo ships both families; two-store is on the routing path, MemPalace retired from routing but still shipped (don't delete)
- [Always use PRs, not direct main pushes](feedback-use-prs.md) — CodeRabbit reviews catch real bugs; bypass only for trivial one-liners
- [LD-2 memory precedence](project-ld2-memory-precedence.md) — knowledge (incl. calibrations) resolves user → team → config defaults; policy memory-immune; supersedes the PR #34 record
- [buhhdy memory model](project-buhhdy-memory-model.md) — SUPERSEDED 2026-07-16 by LD-2 (its calibration-stays-config-owned clause no longer holds); kept as history
- [Repo kickstart 2026-08-01](project-repo-kickstart-2026-08-01.md) — core.hooksPath was unset so repo-memory hooks were inert; `main` is ruleset-governed (classic protection 404 is expected), real gap is 0 required approvals
