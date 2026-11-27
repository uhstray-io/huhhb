---
name: huhhb-skills
description: List all available huhhb skills with descriptions and usage — use when the user asks to "list huhhb skills", "what skills are available", or "show me huhhb skills".
---

# huhhb Skills

All available skills in the Uhstray.io marketplace.

## Onboarding

| Skill | Command | Description |
|-|-|-|
| huhhb-welcome | `onboarding/welcome.md` | First-run tour of huhhb |
| huhhb-skills | `onboarding/skills-list.md` | This list |
| onboarding | `/onboarding` | Interactive wizard to configure Auto Mode and Agent Teams |
| user-kickstart | `/user-kickstart` | Use when establishing, changing, or reverting how Claude writes toward you personally across every project — voice, register, standing preferences at user scope. Writes a delimited, revertible, 60-line-capped block in `~/.claude/CLAUDE.md` and routes the reasoning behind it to the hindsight `personal` bank |

## Memory Skills

### Two-store memory (current routing)

The two stores are **codebase-memory-mcp** (code graph — structural truth,
regenerated from source) and **Hindsight** (experience store — deliberation,
outcomes and preferences, the only copy). Ratified decisions are ADRs in `plans/architecture/` (ADR-0001). This is the architecture on the
routing path.

| Skill | Command | Description |
|-|-|-|
| memory-setup | `/memory-setup` | Use when installing, repairing, or verifying the two-store agent-memory architecture on a machine — a code-graph store for structural truth plus an experience store for deliberation, outcomes and preferences. Gated phases, control-test verification at every gate, a catalogue of verified defects indexed by symptom, and the per-repo `memory-init` command it writes |
| repo-memory | `/repo-memory` | Architecture decision records in `plans/architecture/` — master index by domain, a per-year decision log, monthly detail files. Append-only, supersede-never-edit. Committed to git and reviewable in the PR that changes them |
| fix-memory | `/fix-memory` | Use when a memory artifact is in the wrong store — migrates one at a time, ask-first, never bulk. Regenerable structure is deleted (the graph rebuilds it), ratified architectural decisions become ADRs, deliberation goes to the repo bank, cross-project preferences to `personal` |

### MemPalace (retired from routing)

