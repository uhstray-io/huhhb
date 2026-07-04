---
name: huhhb-skills
description: List all available huhhb skills with descriptions and usage
triggers:
  - list huhhb skills
  - what skills are available
  - show me huhhb skills
---

# huhhb Skills

All available skills in the Uhstray.io marketplace.

## Onboarding

| Skill | Command | Description |
|-------|---------|-------------|
| huhhb-welcome | `/huhhb-welcome` | First-run tour of huhhb |
| huhhb-skills | `/huhhb-skills` | This list |
| onboarding | `/onboarding` | Interactive wizard to configure Auto Mode and Agent Teams |

## Memory Skills

Powered by [MemPalace](https://github.com/mempalace/mempalace). Requires `uv tool install mempalace`.

| Skill | Command | Description |
|-------|---------|-------------|
| memory | `/memory` | Access, search, and manage the team memory nexus — store and recall project context via MCP |
| memory-search | `/memory-search` | Semantic search across the memory nexus |
| memory-mine | `/memory-mine` | Ingest a project directory or text into the nexus |
| memory-status | `/memory-status` | Nexus stats — drawer count, wings, rooms |
| repo-memory | `/repo-memory` | Repo-local memory in `.claude/memory/` — committed to git, no external service |

## Self-Learning (evolve)

Cross-session learning backed by [Honcho](https://honcho.dev). **Off until
configured** — see [docs/evolve.md](../docs/evolve.md) for self-hosted or
managed setup; unconfigured machines behave as if it were not installed.

| Skill | Command | Description |
|-------|---------|-------------|
| evolve | `/evolve` | The memory protocol — recall what evolve has learned, persist durable facts, route knowledge to the right stratum |
| evolve-review | `/evolve-review` | The learning pass — turn captured observations into overlay-skill patches, with diffs and approval |
| evolve-status | `/evolve-status` | Loop health — spool depth, deriver queue, cache age, overlay confidence, pending proposals |

## Dev Skills

| Skill | Command | Description |
|-------|---------|-------------|
| brainstorming | `/brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. |
| dispatching-parallel-agents | `/dispatching-parallel-agents` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| executing-plans | `/executing-plans` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| finishing-a-development-branch | `/finishing-a-development-branch` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work |
| grounding | `/grounding` | Use when a long session should pause for a checkpoint — surfaces in-flight work, runs reviews + repo-conformance, and re-confirms goals (default 2h, configurable; opt-in, with a user-selectable check menu) |
| session-resume | `/session-resume` | Use when picking up prior work in a fresh session — verifies the continuation file against the repo, re-hydrates context, briefs, then acts |
| session-save | `/session-save` | Use when ending or pausing a session and you want to resume cleanly later — writes a gitignored continuation file with the exact next action and chat-only context |
| subagent-driven-development | `/subagent-driven-development` | Use when executing implementation plans with independent tasks in the current session |
| systematic-debugging | `/systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| test-driven-development | `/test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code |
| using-git-worktrees | `/using-git-worktrees` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans |
| verification-before-completion | `/verification-before-completion` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs |
| writing-plans | `/writing-plans` | Use when you have a spec or requirements for a multi-step task, before touching code |
| writing-skills | `/writing-skills` | Use when creating new skills, editing existing skills, or verifying skills work before deployment |

## Explanation Skills

| Skill | Command | Description |
|-------|---------|-------------|
| explaining-plans | `/explaining-plans` | Augment a plan, spec, or RFC in place — decision criteria, cited source context, target-outcome framing, and prose-introduced mermaid diagrams. Composes with writing-plans. |
| explaining-changes | `/explaining-changes` | Narrate changes as they happen — each logical change, each completed task, and before every commit. Brief prose + simple ASCII diagrams, chat-only. |

## Persona Skills

| Skill | Command | Description |
|-------|---------|-------------|
| training | `/training` | Socratic teaching mode — guides you through problems without writing code. Describes approaches, names APIs, links docs, asks questions. Off with "stop training". |
| caveman | `/caveman` | Ultra-compressed communication sourced from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman). Cuts token usage ~75%. Modes: lite, full, ultra, wenyan. Off with "stop caveman". |
| caveman-commit | `/caveman-commit` | Terse commit messages. Conventional Commits, ≤50 char subject. |
| caveman-review | `/caveman-review` | One-line PR review comments: location, problem, fix. |
| caveman-compress | `/caveman-compress` | Compress CLAUDE.md and other memory files to save input tokens. |
| caveman-help | `/caveman-help` | Quick-reference card for all caveman modes and commands. |
| caveman-stats | `/caveman-stats` | Session token usage metrics (requires caveman plugin hooks). |
| cavecrew | `/cavecrew` | Delegate code tasks to compressed subagents to preserve context. |

## Review Skills

| Skill | Command | Description |
|-------|---------|-------------|
| receiving-code-review | `/receiving-code-review` | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable |
| requesting-code-review | `/requesting-code-review` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| strict-simplify | `/strict-simplify` | Replace redundant/verbose logic with a provably-equivalent simpler form. Applies edits, shows the diff. No restructuring, renaming, reformatting, optimizing, or bug-fixing. |
| strict-refactor | `/strict-refactor` | Decompose large functions into named single-purpose units. Verbatim extraction only — no logic changes, no renames. |

---

*To add a skill: see [AGENT.md](../AGENT.md) and open a PR.*
