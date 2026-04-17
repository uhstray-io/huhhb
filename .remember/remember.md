# Handoff

## State
uhh:memory v0.1.0 is complete and merged to main. Python package (`uhh_memory/`), 10 MCP tools, CLI (`uhh-mem`), 4 Claude Code skills under `skills/memory/`, `.claude-plugin/` registration, 63 tests at 98% coverage. The mempalace stop hook fires but fails because `mempalace@mempalace` is disabled in `~/.claude/settings.json`.

## Next
1. Decide: re-enable mempalace or remove its stop hook from Claude Code settings (user was asked, no answer yet)
2. Install and smoke-test the plugin end-to-end: `pip install -e .` in repo root, then `claude mcp add uhh-memory -- python3 -m uhh_memory.mcp_server`
3. Add next skill to huhhb marketplace (no skills beyond memory category yet)

## Context
- Package installed `--no-deps` in worktree; full `pip install` (chromadb, sentence-transformers) needed in any new environment
- `uhh-mem` entry point may not be on PATH on Windows — use `python -m uhh_memory.cli` as fallback
- `marketplace.json` at repo root is v0.2.0 with 6 skills; `.claude-plugin/marketplace.json` is the plugin registry entry (separate files, different purposes)
