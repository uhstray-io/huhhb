---
name: uhh-memory-search
description: Search the uhh:memory palace for relevant team knowledge, decisions, or context.
triggers:
  - search memory
  - find in memory
  - look up in palace
  - what do we know about X
---

# uhh:memory-search

Search team memory palace for relevant context.

## How to Use
1. Identify the key concept to search (be specific)
2. Call `uhh_search` with `query` and optional `wing` filter
3. Present relevant results to the user, noting their wing/room

## Tips
- Narrow by wing if you know the context (e.g., `wing: "work"`)
- Use 3-5 content words in the query, not full sentences
- If results are poor, try rephrasing with synonyms
