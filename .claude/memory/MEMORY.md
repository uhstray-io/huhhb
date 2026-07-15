# Memory Index

- [No triggers field in SKILL.md](feedback-skill-frontmatter.md) — use description for trigger phrases; triggers is not supported by VS Code agents
- [No co-authors in commits](feedback-no-coauthors.md) — never add Co-Authored-By trailers to commit messages
- [Release process](project-release-process.md) — bump both marketplace.json AND .claude-plugin/plugin.json; uninstall+reinstall to force update locally
- [Caveman sync](project-caveman-sync.md) — run scripts/sync-caveman.sh periodically to pull latest caveman skills from JuliusBrussee/caveman
- [MemPalace architecture](project-mempalace-architecture.md) — no Python code in this repo; MCP server runs from PyPI via uvx; we only own SKILL.md files + plugin config
- [Always use PRs, not direct main pushes](feedback-use-prs.md) — CodeRabbit reviews catch real bugs; bypass only for trivial one-liners
- [buhhdy memory model](project-buhhdy-memory-model.md) — user (MemPalace) → team (Honcho) → config defaults; repo-memory in .claude/memory/ only (path separation); buhhdy/memory retired; repo-kickstart registry-free
