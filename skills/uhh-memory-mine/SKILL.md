---
name: uhh-memory-mine
description: Mine a project directory or raw text into the uhh:memory palace for future recall.
triggers:
  - mine this project
  - index this directory
  - add project to memory
  - mine into memory
---

# uhh:memory-mine

Ingest project files or raw text into the memory palace.

## Mine a Directory
Use CLI: `uhh-mem mine <path> --wing <wing-name>`
Or call `uhh_mine_text` with extracted content.

## Mine Raw Text
Call `uhh_mine_text` with:
- `wing`: category (e.g., "work")
- `room`: topic (e.g., "auth", "billing", "api")
- `text`: the content to store

Text auto-splits into 800-char drawers with overlap.

## Before Mining
Confirm with user:
- What wing to use
- Whether to mine the whole directory or specific files
- Estimated drawer count (rough: 1 drawer per ~500 chars of content)
