# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**huhhb** (pronounced "hub") is Uhstray.io's Claude Code skills marketplace — a curated collection of skills (slash commands, workflows, automation) for Claude Code users. Name is a play on "hub" + "uhh" (Uhstray).

Install via:
```bash
claude plugin marketplace add uhstray-io/huhhb
claude plugin install --scope user huhhb
```

## Skill Structure

Each skill lives in `skills/<skill-name>/skill.md`. Skills are markdown files with YAML frontmatter:

```markdown
---
name: skill-name
description: One-line description (used for skill discovery and the Skill tool)
---

Skill content here. Invoked via the Skill tool in Claude Code.
```

Skill categories live in subdirectories: `skills/dev/`, `skills/ops/`, `skills/review/`, etc.

## Key Files

- `skills/` — all skills, one subdirectory per skill or category
- `onboarding/` — onboarding flow triggered on first install
- `marketplace.json` — skill manifest (name, description, version, author per skill)
- `CONTEXT.md` — project context for AI assistants
- `AGENT.md` — agent-specific instructions

## Adding a Skill

1. Create `skills/<category>/<skill-name>/skill.md` with frontmatter
2. Add entry to `marketplace.json`
3. If the skill has supporting scripts, place them alongside `skill.md`
4. Update `onboarding/skills-list.md` so new users discover it

## Marketplace Manifest (`marketplace.json`)

```json
{
  "name": "huhhb",
  "publisher": "uhstray-io",
  "version": "0.1.0",
  "skills": [
    {
      "name": "skill-name",
      "path": "skills/category/skill-name/skill.md",
      "description": "...",
      "tags": ["dev", "review"]
    }
  ]
}
```

## Onboarding

First install runs `onboarding/welcome.md` — a guided tour of available skills. Keep it short: what's installed, how to invoke (`/skill-name`), where to find the full list.

## Skill Quality Bar

- Description must be specific enough for Claude to match via `Skill` tool
- Skills must state their trigger conditions (when to auto-invoke)
- No skill should duplicate built-in Claude Code behavior
- Test each skill against at least one real use case before merging
