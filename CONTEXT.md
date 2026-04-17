# CONTEXT.md

Context for AI assistants working in this repository.

## Project Purpose

huhhb is a **Claude Code skills marketplace** for Uhstray.io. It is not a traditional software project — it is a collection of markdown-based skill definitions that extend Claude Code's behavior for engineering teams.

Skills are invoked via:
- Explicit slash command: `/skill-name`
- Auto-trigger: Claude matches context to skill description and calls `Skill` tool automatically

## Repository Layout

```
huhhb/
├── skills/              # All skills, organized by category
│   ├── dev/             # Development workflows (TDD, debugging, refactor)
│   ├── ops/             # DevOps and infrastructure skills
│   ├── review/          # Code review and PR skills
│   └── onboarding/      # Team onboarding and setup skills
├── onboarding/          # First-run experience (welcome flow, skills list)
├── marketplace.json     # Skill manifest — source of truth for discovery
├── CLAUDE.md            # Instructions for Claude Code in this repo
├── CONTEXT.md           # This file
├── AGENT.md             # Agent behavior overrides
└── README.md            # User-facing documentation
```

## Skill Anatomy

Every skill is a markdown file with YAML frontmatter:

```markdown
---
name: skill-name
description: Precise one-liner — Claude uses this for Skill tool matching
triggers:
  - phrase the user might say
  - another trigger phrase
---

Skill body — what Claude should do when this skill is invoked.
```

The `description` field is critical. Claude's `Skill` tool matches user intent against this description. Vague descriptions cause missed triggers or false positives.

## Marketplace Manifest

`marketplace.json` is the authoritative index of all skills. Every skill must have an entry here before it is considered "published." Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier (slug) |
| `path` | Yes | Path to `skill.md` from repo root |
| `description` | Yes | Matches frontmatter description |
| `category` | Yes | `dev`, `ops`, `review`, `onboarding`, etc. |
| `tags` | No | Additional discovery tags |
| `version` | Yes | Semver string |

## Onboarding Flow

When a user installs huhhb, `onboarding/welcome.md` runs automatically. It:
1. Greets the user
2. Lists installed skills with one-line descriptions
3. Explains how to invoke skills
4. Points to `marketplace.json` for the full catalog

Keep the welcome flow under 30 seconds to read.

## Design Constraints

- Skills must be Claude Code only (no other AI platforms)
- No skill duplicates built-in Claude Code behavior
- Each skill solves one clear problem
- Skills may include supporting scripts (`.ps1`, `.sh`, `.py`) in the same directory
- All scripts must be cross-platform where possible (PowerShell + bash equivalents)
