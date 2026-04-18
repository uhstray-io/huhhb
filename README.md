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

> **`memory` requires [`uv`](https://docs.astral.sh/uv/getting-started/installation/) for its MCP server.**
> The plugin auto-resolves Python deps via `uv run` — no manual `pip install` needed.
>
> ```bash
> # macOS / Linux
> curl -LsSf https://astral.sh/uv/install.sh | sh
>
> # Windows (PowerShell)
> powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
> ```

---

## Update

```bash
# Fetch latest from all marketplaces
claude plugin marketplace update

# Re-install to apply updates
claude plugin install --scope user huhhb
```

---

## Add a New Skill

1. Create `skills/<category>/<skill-name>/skill.md` with YAML frontmatter:

```markdown
---
name: skill-name
description: One-line description (shown in skill discovery)
triggers:
  - phrase that triggers this skill
---

# Skill content here
```

2. Register it in `marketplace.json`:

```json
{
  "name": "skill-name",
  "path": "skills/category/skill-name/skill.md",
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
| `memory` | `/memory` | Team memory nexus — store and recall project context |
| `memory-search` | `/memory-search` | Semantic search across the nexus |
| `memory-mine` | `/memory-mine` | Ingest a project directory into the nexus |
| `memory-status` | `/memory-status` | Nexus stats — drawer count, wings, rooms |

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

### Review

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `requesting-code-review` | `/requesting-code-review` | Verify work before merging |
| `receiving-code-review` | `/receiving-code-review` | Process review feedback with technical rigor |

### Unga Bunga (Persona)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `unga-bunga` | `/unga-bunga` | Ultra-compressed mode — ~75% fewer tokens, full technical accuracy |
| `unga-bunga-commit` | `/unga-bunga-commit` | Terse Conventional Commits, subject ≤50 chars |
| `unga-bunga-review` | `/unga-bunga-review` | One-line PR comments: location, problem, fix |
| `unga-bunga-compress` | `/unga-bunga:compress <file>` | Compress memory files to save input tokens |
| `unga-bunga-help` | `/unga-bunga-help` | Quick-reference for all Unga Bunga modes |

Browse the full manifest: [`marketplace.json`](./marketplace.json)

---

## CLI Reference (`uhh-mem`)

Requires `uv` installed. Run from the plugin cache directory or any directory with the package:

```bash
uhh-mem init              # Initialize the nexus
uhh-mem status            # Show drawer count and wings
uhh-mem mine <path> --wing work   # Ingest a directory
uhh-mem search "query"    # Semantic search
uhh-mem wake-up           # Print L0+L1 session context
```

---

## About

Built by [Uhstray.io](https://uhstray.io) — an AI-native team building tools for teams building with AI.
