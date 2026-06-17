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

### Onboarding

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `onboarding` | `/onboarding` | First-time setup wizard — configure Auto Mode, enable Agent Teams, and orient to Claude Code |

### Memory

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `memory` | `/memory` | Team memory nexus (Uhstray.io) — store and recall project context via MCP |
| `memory-search` | `/memory-search` | Semantic search across the nexus |
| `memory-mine` | `/memory-mine` | Ingest a project directory into the nexus |
| `memory-status` | `/memory-status` | Nexus stats — drawer count, wings, rooms |
| `repo-memory` | `/repo-memory` | Repo-local memory in `.claude/memory/` — committed to git, no external service |

### Dev Workflows

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `using-superpowers` | `/using-superpowers` | How to find and invoke skills — read this at session start if skills aren't auto-matching |
| `brainstorming` | `/brainstorming` | Explore intent and design before touching any code — required before implementing features |
| `writing-plans` | `/writing-plans` | Write a structured implementation plan from a spec or requirements |
| `executing-plans` | `/executing-plans` | Execute a written plan in a focused session with review checkpoints |
| `test-driven-development` | `/test-driven-development` | Write failing tests before writing implementation code |
| `systematic-debugging` | `/systematic-debugging` | Root-cause a bug before proposing any fix |
| `verification-before-completion` | `/verification-before-completion` | Run verification commands and confirm output before claiming work is done |
| `grounding` | `/grounding` | Pause a long session for a checkpoint — surfaces in-flight work, runs `/simplify` + `/security-review` and test/build/lint health, checks the diff against repo conventions, and re-confirms goals. Hook-fired (default 2h) or manual; opt-in |
| `subagent-driven-development` | `/subagent-driven-development` | Execute a multi-step plan using parallel subagents in the current session |
| `dispatching-parallel-agents` | `/dispatching-parallel-agents` | Split 2+ fully independent tasks across separate agents simultaneously |
| `using-git-worktrees` | `/using-git-worktrees` | Isolate feature work in a separate git worktree to avoid conflicting with the current workspace |
| `finishing-a-development-branch` | `/finishing-a-development-branch` | Decide how to integrate completed work — merge, PR, squash, or clean up |
| `writing-skills` | `/writing-skills` | Author, edit, or validate a new huhhb skill before shipping it |

### Explanation

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `explaining-plans` | `/explaining-plans` | Augment a plan/spec/RFC in place — decision criteria, cited sources, target outcome, mermaid diagrams. Composes with `writing-plans`. |
| `explaining-changes` | `/explaining-changes` | Narrate changes as they happen — each change, each task, and before every commit. Brief prose + ASCII diagrams, chat-only. |

### Review

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `requesting-code-review` | `/requesting-code-review` | Structure and submit a code review request — frames what changed, why, and what needs scrutiny |
| `receiving-code-review` | `/receiving-code-review` | Process incoming review feedback with technical rigor before implementing suggestions |
| `strict-simplify` | `/strict-simplify` | Replace redundant/verbose logic with a provably-equivalent simpler form — applies edits, shows the diff |
| `strict-refactor` | `/strict-refactor` | Decompose large functions into named single-purpose units — verbatim extraction only, no logic changes, no renames |

### Persona

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `training` | `/training` | Socratic "Sensei" mode — guides you to the answer through questions, never writes code for you |
| `caveman` | `/caveman` | Ultra-compressed communication — ~75% fewer tokens, full technical accuracy |
| `caveman-commit` | `/caveman-commit` | Terse Conventional Commits, subject ≤50 chars |
| `caveman-review` | `/caveman-review` | One-line PR comments: location, problem, fix |
| `caveman-compress` | `/caveman-compress` | Compress CLAUDE.md and memory files into caveman format to save input tokens |
| `caveman-help` | `/caveman-help` | Quick-reference card for all caveman modes and commands |
| `caveman-stats` | `/caveman-stats` | Session token usage metrics (requires caveman plugin hooks) |
| `cavecrew` | `/cavecrew` | Delegate code tasks to compressed subagents to preserve main context length |

> Caveman skills sourced from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman). Run `scripts/sync-caveman.sh` to pull the latest.

Browse the full manifest: [`marketplace.json`](./marketplace.json)

### Plugin Hooks

Lifecycle hooks in `hooks/` fire automatically — no invocation needed:

| Hook | Event | Purpose |
|------|-------|---------|
| `explain-changes-activate.sh` | SessionStart | Opt-in always-on narration (set `HUHHB_EXPLAIN_CHANGES=1` or create `~/.claude/explaining-changes.on`) |
| `repo-memory-load.sh` | SessionStart | Auto-loads `.claude/memory/MEMORY.md` when present in the project |
| `precommit-explain.sh` | PreToolUse (Bash) | Nudges a change summary before every `git commit` |
| `grounding-check.sh` | UserPromptSubmit | Fires a grounding checkpoint (`grounding` skill) after a long session — default 2h interval, configurable; opt-in, off by default |

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
