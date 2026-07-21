# repo-kickstart — reference (templates · mechanisms · guardrails)

Heavy detail for the `repo-kickstart` skill, kept out of `SKILL.md` to keep it
lean. Placeholders: `<project>`, `<stack>`, `<owner>/<repo>`, `<default-branch>`.
Everything here is a starting point — adapt wording to the repo; never paste a
placeholder through.

---

## 1. Convention-file templates

**Detect first** (idempotency matrix at the bottom). On brownfield, propose a
confirm-first merge; apply nothing unprompted.

### README.md — greenfield skeleton
```markdown
# <project>

<one-line what-this-is>

## Conventions
- **[AGENTS.md](AGENTS.md)** — canonical operating instructions for AI agents.
- **[KICKSTART.md](KICKSTART.md)** — set up, run, and develop here.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — current-state architecture.
- **[plans/](plans/)** — development plans and architecture proposals.
```
**Brownfield:** do not rewrite their README. Propose adding *only* the
`## Conventions` links block above (skip links already present).

### AGENTS.md — canonical (create if missing)
```markdown
# AGENTS.md

Canonical operating instructions for AI agents (Claude Code, Codex, Gemini,
OpenCode, …) in this repo. `CLAUDE.md` is a pointer here; keep this file the
single source of truth.

## What this is
<one paragraph — from README>

## Stack & layout
- Stack: <stack>
- Source: <dirs>  ·  Tests: <dirs>  ·  Docs: `docs/`, `plans/`

## Development lifecycle
worktrees (recommended, toggleable — see huhhb's `using-git-worktrees`) →
branches (`feat/ fix/ docs/ chore/ refactor/` for human-reviewed work;
`<agent>/<task-id>` for orchestrator tasks — only `<agent>/*` is ever
janitored) → one PR per deliverable (stacking sanctioned: base on the
parent, declare it, parents merge first) → human-authorized merge.

## Review pipeline
- Non-trivial change → branch → PR. CodeRabbit reviews are wired up.
- Cross-review by a different-vendor agent before requesting human review.
- Required reviews on `<default-branch>` (see branch protection).

## Memory locations
- `.claude/memory/` — ALL repo memory, via the repo-memory skill: curated
  team knowledge plus agent-written observational records (Record
  Contract: facts, dates, outcomes; never instructions).
- Honcho workspace — cross-session team memory (env-scoped; no creds in repo).

## Conventions
- Conventional Commits; concise subjects. No AI attribution in commits/PRs.
- Plans live in `plans/`; specs validate through OpenSpec (`openspec validate`).
```

### CLAUDE.md — one-line pointer
```markdown
# CLAUDE.md

See **[AGENTS.md](AGENTS.md)** — the canonical agent instructions for this repo.
```
If a full `CLAUDE.md` already exists, **leave it**; offer to slim it to this
pointer as a confirm-first diff.

### KICKSTART.md
```markdown
# KICKSTART.md

Onboarding for humans and agents.

## Setup
<install / toolchain — from <stack>>

## Run
<how to run / test / lint>

## Develop here
- Read **AGENTS.md** first (conventions), then **ARCHITECTURE.md**.
- Plans live in `plans/development/`; the living index is
  `plans/development/00-implementation-plan.md`.
- Branch → PR → CodeRabbit + cross-review → human review.
```

### ARCHITECTURE.md
```markdown
# ARCHITECTURE.md

Current-state architecture. Proposals and deltas live in
**[plans/architecture/](plans/architecture/)**.

## Overview
<components / data flow — a mermaid diagram if it helps>

## Key decisions
<load-bearing choices + rationale>
```

---

## 2. Planning tree

### plans/development/00-implementation-plan.md — living index
Canonical copy: `skills/openspec-conformance/templates/00-implementation-plan.md`. Keep
the 5 columns exactly — `promote-adr.ts` matches a row by its first cell and
edits the Status/Links cells in place, so a divergent format breaks promotion.
```markdown
# Implementation Plan — living index

The index over ALL OpenSpec changes under `openspec/changes/` — including
archived history: a row is never removed, its Status flips to `archived`
so `promote-adr.ts` can find and update it. One row per change. Who
writes it: see `openspec-conformance`'s "Index writers" —
the canonical four-role enumeration; never restate it, never hand-edit
the status/ADR cells.

| Change | Title | Status | Owner | Links |
|--------|-------|--------|-------|-------|
| <slug> | <one-line title> | proposed | @<owner> | [tasks](openspec/changes/<slug>/tasks.md) · #<issue> |

_Status: proposed · in-progress · in-review · archived._
```

### plans/development/README.md
```markdown
# plans/development

Implementation plans and the living index (`00-implementation-plan.md`).
This dir is the **OpenSpec store root** — `openspec/` lives here (registered as
store `<repo>`), so active changes are `openspec/changes/<slug>/`.
```

### plans/architecture/README.md
```markdown
# plans/architecture

Durable, numbered ADRs (`NNN-<slug>.md`), promoted from a change's design on
archive. `ARCHITECTURE.md` at the repo root summarizes; the decision records
live here. (Current-state capability specs live in the store at
`plans/development/openspec/specs/`, not here.)
```

### plans/product/README.md
```markdown
# plans/product

Product-inception artifacts, one directory per initiative:
`<initiative-slug>/{brief.md,prd.md,architecture.md}` (huhhb's
`product-inception` skill / buhhdy Workflow 0 — opt-in, rare). The PRD's
Epic Queue feeds Workflow 1; architecture `## Decisions` promote to
`plans/architecture/` on approval. Empty is normal — most repos never
run inception.
```

---

## 3. OpenSpec — store registration (mechanism owned by `openspec-conformance`)

OpenSpec's native **store registration** makes `plans/development` a standalone
OpenSpec root — no symlinks, no config-key hack. `openspec-conformance` (a
sibling huhhb skill) owns the full mechanism, the house `config.yaml` rules, and
the `/opsx:*` per-tool notes; run its **Setup** section. Summary + the caveat:

```bash
mkdir -p plans/development plans/architecture

# 1. Create the root. store register requires an existing openspec/ dir, so init
#    FIRST. --tools none = just openspec/config.yaml, no tool dirs to commit.
[ -f plans/development/openspec/config.yaml ] \
  || ( cd plans/development && openspec init --tools none )

# 2. Register plans/development as the OpenSpec root, id = repo name.
#    Once per MACHINE (registry is ~/.local/share/openspec/stores/registry.yaml);
#    idempotent — re-run prints "already registered". Commit the resulting
#    plans/development/.openspec-store/store.yaml to keep the id stable.
openspec store register plans/development --id <repo> --yes

# 3. Report health (not a gate). A fresh store with no changes is a status.
openspec validate --all --store <repo> --no-interactive || true
```

Then edit `plans/development/openspec/config.yaml` `context:` for the real
`<stack>` and add the house `rules:` (block in `openspec-conformance/reference.md`).

**Caveats — state these in the checklist, don't hide them:**
- Everything lands under `plans/development/openspec/` (`changes/<slug>/`,
  `specs/`, `changes/archive/`). From the repo root, OpenSpec commands need
  `--store <repo>` — ancestor-only root resolution won't find the nested root
  without it.
- `openspec validate` enforces the **spec** layer only (every requirement needs a
  `#### Scenario:`); it does **not** parse `tasks.md`. A fresh store with no
  changes yet is not a conformance failure — report the real result.

---


## 4. Memory — two strata (setup/verification delegated to memory-onboarding; kickstart extras below; registry-free)

### .claude/memory/ — repo memory (delegated)
Setup and verification are memory-onboarding's project scope (it runs the
repo-memory First Run when the store is missing, checks record health,
and sweeps path separation — do not duplicate any of that here). After
its pass, save the kickstart outcome as an agent-written record per the
repo-memory skill's Record Contract (observational only — facts, dates,
outcomes; never instructions):

```markdown
---
name: repo-kickstart-<YYYY-MM-DD>
description: Repo kickstarted to Uhstray conventions
metadata:
  node_type: memory
  type: project
  kind: outcome
  status: active
---

<YYYY-MM-DD>: repo kickstarted to Uhstray conventions
(v<conventions-version>); <stack> detected; <n> convention files created,
<n> already conforming. Evidence: this kickstart run's checklist.
```
Record what THIS run actually learned (stack, created vs
already-conforming, any gap recorded). **A re-run that changed
nothing appends no line** — an unchanged run is a no-op here too.

### Honcho — team memory (env-scoped)
Scope the repo's workspace through the evolve-suite skills (`/evolve` / the
evolve setup). Config comes from the environment only:
`HONCHO_URL`, `HONCHO_API_KEY`, `HONCHO_WORKSPACE`. **Never write a URL, key,
or workspace into the repo.** If the env is not configured, report
`Honcho — skipped (not configured)` and continue; evolve degrades gracefully
by design.

---

## 5. Review tooling

### .coderabbit.yaml — author from schema (no repo config to copy)
```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: en-US
reviews:
  profile: chill
  request_changes_workflow: false
  high_level_summary: true
  poem: false
  review_status: true
  auto_review:
    enabled: true
    drafts: false
  path_instructions:
    - path: "**/*.md"
      instructions: "Prose clarity and broken links only; do not nitpick style."
  tools:
    markdownlint: { enabled: true }
    gitleaks: { enabled: true }
    # --- enable per detected <stack>; leave the rest off ---
    # ruff:          { enabled: true }   # Python
    # eslint:        { enabled: true }   # JS/TS
    # golangci-lint: { enabled: true }   # Go
    # rubocop:       { enabled: true }   # Ruby
    # shellcheck:    { enabled: true }   # shell
