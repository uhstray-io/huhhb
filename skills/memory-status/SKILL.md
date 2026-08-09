---
name: memory-status
description: LEGACY, retired from routing 2026-08-01 — MemPalace nexus stats. Use when MemPalace is named explicitly. For current memory health use memory-setup. The memory MCP server is opt-in.
---

# memory-status

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](../memory/reference.md).

Show nexus statistics and structure.

## How to Use

Call `mempalace_status` for totals.
Call `mempalace_list_wings` for wing list with drawer counts.
Call `mempalace_list_rooms` with a wing name for room breakdown.
Call `mempalace_get_taxonomy` for the full wing → room → count tree.

Present results as a compact summary:
- Total drawers
- Wings list with drawer counts per wing
- Oldest and newest content timestamps if available
