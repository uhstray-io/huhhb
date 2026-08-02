---
name: repo-kickstart
description: Use when bootstrapping a repository — greenfield or brownfield — into Uhstray's standard development conventions, OpenSpec, and the two-store memory setup. Idempotent and non-destructive: safe to re-run, never overwrites existing docs. Triggers on "repo kickstart", "bootstrap this repo", "set up our conventions", "conform this repo", "initialize plans/openspec/memory", "initialize this repo for openspec and memory", "set up two-store memory here", "index this repo and create its memory bank".
---

# repo-kickstart

Bootstraps **any** repo into Uhstray's standard development conventions:
convention files, the planning tree, OpenSpec, the two-store memory
architecture, and **the wiring between OpenSpec and the stores** — no companion
document and no second skill. Works whether buhhdy authors the files directly or
dispatches this to a sub-agent; everything beyond this file (all templates, the
OpenSpec/memory/CodeRabbit/branch-protection mechanism, the store map, the report
format) lives in **`reference.md`**.

The artifacts it emits teach the repo how to use both systems, so the setup
outlives the session that ran it.

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
  OpenSpec `config.yaml` context, `.cbmignore`, and CodeRabbit's language tools.
- **Derive the three names** (table in `reference.md` §0). The OpenSpec store id
  and the Hindsight bank id are both the repo *directory* name; the graph project
  is the repo *path*. Different strings — mixing them up is the most common
  failure here.
- **Probe every prerequisite and record what's missing** — `openspec`, the graph
  tool (including repo-inside-`CBM_ALLOWED_ROOT` containment), the experience
  store, Honcho. Each degrades to `skipped — <reason>` in the checklist **plus a
  recorded gap**; **none of them fails the run**, and none is a silent pass.
  Probe the experience store, never assume its endpoint (commands in §0).
  Installing/binding a server is **machine scope** — not this skill's job. Name
  the remedy (`two-store-memory-setup`) instead of shrugging.
- **Detect existing state before deciding you're initializing.** An OpenSpec root
  (house convention: `plans/development`, *not* the repo root — also check
  `openspec store list`), an existing index or bank, and every memory store
  already on disk.
- **Conformance is per artifact, never per repo.** "This repo already has an
  OpenSpec root" does **not** mean the run is done — an adopted repo can be
  missing `plans/product/README.md` or the AGENTS.md memory block forever if you
  short-circuit on the first thing you find. Check each artifact in §1–§5
  independently: present → ✅ and leave it **exactly** as it is; **missing →
  create it**. Never re-init, never overwrite, never delete.

### 1. Convention files (templates in `reference.md`)
Create if missing; on brownfield, **propose a merge, don't overwrite**.
- **README.md** — entry point; links `AGENTS.md`, `KICKSTART.md`,
  `ARCHITECTURE.md`, and `plans/`. Brownfield: add a "Project conventions"
  links section, keep their prose.
- **AGENTS.md** — the **canonical** agent operating instructions (conventions,
  layout, review pipeline). Its memory section is where the wiring **persists**:
  the store map in brief, the archive→retain convention, the drift check, and the
  identifier→domain translate step. Template in `reference.md` §1; it belongs
  here, **not** in CLAUDE.md.
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
- `plans/product/README.md` — one short README (template in `reference.md`);
  inception artifacts land here only when Workflow 0 is explicitly run —
  seeding the dir is standard, using it is opt-in, never a mandate.

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

`context:` also carries the **memory routing** (block in `reference.md` §3) — the
bank id, and that structure goes to the graph while rationale goes to the bank.
That field reaches the model whenever OpenSpec authors an artifact, so it is what
makes proposals get written with both stores in view. This is the wiring; without
it the repo has two systems rather than one workflow.

### 4. Memory kickstart — two-store, owned by THIS skill
Two routed stores plus Honcho (mechanism and every worked-around defect in
`reference.md` §4); registry-free — this skill does **not** track or register
conformance anywhere. `repo-kickstart` performs this itself and **no longer
delegates to `memory-onboarding`**. **Hard rule, unchanged in force: `plans/`
holds planning/architecture/development/specification DOCUMENTS — no memory of
any kind is ever written under `plans/`.** Experience goes to the bank, structure
to the graph, instructions to AGENTS.md.
- **codebase-memory-mcp — the structure store.** `.cbmignore` written *before*
  indexing (secrets pass included) → index with `persistence=true` → prove
  `git check-attr merge -- .codebase-memory/graph.db.zst` prints `merge: ours` →
  commit the artifact. **Each of those steps works around a defect that fails
  silently**; §4.1 states what breaks if you skip it. This is a new capability —
  nothing in this skill did it before.
- **Hindsight — the experience store.** One bank per repo, `bank_id` derived per
  §0 — **directory name plus a hash of canonical identity, never the bare
  directory name**, which silently merges two repos called `app` into one bank.
  `verbatim` extraction in its own call, `retain_mission` in
  another — both are **write-only, so re-apply them every run** rather than trying
  to detect them — then a project charter: prose about purpose, constraints and current
  state, **never an inventory** (inventories are the graph's job). Write with
  `sync_retain` — an async receipt is not a verified write.
- **Honcho (team memory)** — this skill **reads** the existing config and reports;
  it never configures a server, installs anything, or runs an `init`.
  **Credentials come from the environment** (`HONCHO_URL` / `HONCHO_API_KEY` /
  `HONCHO_WORKSPACE`) — **never write them into the repo.** Three states, not two
  (§4.3): `honcho` mode needs a reachable server **and** `@honcho-ai/sdk`
  installed; `local` mode needs **no server** and is configured, not missing;
  unconfigured reports `skipped`. None of the three fails the run.
- **`.claude/memory/` — retired from routing, data kept.** Never delete, move or
  migrate it. This skill no longer seeds the store or writes records into it;
  `repo-memory` and `memory-onboarding` still own it and remain correct on direct
  invocation (§4.6 — **state that ownership split in the report**).
- **Activate the repo's git hooks** (still seeded): `.githooks/` post-commit
  capture + pre-commit record lint, then `git config core.hooksPath .githooks`.
  The per-commit journal under `.claude/memory/wip/` is a **staging buffer, not a
  store** — now the draft material for the PR/archive retain, deleted on
  consolidation.
- **Seed the kickstart outcome** as one `sync_retain` into the bank — what this
  run actually did. A re-run that changed nothing retains nothing.

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
End by printing the pass/fail table (format in `reference.md` §7): convention
files present, plans tree, OpenSpec validates + its `context:` wiring, both memory
stores verified **by evidence** (node/edge counts · `check-attr` printing
`merge: ours` · a verbatim round-trip that brings a rejected alternative back —
the mode itself is write-only · a domain-language recall that actually returns the
charter), capture hooks active, Honcho scoping,
CodeRabbit config, branch-protection status. Also state **which skill owns which
store** and list every recorded gap.

Branch protection is expected **red with instructions** on a fresh repo — that is
a pass for the run, as is any `⚠ skipped — <reason>` row whose gap was recorded.
A row you could not verify is reported honestly, never optimistically.

## Idempotency & non-destruction (never skip)
Detect existing state first: present + conforming → ✅ "already conforming",
change nothing — a **second consecutive run must be a no-op**. Never fabricate a
checklist result (not run / not resolvable → say so). Non-destruction is the
Golden Rule above: never overwrite content you didn't just create; propose
merges confirm-first.

The rationalization table and red-flags are in **`reference.md`** — read them
before you start authoring.