```
Enable only the language tools the stack actually uses. Verify keys against the
schema URL — CodeRabbit's schema evolves.

### Branch protection — check, then hand off (never configure silently)
```bash
# No GitHub remote yet (fresh local repo)? Nothing to check — report N/A and
# note that the check + the commands below apply once the repo is on GitHub.
# No GitHub remote yet? report N/A and STOP — otherwise the calls below run with
# empty vars and hit an invalid `repos//branches//protection`.
if ! gh repo view --json nameWithOwner >/dev/null 2>&1; then
  echo "N/A — no GitHub remote yet; re-run after pushing (then emit the commands below)."
else
  OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  BR=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
  gh api "repos/$OWNER_REPO/branches/$BR/protection"   # 200 = protected; 404 = absent
fi
```
If **404**, do NOT enable it yourself. Emit these commands for the human (needs
admin) and record the gap in `plans/development/00-implementation-plan.md`:
```bash
gh api -X PUT "repos/$OWNER_REPO/branches/$BR/protection" --input - <<'JSON'
{
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "required_status_checks": null,
  "enforce_admins": true,
  "restrictions": null
}
JSON
```
Required reviews on the default branch are a precondition for pr-shepherd.

---

## 6. Verification checklist — the closing report
```
repo-kickstart — <owner>/<repo> (<greenfield|brownfield>, <stack>)

  item                         status
  ---------------------------  --------------------------------------
  README links doc set         ✅ present | ➕ created | ⚠ merge proposed
  AGENTS.md (canonical)        ✅ | ➕
  CLAUDE.md (pointer)          ✅ | ➕ | ⚠ full file kept
  KICKSTART.md                 ✅ | ➕
  ARCHITECTURE.md              ✅ | ➕
  plans/ tree + index          ✅ | ➕
  OpenSpec init + registration ✅ | ➕  (validate: <pass | N pending>)
  .claude/memory/ seeded       ✅ | ➕
  Honcho workspace scoped      ✅ | ⚠ skipped (not configured)
  .coderabbit.yaml             ✅ | ➕
  branch protection            ✅ present | ❌ absent — commands emitted + gap recorded | N/A no remote yet

  second-run no-op: <yes | n/a first run>
