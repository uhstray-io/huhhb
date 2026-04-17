---
name: uhh-memory
description: Access, search, and manage Uhstray.io team memory nexus. Auto-triggers at session start to load context.
triggers:
  - remember this
  - save to memory
  - check memory
  - what do we know about
  - recall
---

# uhh:memory

Uhstray.io's team memory nexus. Organized as wings → rooms → drawers.

## Session Start
Call `uhh_wake_up` at the start of every session to load team context.

## When to Save
Save to memory when the user shares:
- Architectural decisions and their rationale
- Team conventions and preferences
- Bug root causes and fixes
- Key project facts

Use `uhh_add_drawer` with appropriate wing and room.

## Wing Conventions
- `work` — project code, decisions, architecture
- `personal` — individual preferences, notes
- `team` — shared team knowledge, onboarding

## Sub-Skills
- `/uhh-memory-search` — search the nexus
- `/uhh-memory-mine` — mine a project directory
- `/uhh-memory-status` — nexus stats
