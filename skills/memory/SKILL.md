---
name: memory
description: Use when MemPalace is named explicitly, or data already stored in a MemPalace nexus must be read. Legacy, retired from routing 2026-08-01. Not the current memory system — structural truth is codebase-memory-mcp and experience is Hindsight, both set up via memory-setup. The memory MCP server is opt-in. Do not use for new work.
---

# memory

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](reference.md).

Team memory nexus — organize knowledge as wings → rooms → drawers, searchable semantically via Nexus.

## Prerequisites

This skill calls `mempalace_*` **MCP tools**. It does not use the `mempalace`
CLI, and installing that CLI does not register those tools — the two are
separate things, and conflating them is why this section used to send people to
`uv tool install` for a problem it cannot fix.

The only prerequisite is the MCP server, which this plugin no longer registers.
If the tools are missing, that is the expected state:
[how to enable it, and what to use instead](reference.md).

## Orientation

When the tools are available, `mempalace_status` shows what a nexus holds; for
deeper context, search the relevant wing. This is not a session-start ritual —
the skill is retired from routing and runs only when MemPalace is named, so
there is no session for it to start.

## When to Save

Nothing new should be written through this skill; see the redirect table in
[reference.md](reference.md). Historically the nexus took what the user shared:
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
