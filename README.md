# huhhb

**huhhb** is Uhstray.io's Claude Code skills marketplace — a curated library of skills (slash commands, workflows, AI automation) for teams building with Claude Code.

> Name is a play on "hub" (a place for skills) + "uhh" (Uhstray). Say it fast.

---

## Project conventions

- **[AGENTS.md](AGENTS.md)** — canonical operating instructions for AI agents (`CLAUDE.md` points to it).
- **[KICKSTART.md](KICKSTART.md)** — set up, run, and develop here.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — current-state architecture.
- **[plans/](plans/)** — dated development plans and architecture ADRs.

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

The skills work standalone. The **memory stores are optional** and only needed by the
memory skills — see [Memory](#memory) below, and run `/memory-setup` rather
than installing them by hand.

---

## Update

```bash
claude plugin marketplace update    # refresh the marketplace from its source
claude plugin update huhhb@huhhb    # flip the install to the new version
```

Restart to apply — a running session keeps the version it loaded at start.

> **`claude plugin install` will not upgrade you.** On an already-installed plugin it
> reports success and builds the new version's cache directory while leaving
> `installed_plugins.json` pointed at the old one. Confirm an upgrade by reading that
> file, not the success line.

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

3. Add a row to [onboarding/skills-list.md](onboarding/skills-list.md) and at least one
   G1 bench scenario in `tests/bench/<skill>.json`.

4. Open a PR — quality gates and conventions are in [AGENTS.md](AGENTS.md).

---

## What's Inside

Skills are grouped by **what they act on**, which is also the order you meet them:
configure yourself, then a repository, then the day-to-day work.

| Tier | Scope | Runs |
|------|-------|------|
| [User-level](#user-level-skills) | your machine and account, every project | once per machine, then rarely |
| [Project-level](#project-level-skills) | one repository | once per repo, then on drift |
| [Development](#development-skills) | the task in front of you | many times a day |

---

## User-level skills

Set up and shape Claude **for you**, across every project. State lives in
`~/.claude/` or a personal memory bank — never in the repo.

### Getting started

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `huhhb-welcome` | `onboarding/welcome.md` | First-run tour of huhhb |
| `huhhb-skills` | `onboarding/skills-list.md` | List every available skill |
| `onboarding` | `/onboarding` | First-time Claude Code setup — Auto Mode, Agent Teams, orientation |
| `user-kickstart` | `/user-kickstart` | Establish how Claude writes to *you* — voice, register, standing preferences. Writes a delimited, revertible, 60-line-capped block in `~/.claude/CLAUDE.md` and routes the reasoning behind it to your personal memory bank |

[onboarding/welcome.md](onboarding/welcome.md) (first-run tour) and [onboarding/skills-list.md](onboarding/skills-list.md) (the skill list) ship with the plugin as `marketplace.json` entries `huhhb-welcome` and `huhhb-skills`; nothing runs them automatically. The installed copies live under `~/.claude/plugins/cache/huhhb/huhhb/<version>/onboarding/`, where `<version>` is the installed version, so you can open them from any repository or ask Claude to read them. The links above open the same files on GitHub.

### Memory

huhhb uses **two stores that never hold the same fact**:

| | [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | [Hindsight](https://github.com/vectorize-io/hindsight) |
|---|---|---|
| Holds | **What is** — present-tense structural truth about code | **What happened and why** — deliberation, attempts, outcomes, preferences. *Ratified* decisions are ADRs in `plans/architecture/` (ADR-0001), not here |
| Rebuilt from | source, deterministically, any time | nothing — it is the only copy |
| Write cost | zero, no LLM | a model call per retain |
| Authoritative on | call graphs, blast radius, dead code, routes, architecture | rationale, rejected alternatives, failures, what worked |

The split is the point: a code graph regenerates for free and goes stale the moment you
commit, so structural facts belong there and nowhere else. Experience cannot be
regenerated at all, so it belongs in the experience store and nowhere else. Neither can
query the other — the join is performed at query time by translating identifiers into
domain concepts.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `memory-setup` | `/memory-setup` | Install, repair, or verify both stores on a machine — gated phases, control-test verification at each gate, a defect catalogue indexed by symptom |
| `fix-memory` | `/fix-memory` | Move a memory artifact to the store that owns it — one at a time, ask first, never bulk. Regenerable structure is deleted, ratified decisions become ADRs, deliberation goes to the repo bank |

### Self-learning (evolve)

**Experimental and untested.** Cross-session learning backed by [Honcho](https://honcho.dev): a Stop hook digests each
session into typed observations, the deriver turns them into conclusions, and a
SessionStart hook injects what was learned into the next session. Personalization lands
in overlay skills (`~/.claude/skills/*-local/`) — hub skills are never edited. **Inert
until configured**; setup, privacy model, and purge in [docs/evolve-plan.md](docs/evolve-plan.md).

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `evolve` | `/evolve` | Memory protocol — recall, explicit writes, strata routing, read cost ladder |
| `evolve-review` | `/evolve-review` | The learning pass — observations → overlay patches / repo-memory, diff + approval |
| `evolve-status` | `/evolve-status` | Loop health — spool, deriver queue, cache age, overlay confidence |
| `evolve-skills` | `/evolve-skills` | Library lifecycle — audit all skills, refine/merge/prune/create with evidence |
| `evolve-distill` | `/evolve-distill` | Distill a proven workflow into a reusable overlay skill — eval-gated, human-approved |
| `evolve-map` | `/evolve-map` | Inventory and relate all skills across tiers; recommend augment-vs-build, avoid duplicates |

### Personas

How Claude talks to you. A persona is a standing preference, so it is user-level even
though you feel it on every task.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `caveman` | `/caveman` | Ultra-compressed prose — cuts filler, keeps meaning |
| `caveman-commit` | `/caveman-commit` | Conventional Commits, subject ≤50 chars, body only when "why" isn't obvious |
| `caveman-review` | `/caveman-review` | Compressed code review |
| `caveman-compress` | `/caveman-compress` | Compress an existing block of text |
| `caveman-help` / `caveman-stats` | `/caveman-help`, `/caveman-stats` | Usage guide and compression stats |
| `cavecrew` | `/cavecrew` | Multi-agent caveman crew |
| `training` | `/training` | Sensei mode — withholds answers and teaches instead |

### Legacy memory skills

> **Retired from routing, and the server is now opt-in.** These read a MemPalace nexus,
> which huhhb no longer routes to. The skills still ship and your data is intact — but
> **huhhb no longer registers the `memory` MCP server they depend on**, so they will
> report their tools unavailable until you add it yourself. That is the expected state,
> not a fault: registering a store for every installer imposed it on people who hold no
> data in it. See
> [`skills/memory/reference.md`](skills/memory/reference.md) for the config block and
> what to use instead. New work belongs in the two stores above.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `memory` | `/memory` | MemPalace nexus — read existing context (needs the opt-in server) |
| `memory-search` | `/memory-search` | Semantic search across the nexus |
| `memory-mine` | `/memory-mine` | Ingest a directory into the nexus |
| `memory-status` | `/memory-status` | Nexus stats — drawer count, wings, rooms |

---

## Project-level skills

Act on **one repository**. State is committed, so the whole team gets it.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `repo-kickstart` | `/repo-kickstart` | Bootstrap any repo — greenfield or brownfield — into Uhstray conventions: the doc set, the `plans/` tree, this repo's two-store memory init, a CodeRabbit config, and a ruleset-first branch-protection check. Idempotent and non-destructive |
| `repo-memory` | `/repo-memory` | Architecture decision records in `plans/architecture/` — record, look up, and supersede ratified decisions. Append-only. Code structure is codebase-memory-mcp; deliberation is the Hindsight bank |
| `product-inception` | `/product-inception` | Explicitly-requested product inception only — brief → PRD → architecture, three human gates, then files its Epic Queue as Plane work items and stops |
| `pr-shepherd` | `/pr-shepherd` | Drive open PRs from creation to merge and cleanup — monitors CI and review rounds, routes findings back to the original implementer, merges only when the final head's review rounds ask for no changes (merge commits only), then closes out linked issues, the Plane item and the worktree |

---

## Development skills

The day-to-day craft. These run many times a session and act on whatever is in front of you.

### Plan and explore

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `using-superpowers` | `/using-superpowers` | How to find and invoke skills — read at session start if skills aren't auto-matching |
| `brainstorming` | `/brainstorming` | Explore intent and design before touching code — required before implementing features |
| `discovering-context` | `/discovering-context` | Map every piece of context a big or vague goal needs, as a dependency DAG, before planning |
| `writing-plans` | `/writing-plans` | Write a structured implementation plan from a spec |
| `plane-work-tracking` | `/plane-work-tracking` | Start, pick up, finish, or switch Plane work items in a repo that has a Plane project, and track work discovered mid-task. Not for driving a PR to merge (use `pr-shepherd`) |

### Build and verify

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `test-driven-development` | `/test-driven-development` | Write failing tests before implementation code |
| `systematic-debugging` | `/systematic-debugging` | Root-cause a bug before proposing any fix |
| `verification-before-completion` | `/verification-before-completion` | Run the verification and confirm output before claiming done |
| `grounding` | `/grounding` | Pause a long session for a checkpoint — in-flight work, reviews, test/build/lint health, conformance, goal re-confirmation. Hook-fired (default every 2500 changed lines) or manual; opt-in |
| `finishing-a-development-branch` | `/finishing-a-development-branch` | Decide how to integrate completed work |
| `writing-skills` | `/writing-skills` | Author, edit, or validate a huhhb skill before shipping — TDD for documentation |

### Explain

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `explaining-changes` | `/explaining-changes` | Narrate changes as they happen — each logical change, each completed task, before every commit. Brief prose plus ASCII before/after diagrams, chat only |
| `explaining-plans` | `/explaining-plans` | Enrich a plan, spec or RFC in place — decision criteria, cited sources, prose-introduced mermaid diagrams |
| `markdown-to-pdf` | `/markdown-to-pdf` | Convert Markdown into a print-ready PDF — cover page, headers, syntax highlighting, rendered mermaid |

### Review

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `requesting-code-review` | `/requesting-code-review` | Request review on completed work before merging |
| `receiving-code-review` | `/receiving-code-review` | Verify review feedback technically instead of agreeing performatively |
| `prune-tests` | `/prune-tests` | Delete or rewrite tests that guard no behavior |
| `humanizer` | `/humanizer` | Rewrite AI-sounding prose so it reads like its writer, keeping what it says |
| `strict-simplify` | `/strict-simplify` | Simplify without changing behavior |
| `strict-refactor` | `/strict-refactor` | Restructure without changing behavior |

---

## Plugin Hooks

The hooks registered in `.claude-plugin/plugin.json` fire automatically — no invocation needed. Other scripts in `hooks/` are not registered and do not run:

| Hook | Event | Purpose |
|------|-------|---------|
| `explain-changes-activate.sh` | SessionStart | Opt-in always-on narration (set `HUHHB_EXPLAIN_CHANGES=1` or create `~/.claude/explaining-changes.on`) |
| `repo-memory-load.sh` | SessionStart | Points the session at `plans/architecture/DECISIONS.md` when the repo has it; otherwise at the older `.claude/memory/MEMORY.md` |
| `evolve-inject.sh` | SessionStart | Injects the cached evolve context, with no network call, and a nudge when headless proposals wait for `/evolve-review`. Silent when nothing is cached |
| `plane-binding.sh` | SessionStart | Opt-in (`HUHHB_PLANE` or `~/.claude/plane-tracking.on`): tells the session which Plane module the branch is bound to, and flags a claimed work item left without its close-out |
| `precommit-explain.sh` | PreToolUse (Bash) | Nudges a change summary before every `git commit` |
| `pr-claim-check.sh` | PreToolUse (Bash) | Denies `gh pr create/edit/comment/review` and `gh api` comment writes until every `file:line`, count and list is checked against the current head and the `gh` call is re-run with `CLAIMS_VERIFIED=1` in front of it |
| `pr-merge-guard.sh` | PreToolUse (Bash) | Denies `gh pr merge` while the PR has an unresolved review thread whose last comment isn't yours; re-run with `REVIEW_ANSWERED=1` once every finding is answered. Fails open when `gh` can't answer |
| `repo-memory-lint.sh` | PreToolUse (Write or Edit) | Blocks in-place edits to an agent record under `.claude/memory/` (supersede, never edit); `status:` and `promote:` flips pass |
| `evolve-capture.sh` | Stop | Digests the session transcript into observations and detaches a flusher. Inert until evolve is configured |
| `grounding-check.sh` | UserPromptSubmit | Fires a grounding checkpoint once the session's changed lines reach a threshold (default 2500, set with `HUHHB_GROUNDING_LINES` or a `lines=` entry in the marker file); opt-in; counts own commits plus uncommitted work; once per threshold crossing |
| `repo-memory-pr-consolidate.sh` | PostToolUse (Bash) | On `gh pr create`, asks Claude to consolidate the branch's `.claude/memory/wip/` journal into one outcome paragraph in the Hindsight bank, then delete the journal once it is stored |

---

## Quality gates

| Gate | Command | Runs in CI |
|------|---------|------------|
| G0 static lint | `node scripts/skill-lint.ts` | yes — fails on FAIL |
| Offline evolve suite | `node --test tests/test_evolve.test.ts` | yes |
| Hook tests | `node --test tests/test_grounding_hook.test.ts tests/test_pr_claim_check.test.ts tests/test_pr_merge_guard.test.ts` | yes |
| Offline scenario catalog | `node scripts/evolve/evals.ts` | yes |
| G1 merge bench | `node scripts/skill-bench.ts <skill>` | no — run by hand; real `claude -p` runs against `tests/bench/<skill>.json`, measured against a skill-disabled baseline |

CI runs on pull requests and on pushes to `main` ([`.github/workflows/test.yml`](.github/workflows/test.yml)). `tests/test_memory_docs.test.ts` and `tests/test_repo_memory_lint.test.ts` are not in CI; `node --test tests/*.test.ts` runs them locally.

## What huhhb leaves to Orca and other plugins

huhhb does not ship skills for worktrees, handoff or worker dispatch. Orca owns those: it creates and removes worktrees (see [AGENTS.md](AGENTS.md)), carries session handoff, and dispatches workers. Plan execution and parallel dispatch skills come from the superpowers plugin. Session continuity is Orca's handoff, so nothing in this marketplace replaces it.

---

## About

Built by [Uhstray.io](https://uhstray.io) — an AI-native team building tools for teams building with AI.
