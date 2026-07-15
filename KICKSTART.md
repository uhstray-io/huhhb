# KICKSTART.md

Onboarding for humans and agents working on **huhhb**.

## Setup

- **Node ≥ 22.18** — first-party code is TypeScript run directly via native type
  stripping. No build step, no transpiler, zero npm runtime dependencies.
- **`gh`** — GitHub CLI, for PRs and branch protection.
- **`openspec` ≥ 1.6.0** — the plans store CLI (`plans/development` is store `huhhb`).
- **`mempalace`** (optional) — only needed to exercise the `memory` skill's MCP
  server: `uv tool install mempalace`.

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

`main` is not yet protected. Required PR reviews on `main` are a precondition
for the pr-shepherd lifecycle. An admin runs once:

```bash
gh api -X PUT "repos/uhstray-io/huhhb/branches/main/protection" --input - <<'JSON'
{
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "required_status_checks": null,
  "enforce_admins": true,
  "restrictions": null
}
JSON
```
