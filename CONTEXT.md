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
├── skills/              # All skills — one flat directory per skill (no category subdirs)
│   └── <skill-name>/    #   each holds SKILL.md (+ optional principles.md / scripts)
│       └── SKILL.md
├── onboarding/          # First-run tour (welcome.md) and skill list (skills-list.md)
├── .claude-plugin/      # plugin.json (version + hook registration), marketplace.json (plugin listing)
├── hooks/               # Hook scripts; plugin.json registers 11 (README § Plugin Hooks)
├── marketplace.json     # Skill manifest — source of truth for discovery
├── CLAUDE.md            # Instructions for Claude Code in this repo
├── CONTEXT.md           # This file
├── AGENTS.md            # Unified agent instructions (all AI tools)
└── README.md            # User-facing documentation
```

Skills are **flat** under `skills/` — `category` is a field in `marketplace.json`, not a directory.

## Skill Anatomy

Every skill is a markdown file with YAML frontmatter:

```markdown
---
name: skill-name
description: Use when … — a precise one-liner with trigger phrases embedded; Claude uses this for Skill tool matching
---

Skill body — what Claude should do when this skill is invoked.
```

The `description` field is critical. Claude's `Skill` tool matches user intent against this description. Vague descriptions cause missed triggers or false positives. **Do not use a `triggers:` field** — it is not supported by VS Code agents; put trigger phrases in `description`.

## Marketplace Manifest

`marketplace.json` is the authoritative index of all skills. Every skill must have an entry here before it is considered "published." Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier (slug) |
| `path` | Yes | Path to `SKILL.md` from repo root (e.g. `skills/<skill-name>/SKILL.md`) |
| `description` | Yes | Matches frontmatter description |
| `category` | Yes | `dev`, `ops`, `review`, `onboarding`, etc. |
| `tags` | No | Additional discovery tags |
| `version` | Yes | Semver string |

## Onboarding Flow

`onboarding/welcome.md` (first-run tour) and `onboarding/skills-list.md` (the skill list) ship with the plugin as `marketplace.json` entries `huhhb-welcome` and `huhhb-skills`; nothing runs them automatically. Open the file, or ask Claude to read it.

The tour covers the optional `uv` prerequisite, what skills are, how to list the installed skills, the optional evolve setup, personal `CLAUDE.md` preferences, and where to get help. Keep the welcome flow under 30 seconds to read.

## Design Constraints

- Skills must be Claude Code only (no other AI platforms)
- No skill duplicates built-in Claude Code behavior
- Each skill solves one clear problem
- Skills may include supporting scripts (`.ps1`, `.sh`, `.py`) in the same directory
- Plugin hooks (registered in `.claude-plugin/plugin.json`) are invoked via a **POSIX shell** (`sh …`). On Windows, run Claude Code with Git Bash or WSL on PATH so `sh` resolves. Bundled `.ps1` files are reference equivalents for manual setup — `plugin.json` uses a single command string with no per-OS dispatch, so they are **not** auto-selected.
