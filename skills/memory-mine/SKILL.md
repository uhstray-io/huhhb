---
name: memory-mine
description: Use when MemPalace is named explicitly and a directory must be ingested into an existing MemPalace nexus. Legacy, retired from routing 2026-08-01. For current code structure use codebase-memory-mcp indexing instead. The memory MCP server is opt-in.
---

# memory-mine

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](../memory/reference.md).

Ingest project files or raw text into the team memory nexus.

## Mine a Project Directory

Use `mempalace_sync` to ingest a project path:
- Provide the full directory path
- Choose a wing (e.g., `work`) and room name

## Mine Raw Text

Call `mempalace_add_drawer` with:
- `wing`: category (e.g., `work`)
- `room`: topic (e.g., `auth`, `billing`, `api`)
- `content`: verbatim text to store

## Before Mining

Confirm with user:
- What wing to use
- Whether to mine the whole directory or specific files
- Estimated scope (large directories may produce many drawers)
