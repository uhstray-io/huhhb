---
name: project-mempalace-architecture
description: Why there is no Python MCP server code in this repo — MemPalace runs from PyPI, not from our codebase
metadata:
  type: project
---

The memory MCP server is NOT in this repo and should never be added back.

It runs as a published PyPI package via `uvx mempalace-mcp`, configured in `.mcp.json` and `plugin.json`. Claude Code starts it automatically when the plugin loads.

**Why:** We previously maintained a hand-rolled Python MCP server inside `memory/` that was a stale reimplementation of MemPalace. It drifted from upstream and required us to maintain Python code that wasn't ours to own. We deleted it in favor of pointing directly at the published package.

**How to apply:** huhhb only owns two things for memory:
1. The SKILL.md files (`skills/memory/`, `skills/memory-mine/`, etc.) — what Claude knows about how to use the tools
2. The plugin config (`.mcp.json`, `plugin.json`) — how Claude Code starts the server

The Python runtime comes from MemPalace's PyPI package. Use `scripts/sync-mempalace.sh` to pull updated skill definitions from upstream. If MemPalace ships new tools or changes behavior, update the SKILL.md files — never add Python code.
