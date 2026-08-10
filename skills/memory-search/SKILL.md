---
name: memory-search
description: Use when MemPalace is named explicitly and an existing MemPalace nexus must be searched semantically. Legacy, retired from routing 2026-08-01. For current memory use hindsight recall; for repo knowledge use repo-memory. The memory MCP server is opt-in.
---

# memory-search

> **Prerequisite — the `memory` MCP server is opt-in.** These tools come from a
> server this plugin no longer registers. If a `mempalace_*` tool is
> unavailable, it is not configured in this session — that is the expected
> state, not a fault. [How to enable it, and what to use instead](../memory/reference.md).

Semantic search across the team memory nexus.

## How to Use

1. Identify the key concept to search (be specific)
2. Call `mempalace_search` with `query` and optional `wing` filter
3. Present relevant results to the user, noting their wing/room/drawer

## Tips

- Narrow by wing if you know the context (e.g., `wing: "work"`)
- Use 3-5 content words in the query, not full sentences
- If results are poor, try rephrasing with synonyms
- Use `mempalace_get_taxonomy` to explore the full wing/room structure first
