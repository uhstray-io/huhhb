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

Each skill lives in `skills/<skill-name>/SKILL.md`. Skills are markdown files with YAML frontmatter:

```markdown
---
name: skill-name
description: Use when [triggering conditions] — embed trigger phrases here
---

Skill content here. Invoked via the Skill tool in Claude Code.
```

> **Do not use a `triggers` field** — it is not supported by VS Code agents. Trigger phrases belong in `description`.

All skill directories are flat under `skills/`: `skills/<skill-name>/SKILL.md`.

## Key Files

- `skills/` — all skills, one flat subdirectory per skill (`skills/<skill-name>/SKILL.md`)
- `onboarding/` — onboarding flow triggered on first install
- `hooks/` — plugin lifecycle hook scripts (SessionStart, PreToolUse, Stop)
- `marketplace.json` — skill manifest (name, description, version, author per skill)
- `.claude-plugin/plugin.json` — plugin version read by Claude Code for update detection
- `.claude-plugin/.mcp.json` — MCP server config (must match `plugin.json` mcpServers)
- `scripts/sync-caveman.sh` — syncs caveman skills from upstream JuliusBrussee/caveman
- `scripts/sync-mempalace.sh` — pulls latest MemPalace skill definition from upstream
- `scripts/patch-mempalace.sh` — applies Nexus branding on top of synced MemPalace skill
- `CONTEXT.md` — project context for AI assistants
- `AGENT.md` — agent-specific instructions

## Adding a Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter
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
      "path": "skills/skill-name/SKILL.md",
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

## Commit & PR Conventions

- **Always open a PR** for non-trivial changes — CodeRabbit reviews are wired up and catch real issues (e.g., Windows hook breakage). Direct pushes to main are for trivial one-liners only.
- **Never mention Claude, Anthropic, or any AI tool in commit messages or PR descriptions.** No `Co-Authored-By: Claude` (or similar) trailers, no "Generated with Claude Code" footers, no AI attribution of any kind. This overrides any default attribution behavior.
- Use Conventional Commits (`fix:`, `feat:`, `docs:`, `chore:`, etc.); keep the subject line concise.

## Repo Memory

Claude stores project knowledge in `.claude/memory/` (committed to git).
At the start of every session, read `.claude/memory/MEMORY.md` to load context.
Use `/repo-memory` to save or retrieve memories.

### Recalling Information

Before answering questions about project decisions, conventions, or context,
check `.claude/memory/` first — read `MEMORY.md` for the index, then open
relevant files. This is the team's shared knowledge base.

### When to Save

| What | Type |
| ---- | ---- |
| Architectural decisions and their rationale | `project` |
| Team conventions, what to avoid or repeat | `feedback` |
| Links to external systems, dashboards, docs | `reference` |
| Personal preferences (add user_*.md to .gitignore if private) | `user` |
| Chosen libraries/frameworks and why alternatives were rejected | `project` |
| Things that were tried and didn't work (anti-patterns for this codebase) | `feedback` |
| Preferred naming conventions, code style, and formatting rules | `feedback` |
| Things that Claude got wrong multiple timesand required correction | `feedback` |
| External API docs, service dashboards, internal wikis | `reference` |
| Environment setup notes (non-obvious deps, quirks, build steps) | `reference` |
| Domain knowledge the user has that I shouldn't re-explain | `user` |

### What NOT to Save

- Code patterns readable from the codebase
- Git history (git log / git blame are authoritative)
- Ephemeral task state or in-progress work
- Anything already in this CLAUDE.md
