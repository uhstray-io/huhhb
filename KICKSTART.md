# KICKSTART.md

Onboarding for humans and agents working on **huhhb**.

## Setup

- **Node ≥ 22.18** — first-party code is TypeScript run directly via native type
  stripping. No build step, no transpiler, zero npm runtime dependencies.
- **`gh`** — GitHub CLI, for PRs and branch protection.
- **`openspec` ≥ 1.6.0** — the plans store CLI (`plans/development` is store `huhhb`).
- **Memory stores** (optional) — needed only to exercise the memory skills. Run
  `/memory-setup` rather than installing by hand; it reviews the installer,
  snapshots config before writing, and control-tests containment at each gate.
  - [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) — the code
    graph. Structural truth, regenerated from source, zero write cost.
  - [Hindsight](https://github.com/vectorize-io/hindsight) — the experience store.
    Decisions, rationale and outcomes; the only copy of them.
- **`mempalace`** (legacy, optional) — **retired from routing 2026-08-01.** Only needed
  to read existing MemPalace data through the `memory` skill:
  `uv tool install mempalace`. Not required for new work.

There is nothing to `npm install` for the runtime — Node stdlib only.

## Run

```bash
node scripts/skill-lint.ts                 # G0 static lint (frontmatter, links, manifest sync)
node scripts/skill-bench.ts <skill>        # G1 merge bench (real claude -p runs; costs tokens)
node --test tests/test_evolve.test.ts      # offline evolve suite
node --test tests/test_openspec_conformance.test.ts   # offline openspec-conformance suite
```

## Develop here

- Read **[AGENTS.md](AGENTS.md)** first (the canonical conventions), then
  **[ARCHITECTURE.md](ARCHITECTURE.md)**.
- Add a skill: `skills/<name>/SKILL.md` + `marketplace.json` entry +
  `onboarding/skills-list.md` + one real `tests/bench/<skill>.json` scenario.
- Plans live in `plans/development/`; the living index is
  `plans/development/00-implementation-plan.md`. Specs validate through OpenSpec
  (`openspec validate --all --store huhhb`).
- Branch → PR → CodeRabbit + cross-review → human review. Never push non-trivial
  changes directly to `main`.

## Branch protection (one-time, admin)

`main` is covered by the **`protect-main` ruleset** (active since 2026-07-18):
a PR is required, force-pushes and deletion are blocked. Do **not** add classic
branch protection on top — two overlapping mechanisms is how the
worktree/GUI-push hazard got missed the first time.

One gap remains: `required_approving_review_count` is `0`, so a PR can be
self-merged with no approval. Required reviews are a precondition for the
pr-shepherd lifecycle. An admin raises it once — via
[repo rules](https://github.com/uhstray-io/huhhb/rules/19158566), or:

```bash
gh api -X PUT repos/uhstray-io/huhhb/rulesets/19158566 --input - <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"]
      } },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
JSON
```

The `rules` array is replaced wholesale on `PUT` — send all three rules, not
just the changed one.
