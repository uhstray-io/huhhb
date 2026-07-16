---
name: repo-kickstart
description: Use when bootstrapping a repository — greenfield or brownfield — into Uhstray's standard development conventions and memory setup. Idempotent and non-destructive: safe to re-run, never overwrites existing docs. Triggers on "repo kickstart", "bootstrap this repo", "set up our conventions", "conform this repo", "initialize plans/openspec/memory".
---

# repo-kickstart

Bootstraps **any** repo into Uhstray's standard development conventions,
including memory. Works whether buhhdy authors the files directly or dispatches
this to a sub-agent — everything needed beyond this file (all templates, the
OpenSpec/CodeRabbit/branch-protection detail, the report format) lives in
**`reference.md`**.

**Golden rule: detect before you write. Read any existing file fully before
touching it. Never destroy content — integrate. Confirm-first on every
brownfield merge.** Skipping a step because a prerequisite is missing is not
"done" — report it in the checklist and (where the task says) record the gap.

## Order of operations

Run in order; each item is a detect → act-or-report cycle. A ✅ "already
conforming" per item is the desired result on huhhb and on any re-run.

### 0. Preflight
- Confirm you are at a git repo root (`git rev-parse --show-toplevel`).
- Classify **greenfield vs brownfield** — does any of `README.md`, `AGENTS.md`,
  `docs/` already exist with real content?
- Detect the **stack** (`package.json` / `pyproject.toml` / `go.mod` /
  `Cargo.toml` / `pom.xml` / …). It feeds AGENTS/ARCHITECTURE context, the
  OpenSpec `config.yaml` context, and CodeRabbit's language tools.

### 1. Convention files (templates in `reference.md`)
Create if missing; on brownfield, **propose a merge, don't overwrite**.
- **README.md** — entry point; links `AGENTS.md`, `KICKSTART.md`,
  `ARCHITECTURE.md`, and `plans/`. Brownfield: add a "Project conventions"
  links section, keep their prose.
- **AGENTS.md** — the **canonical** agent operating instructions (conventions,
  layout, review pipeline, memory locations).
- **CLAUDE.md** — a **one-line pointer** to AGENTS.md. If a full CLAUDE.md
  already exists, leave it and offer to slim it — never clobber.
- **KICKSTART.md** — human + agent onboarding: setup, how to run, how to
  develop here, where plans live.
- **ARCHITECTURE.md** — current-state architecture; links `plans/architecture/`.

### 2. Planning tree
- `plans/development/00-implementation-plan.md` — seed from the canonical
  living-index template in `skills/openspec-conformance/templates/` (5-column table:
  Change · Title · Status · Owner · Links — the exact shape `promote-adr.ts`
  reads/writes; do not diverge or promotion breaks).
- `plans/development/README.md` and `plans/architecture/README.md` — one short
  README each, saying what belongs there.

### 3. OpenSpec (**store registration** — owned by `openspec-conformance`)
`openspec-conformance` is the single source of truth; run its **Setup** (full
commands + house `rules:` there and in `reference.md`). In short: `openspec init
--tools none` inside `plans/development` (skip if its `openspec/config.yaml`
exists), then `openspec store register plans/development --id <repo> --yes` —
once per machine, idempotent — registering `plans/development` as the OpenSpec
root (no symlinks). Commit the resulting `.openspec-store/store.yaml`, set
`config.yaml` `context:` from the stack, and `openspec validate --all --store
<repo>` — **report the result** (a fresh store is a status, not a failure).
From the repo root, OpenSpec commands need `--store <repo>`.

### 4. Memory kickstart — DELEGATED to memory-onboarding (project scope)
Two strata (detail + headers in `reference.md`); registry-free — this skill
does **not** track or register conformance anywhere. Run huhhb's
`memory-onboarding` skill, PROJECT scope, and append its matrix to this
run's verification checklist — it owns repo-memory First Run setup, record
health, and the path-separation sweep (**hard rule: repo memory lives in
`.claude/memory/` ONLY; `plans/` holds planning/architecture/development/
specification documents — no memory of any kind is ever written under
`plans/`**); do not reimplement them here. The kickstart-specific extras
below remain this skill's own:
- **Seed the kickstart outcome record** into `.claude/memory/` per the
  `repo-memory` skill's Record Contract (observational-only: facts,
  dates, outcomes — never instructions) with what this run learned.
- **Honcho (team memory)** — scope the repo's workspace via the evolve-suite
  skills. **Credentials come from the environment** (`HONCHO_URL` /
  `HONCHO_API_KEY` / `HONCHO_WORKSPACE`) — **never write them into the repo.**
  Honcho unconfigured? report "skipped — Honcho not configured", don't fail.

### 5. Review tooling
- **`.coderabbit.yaml`** — generate from the template in `reference.md`, adapted
  to the detected language(s). (There is no repo config to copy from — author
  from the schema.)
- **Branch protection** — `gh api repos/{owner}/{repo}/branches/{branch}/protection`.
  If absent, **do not configure it silently**: emit the exact `gh` commands for
  the human (in `reference.md`) **and record the gap** in
  `plans/development/00-implementation-plan.md`. Required reviews on the default
  branch are a precondition for pr-shepherd.

### 6. Verification checklist
End by printing the pass/fail table (format in `reference.md`): convention
files present, plans tree, OpenSpec validates, memory verified (memory-onboarding project-scope matrix appended + kickstart outcome record + Honcho scoping),
CodeRabbit config, branch-protection status. Branch protection is expected
**red with instructions** on a fresh repo — that is a pass for the run.

## Idempotency & non-destruction (never skip)
Detect existing state first: present + conforming → ✅ "already conforming",
change nothing — a **second consecutive run must be a no-op**. Never fabricate a
checklist result (not run / not resolvable → say so). Non-destruction is the
Golden Rule above: never overwrite content you didn't just create; propose
merges confirm-first.

The rationalization table and red-flags are in **`reference.md`** — read them
before you start authoring.