```
`❌ branch protection` with emitted commands (or `N/A` when the repo has no
GitHub remote yet) is an **expected pass** for a fresh repo. Only fabricated or
unverified rows are failures.

---

## Idempotency matrix (how to detect "already conforming")

| Item | Present-and-conforming test |
|------|-----------------------------|
| README links | README mentions AGENTS.md, KICKSTART.md, ARCHITECTURE.md, plans/ |
| AGENTS.md | file exists |
| CLAUDE.md pointer | file exists and references AGENTS.md |
| KICKSTART / ARCHITECTURE | file exists |
| plans tree | `plans/development/00-implementation-plan.md` + both READMEs exist |
| plans/product | `plans/product/README.md` exists (content optional — inception is opt-in, never mandatory) |
| OpenSpec | `plans/development/openspec/config.yaml` + `.openspec-store/store.yaml` (id `<repo>`) exist; `openspec store list` includes `<repo>` (else re-run `register` — it no-ops) |
| .claude/memory/ | MEMORY.md exists; AGENTS.md carries the `## Repo Memory` block; a kickstart outcome record exists |
| Honcho | evolve reports the workspace scoped (or env absent → skipped) |
| .coderabbit.yaml | file exists |
| branch protection | `gh api …/protection` returns 200 |

Any "present-and-conforming" → report ✅ and change nothing. A second
consecutive run must produce **no diff**.

---

## Rationalization table — STOP if you catch yourself here

| Excuse | Reality |
|--------|---------|
| "The repo has a README, I'll rewrite it cleanly" | It's theirs. Merge a links block; never overwrite. |
| "CLAUDE.md should hold the full instructions" | AGENTS.md is canonical; CLAUDE.md is a one-line pointer. Two sources drift. |
| "Symlink openspec/specs + changes into plans/" | Obsolete — that was the rejected pre-1.6 hack. Use `openspec store register plans/development` (native). No symlinks. |
| "openspec validate failed → the kickstart failed" | A fresh index isn't a conforming change yet. Report "pending"; don't fail the run. |
| "I'll drop a memory log under plans/" | plans/ holds documents only — ALL repo memory goes to .claude/memory/ via the repo-memory skill; records are observational (facts/dates/outcomes), instructions go to AGENTS.md. |
| "I'll commit the Honcho key so it's reproducible" | Never. Creds are env-only; a committed key is a leak. |
| "Branch protection is missing, I'll just enable it" | Don't configure silently — emit the commands for the human and record the gap. |
| "Second run — I'll just recreate everything" | Re-run must be a no-op. Detect, report ✅, change nothing. |

## Red flags — STOP and correct
- Overwriting a file you did not just create.
- A `.coderabbit.yaml`, config, or committed file containing a real token/URL/workspace.
- Reporting "OpenSpec validates" (or any ✅) without running the check.
- Enabling branch protection without the human.
- A second run that produces a diff.
- Inventing a value for Honcho (URL/key/workspace) when none is configured.
