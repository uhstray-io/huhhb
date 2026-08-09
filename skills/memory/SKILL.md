---
name: memory
description: LEGACY, retired from routing 2026-08-01 — the MemPalace nexus, kept only to read data already stored in it. Use when MemPalace is named explicitly. Not the current memory system — structural truth is codebase-memory-mcp and experience is Hindsight, both set up via memory-setup. The memory MCP server is opt-in. Do not use for new work.
---

# memory

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](reference.md).

Team memory nexus — organize knowledge as wings → rooms → drawers, searchable semantically via Nexus.

## Prerequisites

Ensure `mempalace` is installed:

```bash
mempalace --version
```

If not installed:

```bash
uv tool install mempalace   # recommended
# or: pip install mempalace
```

## Session Start

Call `mempalace_status` at the start of every session to orient. For deeper context, search the relevant wing.

## When to Save

Save to the nexus when the user shares:
- Architectural decisions and their rationale
- Team conventions and preferences
- Bug root causes and fixes
- Key project facts

Use `mempalace_add_drawer` with appropriate wing and room.

## Wing Conventions

- `work` — project code, decisions, architecture
- `personal` — individual preferences, notes
- `team` — shared team knowledge, onboarding

## Sub-Skills

- `/memory-search` — semantic search across the nexus
- `/memory-mine` — mine a project directory or text into the nexus
- `/memory-status` — nexus stats and structure
