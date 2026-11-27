# KICKSTART.md

Onboarding for humans and agents working on **huhhb**.

## Setup

- **Node ≥ 22.18** — first-party code is TypeScript run directly via native type
  stripping. No build step, no transpiler, zero npm runtime dependencies.
- **`gh`** — GitHub CLI, for PRs and branch protection.
- **Memory stores** (optional) — needed only to exercise the memory skills. Run
  `/memory-setup` rather than installing by hand; it reviews the installer,
  snapshots config before writing, and control-tests containment at each gate.
  - [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) — the code
    graph. Structural truth, regenerated from source, zero write cost.
  - [Hindsight](https://github.com/vectorize-io/hindsight) — the experience store.
    Deliberation, outcomes and preferences; the only copy of them. Ratified decisions are ADRs in `plans/architecture/` (ADR-0001).
- **`mempalace`** (legacy, optional) — **retired from routing 2026-08-01, and its MCP
  server is now opt-in rather than shipped.** huhhb used to register it for every
  installer; now you add it yourself if you want it, which is the only way to reach the
  `memory` family's tools. The block to add, and what to use instead, are in
  [`skills/memory/reference.md`](skills/memory/reference.md). `uv tool install mempalace`
  is needed only for CLI access, which these skills do not use. Not required for new work.

There is nothing to `npm install` for the runtime — Node stdlib only.

## Run

```bash
node scripts/skill-lint.ts                 # G0 static lint (frontmatter, links, manifest sync)
node scripts/skill-bench.ts <skill>        # G1 merge bench (real claude -p runs; costs tokens)
node --test tests/test_evolve.test.ts      # offline evolve suite
```

## Develop here

- Read **[AGENTS.md](AGENTS.md)** first (the canonical conventions), then
  **[ARCHITECTURE.md](ARCHITECTURE.md)**.
- Add a skill: `skills/<name>/SKILL.md` + `marketplace.json` entry +
  `onboarding/skills-list.md` + one real `tests/bench/<skill>.json` scenario.
- Plans are dated Markdown files in `plans/development/` (`YYYY-MM-DD-<slug>.md`).
  Architecture decisions are ADRs in `plans/architecture/`. Work is tracked in Plane.
- Branch → PR → review rounds (one for a PR into a feature or integration branch,
  two for a promotion into `main`) → merge commit, once every finding is fixed or
  answered and the required checks pass. Never push non-trivial changes directly
  to `main`.

## Branch protection

`main` is covered by the **`protect-main` ruleset** (active): a PR is required,
force-pushes and deletion are blocked. Do **not** add classic branch protection
on top — two overlapping mechanisms is how the worktree/GUI-push hazard got
missed the first time.

pr-shepherd's hard gate is only that the default branch requires a pull request
(`skills/pr-shepherd/SKILL.md`, precondition 1). Its precondition 2 warns when
`delete_branch_on_merge` is true, and this repo has it true (read 2026-11-26).
Recommendation: no ruleset, protection or setting change.
