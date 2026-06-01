---
name: memory-mine
description: Mine a project directory or raw text into the memory nexus for future recall. Triggers on "mine this project", "index this directory", "add project to memory", "mine into memory".
---

# memory-mine

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
