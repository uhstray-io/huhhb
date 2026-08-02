---
name: huhhb-skills
description: List all available huhhb skills with descriptions and usage — use when the user asks to "list huhhb skills", "what skills are available", or "show me huhhb skills".
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

### Two-store memory (current routing)

The two stores are **codebase-memory-mcp** (code graph — structural truth,
regenerated from source) and **Hindsight** (experience store — decisions,
rationale and outcomes, the only copy). This is the architecture on the
routing path.

| Skill | Command | Description |
|-------|---------|-------------|
| two-store-memory-setup | `/two-store-memory-setup` | Use when installing, repairing, or verifying the two-store agent-memory architecture on a machine — a code-graph store for structural truth plus an experience store for decisions and outcomes. Gated phases, control-test verification at every gate, a catalogue of verified defects indexed by symptom, and the per-repo `memory-init` command it writes |
| repo-memory | `/repo-memory` | Repo-local memory in `.claude/memory/` — committed to git, no external service |

### MemPalace (retired from routing)

Powered by [MemPalace](https://github.com/mempalace/mempalace). Runs via the plugin's configured MCP (uvx) server, or install the CLI with `uv tool install mempalace` — either setup is valid; a configured MCP server without the CLI is not a missing install. **Retired from routing on 2026-08-01** — still shipped and installed with data intact, invoked only when asked for by name. Their descriptions still match a generic "remember this", so pick deliberately.

| Skill | Command | Description |
|-------|---------|-------------|
| memory | `/memory` | Access, search, and manage the team memory nexus — store and recall project context via MCP |
| memory-onboarding | `/memory-onboarding` | Use when checking or setting up the four-strata memory system on this machine and in the current project — "is my memory set up right", a fresh machine/repo, or a preflight memory-degradation report. Pass/warn/fail matrix + at most three next actions; diagnose-then-ask (only repo-memory first-run auto-applies); credentials never transit chat |
| memory-search | `/memory-search` | Semantic search across the memory nexus |
| memory-mine | `/memory-mine` | Ingest a project directory or text into the nexus |
| memory-status | `/memory-status` | Nexus stats — drawer count, wings, rooms |

## Self-Learning (evolve)

Cross-session learning backed by [Honcho](https://honcho.dev). **Off until
configured** — see [docs/evolve-plan.md](../docs/evolve-plan.md) for self-hosted or
managed setup; unconfigured machines behave as if it were not installed.

| Skill | Command | Description |
|-------|---------|-------------|
| evolve | `/evolve` | The memory protocol — recall what evolve has learned, persist durable facts, route knowledge to the right stratum |
| evolve-review | `/evolve-review` | The learning pass — turn captured observations into overlay-skill patches, with diffs and approval |
| evolve-status | `/evolve-status` | Loop health — spool depth, deriver queue, cache age, overlay confidence, pending proposals |
| evolve-skills | `/evolve-skills` | Library lifecycle pass — refine/merge/prune/create verdicts over all skills, evidence-gated |
| evolve-distill | `/evolve-distill` | Distill a repeated successful workflow into a reusable overlay skill — eval-gated, ≥2-session evidence, human-approved |
| evolve-map | `/evolve-map` | Inventory + relate all skills across tiers (repo/user/plugin); recommend augment-vs-build, avoid duplicates, promote user→repo |

## Dev Skills

| Skill | Command | Description |
|-------|---------|-------------|
| brainstorming | `/brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. |
| buhhdy-model-calibration-refresh | `/buhhdy-model-calibration-refresh` | Use when buhhdy's provider/model/auth facts need to be verified again — monthly, on a failed model ID, or on a provider announcement. Claims ledger → cheapest-first verification (cross-vendor for consequential claims) → in-place updates to the config/MODEL-MANIFEST calibration defaults, one PR per run; routing-structure changes only as a flagged human-judgment proposal |
| discovering-context | `/discovering-context` | Use when a goal is big, vague, or dependency-heavy and you need to map every piece of context required before planning — builds a context dependency DAG (mermaid) by relentlessly interviewing with recommended answers, expanding each node until it saturates, then hands the map to writing-plans |
| product-inception | `/product-inception` | Explicitly-requested product inception only ("new product", "new major initiative"): three human-gated phases — brief → PRD → architecture — then hands Workflow 1 an epic queue and stops. Never for feature/change-scale work. |
| dispatching-parallel-agents | `/dispatching-parallel-agents` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| executing-plans | `/executing-plans` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| finishing-a-development-branch | `/finishing-a-development-branch` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work |
| grounding | `/grounding` | Use when a long session should pause for a checkpoint — surfaces in-flight work, runs reviews + repo-conformance, and re-confirms goals (default 2h, configurable; opt-in, with a user-selectable check menu) |
| markdown-to-pdf | `/markdown-to-pdf` | Use when converting a Markdown file into a beautiful, print-ready PDF — styled cover page, running headers/footers, page numbers, GFM tables, syntax-highlighted code, and rendered mermaid diagrams (WeasyPrint + mermaid-cli, run via `uv`) |
| openspec-conformance | `/openspec-conformance` | Use when making OpenSpec conform to Uhstray's plans/development + plans/architecture layout — the once-per-repo store-registration setup, the house config rules, and the archive-time ADR promotion; the source of truth that repo-kickstart and pr-shepherd both call |
| pr-shepherd | `/pr-shepherd` | Use when buhhdy's Development workflow has open PRs to drive to merge — monitors CI + CodeRabbit + human review, routes findings back to the original implementer (2-attempts-then-human), gates the merge on a human approval (never merges autonomously), then runs post-merge close-out and a buhhdy/*-only branch janitor |
| repo-kickstart | `/repo-kickstart` | Use when bootstrapping any repo — greenfield or brownfield — into Uhstray's standard conventions: the README/AGENTS/KICKSTART/ARCHITECTURE doc set, the plans/ tree, OpenSpec, the two-store memory init for this repo (.cbmignore + index + bank + charter) plus a Honcho probe, CodeRabbit, and a branch-protection check. Owns repo scope; machine-scope install is `two-store-memory-setup`. Idempotent, registry-free, and non-destructive |
| session-resume | `/session-resume` | Use when picking up prior work in a fresh session — verifies the continuation file against the repo, re-hydrates context, briefs, then acts |
| session-save | `/session-save` | Use when ending or pausing a session and you want to resume cleanly later — writes a gitignored continuation file with the exact next action and chat-only context |
| subagent-driven-development | `/subagent-driven-development` | Use when executing implementation plans with independent tasks in the current session |
| systematic-debugging | `/systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| test-driven-development | `/test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code |
| using-git-worktrees | `/using-git-worktrees` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans |
| using-superpowers | `/using-superpowers` | Use when starting any conversation — establishes how to find and use skills, requiring Skill tool invocation before any response |
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

*To add a skill: see [AGENTS.md](../AGENTS.md) and open a PR.*
