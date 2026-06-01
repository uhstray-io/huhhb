---
name: memory
description: Access, search, and manage the team memory nexus — mine projects, store context, and recall knowledge. Triggers on "remember this", "save to memory", "check memory", "what do we know about", "recall". Auto-triggers at session start to load context.
---

# memory

Team memory nexus — organize knowledge as wings → rooms → drawers, searchable semantically via MemPalace.

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