Powered by [MemPalace](https://github.com/mempalace/mempalace). The plugin registers no MCP server; you can opt in to one, launched with `uvx` (see `skills/memory/reference.md`). The `mempalace` CLI (`uv tool install mempalace`) is separate, and these skills do not use it. **Retired from routing on 2026-08-01** — still shipped and installed with data intact, invoked only when asked for by name. Their manifest descriptions say they are legacy and apply only when MemPalace is named explicitly. Removal is planned in [2026-08-02-memory-skill-migration-plan.md](../plans/development/2026-08-02-memory-skill-migration-plan.md).

| Skill | Command | Description |
|-|-|-|
| memory | `/memory` | **Legacy** — read existing nexus data |
| memory-search | `/memory-search` | **Legacy** — nexus search; now Hindsight `recall` or `repo-memory` |
| memory-mine | `/memory-mine` | **Legacy** — nexus ingest; now codebase-memory-mcp indexing |
| memory-status | `/memory-status` | **Legacy** — nexus stats; now `memory-setup` |

## Self-Learning (evolve)

Cross-session learning backed by [Honcho](https://honcho.dev). **Off until
configured** — see [docs/evolve-plan.md](../docs/evolve-plan.md) for self-hosted or
managed setup; unconfigured machines behave as if it were not installed.

| Skill | Command | Description |
|-|-|-|
| evolve | `/evolve` | The memory protocol — recall what evolve has learned, persist durable facts, route knowledge to the right stratum |
| evolve-review | `/evolve-review` | The learning pass — turn captured observations into overlay-skill patches, with diffs and approval |
| evolve-status | `/evolve-status` | Loop health — spool depth, deriver queue, cache age, overlay confidence, pending proposals |
| evolve-skills | `/evolve-skills` | Library lifecycle pass — refine/merge/prune/create verdicts over all skills, evidence-gated |
| evolve-distill | `/evolve-distill` | Distill a repeated successful workflow into a reusable overlay skill — eval-gated, ≥2-session evidence, human-approved |
| evolve-map | `/evolve-map` | Inventory + relate all skills across tiers (repo/user/plugin); recommend augment-vs-build, avoid duplicates, promote user→repo |

## Dev Skills

| Skill | Command | Description |
|-|-|-|
| brainstorming | `/brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. |
| discovering-context | `/discovering-context` | Use when a goal is big, vague, or dependency-heavy and you need to map every piece of context required before planning — builds a context dependency DAG (mermaid) by relentlessly interviewing with recommended answers, expanding each node until it saturates, then hands the map to writing-plans |
| product-inception | `/product-inception` | Explicitly-requested product inception only ("new product", "new major initiative"): three human-gated phases — brief → PRD → architecture — then files its Epic Queue as Plane work items and stops. Never for feature/change-scale work. |
| finishing-a-development-branch | `/finishing-a-development-branch` | Use when implementation is complete and the branch needs finishing. Verifies tests and reads the pull request state before any push, then opens or updates a pull request, keeps the branch, or discards it. After a merge it hands off to the pr-shepherd close-out |
| grounding | `/grounding` | Use when a long session should pause for a checkpoint — surfaces in-flight work, runs reviews + conformance, re-confirms goals (every 2500 changed lines by default, configurable; opt-in, user-selectable check menu) |
| markdown-to-pdf | `/markdown-to-pdf` | Use when converting a Markdown file into a beautiful, print-ready PDF — styled cover page, running headers/footers, page numbers, GFM tables, syntax-highlighted code, and rendered mermaid diagrams (WeasyPrint + mermaid-cli, run via `uv`) |
| pr-shepherd | `/pr-shepherd` | Use when an orchestrating session has open PRs to drive from creation to merge and cleanup. Monitors CI and review rounds, routes findings back to the original implementer, merges only when the review rounds on the final head ask for no changes (merge commits only), then closes out linked issues, the Plane item and the worktree |
| plane-work-tracking | `/plane-work-tracking` | Use when starting, picking up, finishing, or switching Plane work items in a repo that has a Plane project, or when new work is discovered mid-task and must be tracked |
| repo-kickstart | `/repo-kickstart` | Use when bootstrapping any repo — greenfield or brownfield — into Uhstray's standard development conventions: the doc set, the plans/ tree, the two-store memory init for this repo, a CodeRabbit config, and a ruleset-first branch-protection check. Owns repo scope; machine-scope install is `memory-setup`. Idempotent and non-destructive |
| systematic-debugging | `/systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| test-driven-development | `/test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code |
| using-superpowers | `/using-superpowers` | Use when starting any conversation — establishes how to find and use skills, requiring Skill tool invocation before any response |
| verification-before-completion | `/verification-before-completion` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs |
| writing-plans | `/writing-plans` | Use when you have a spec or requirements for a multi-step task, before touching code |
| writing-skills | `/writing-skills` | Use when creating new skills, editing existing skills, or verifying skills work before deployment |

## Explanation Skills

| Skill | Command | Description |
|-|-|-|
| explaining-plans | `/explaining-plans` | Augment a plan, spec, or RFC in place — decision criteria, cited source context, target-outcome framing, and prose-introduced mermaid diagrams. Composes with writing-plans. |
| explaining-changes | `/explaining-changes` | Narrate changes as they happen — each logical change, each completed task, and before every commit. Brief prose + simple ASCII diagrams, chat-only. |

## Persona Skills

| Skill | Command | Description |
|-|-|-|
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
|-|-|-|
| receiving-code-review | `/receiving-code-review` | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable |
| requesting-code-review | `/requesting-code-review` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| prune-tests | `/prune-tests` | Use when a test suite carries tests that guard no behavior and should be cut down |
| humanizer | `/humanizer` | Use when prose reads as AI-written and should sound human |
| strict-simplify | `/strict-simplify` | Replace redundant/verbose logic with a provably-equivalent simpler form. Applies edits, shows the diff. No restructuring, renaming, reformatting, optimizing, or bug-fixing. |
| strict-refactor | `/strict-refactor` | Decompose large functions into named single-purpose units. Verbatim extraction only — no logic changes, no renames. |

---

*To add a skill: see [AGENTS.md](../AGENTS.md) and open a PR.*
