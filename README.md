# huhhb

**huhhb** is Uhstray.io's Claude Code skills marketplace — a curated library of skills (slash commands, workflows, AI automation) for teams building with Claude Code.

> Name is a play on "hub" (a place for skills) + "uhh" (Uhstray). Say it fast.

---

## Install

```bash
# 1. Add the marketplace
claude plugin marketplace add uhstray-io/huhhb

# 2. Install (user scope — available in all projects)
claude plugin install --scope user huhhb

# Or project-scoped — only in this repo
claude plugin install --scope project huhhb
```

> **`memory` requires [MemPalace](https://github.com/mempalace/mempalace) for its MCP server.**
> Install it once, then the plugin uses it automatically:
>
> ```bash
> uv tool install mempalace   # recommended
> # or: pip install mempalace
> ```

---

## Update

```bash
# Fetch latest from all marketplaces
claude plugin marketplace update

# Uninstall then reinstall — "install" silently skips if already present
claude plugin uninstall huhhb
claude plugin install --scope user huhhb
```

---

## Add a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter:

```markdown
---
name: skill-name
description: Use when [specific triggering conditions] — embed trigger phrases here, not in a triggers field
---

# Skill content here
```

> **Note:** The `triggers` frontmatter field is not supported by VS Code agents. Put trigger phrases in the `description` instead.

2. Register it in `marketplace.json`:

```json
{
  "name": "skill-name",
  "path": "skills/skill-name/SKILL.md",
  "description": "...",
  "category": "category",
  "tags": ["tag1", "tag2"],
  "version": "0.1.0"
}
```

3. Open a PR — see [CONTEXT.md](./CONTEXT.md) for quality requirements.

---

## What's Inside

### Memory

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `memory` | `/memory` | Team memory nexus (Uhstray.io) — store and recall project context via MCP |
| `memory-search` | `/memory-search` | Semantic search across the nexus |
| `memory-mine` | `/memory-mine` | Ingest a project directory into the nexus |
| `memory-status` | `/memory-status` | Nexus stats — drawer count, wings, rooms |
| `repo-memory` | `/repo-memory` | Repo-local memory in `.claude/memory/` — committed to git, no external service |

### Dev Workflows (via [superpowers](https://github.com/obra/superpowers))

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `using-superpowers` | `/using-superpowers` | Session start — how to find and invoke skills correctly |
| `brainstorming` | `/brainstorming` | Explore intent and design before any implementation |
| `writing-plans` | `/writing-plans` | Write a structured implementation plan from a spec |
| `executing-plans` | `/executing-plans` | Execute a written plan with review checkpoints |
| `test-driven-development` | `/test-driven-development` | Write tests before implementation code |
| `systematic-debugging` | `/systematic-debugging` | Root-cause bugs before proposing fixes |
| `verification-before-completion` | `/verification-before-completion` | Verify work passes before claiming done |
| `subagent-driven-development` | `/subagent-driven-development` | Execute plans via parallel subagents |
| `dispatching-parallel-agents` | `/dispatching-parallel-agents` | Split independent tasks across agents |
| `using-git-worktrees` | `/using-git-worktrees` | Isolate feature work in git worktrees |
| `finishing-a-development-branch` | `/finishing-a-development-branch` | Structured options for merge, PR, or cleanup |
| `writing-skills` | `/writing-skills` | Create and validate new skills |

### Explanation

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `explaining-plans` | `/explaining-plans` | Augment a plan/spec/RFC in place — decision criteria, cited sources, target outcome, mermaid diagrams. Composes with `writing-plans`. |
| `explaining-changes` | `/explaining-changes` | Narrate changes as they happen — each change, each task, and before every commit. Brief prose + ASCII diagrams, chat-only. |

### Review

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `requesting-code-review` | `/requesting-code-review` | Verify work before merging |
| `receiving-code-review` | `/receiving-code-review` | Process review feedback with technical rigor |
| `strict-simplify` | `/strict-simplify` | Replace redundant/verbose logic with a provably-equivalent simpler form — applies edits, shows the diff |

### Caveman (Persona)

Sourced from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman). Run `scripts/sync-caveman.sh` to pull the latest.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `training` | `/training` | Socratic "Sensei" mode — guides you to the answer, never writes code |
| `caveman` | `/caveman` | Ultra-compressed mode — ~75% fewer tokens, full technical accuracy |
| `caveman-commit` | `/caveman-commit` | Terse Conventional Commits, subject ≤50 chars |
| `caveman-review` | `/caveman-review` | One-line PR comments: location, problem, fix |
| `caveman-compress` | `/caveman-compress <file>` | Compress memory files to save input tokens |
| `caveman-help` | `/caveman-help` | Quick-reference for all caveman modes |
| `caveman-stats` | `/caveman-stats` | Session token usage metrics (requires caveman plugin hooks) |
| `cavecrew` | `/cavecrew` | Delegate to compressed subagents to preserve context |

Browse the full manifest: [`marketplace.json`](./marketplace.json)

### Plugin Hooks

Lifecycle hooks in `hooks/` fire automatically — no invocation needed:

| Hook | Event | Purpose |
|------|-------|---------|
| `explain-changes-activate.sh` | SessionStart | Opt-in always-on narration (set `HUHHB_EXPLAIN_CHANGES=1` or create `~/.claude/explaining-changes.on`) |
| `repo-memory-load.sh` | SessionStart | Auto-loads `.claude/memory/MEMORY.md` when present in the project |
| `precommit-explain.sh` | PreToolUse (Bash) | Nudges a change summary before every `git commit` |

---

## CLI Reference (`mempalace`)

Requires `mempalace` installed (`uv tool install mempalace`).

```bash
mempalace init                          # Initialize the nexus
mempalace status                        # Show drawer count and wings
mempalace mine <path> --wing work       # Ingest a directory
mempalace search "query"                # Semantic search
mempalace instructions <command>        # Get instructions for: help, init, mine, search, status
```

Run `scripts/sync-mempalace.sh` to pull the latest MemPalace skill definition.

---

## About

Built by [Uhstray.io](https://uhstray.io) — an AI-native team building tools for teams building with AI.
