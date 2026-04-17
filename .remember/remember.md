# Handoff

## State
huhhb is pushed to `uhstray-io/huhhb` on main. `uhh:memory` v0.1.0 complete: Python package, 10 MCP tools, CLI, 4 skills, `.claude-plugin/` registration. MCP server launches via `uv run` — no pip install needed, just `uv`. Mempalace fully removed from `~/.claude/settings.json`.

## Next
1. Test end-to-end: `claude plugin marketplace add uhstray-io/huhhb` then `claude plugin install --scope user huhhb` — verify MCP server connects and tools work
2. Add next huhhb skill category (nothing planned yet — ask Jacob)
3. Consider adding a `Setup` hook to the plugin that auto-installs `uv` if missing

## Context
- `uv` is the only prereq — install instructions in README.md and `onboarding/welcome.md`
- `.claude-plugin/.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}` to reference plugin files — depends on Claude Code expanding that var at runtime
- Package also installable locally: `pip install -e .` from repo root (worktree was `--no-deps`, full install needs chromadb + sentence-transformers)
