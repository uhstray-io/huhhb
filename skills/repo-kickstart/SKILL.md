---
name: repo-kickstart
description: Use when bootstrapping a repository — greenfield or brownfield — into Uhstray's standard development conventions and the two-store memory setup. Idempotent and non-destructive: safe to re-run, never overwrites existing docs. Triggers on "repo kickstart", "bootstrap this repo", "set up our conventions", "conform this repo", "initialize plans and memory", "set up two-store memory here", "index this repo and create its memory bank".
---

# repo-kickstart

Bootstraps **any** repo into Uhstray's standard development conventions:
convention files, the planning tree, and the two-store memory architecture — no
companion document and no second skill. Works whether you author the files
directly or dispatch this to a sub-agent; everything beyond this file (all
templates, the memory/CodeRabbit/branch-protection mechanism, the store map, the
report format) lives in **`reference.md`**.

The artifacts it emits teach the repo how to use both stores, so the setup
outlives the session that ran it.

**Golden rule: detect before you write. Read any existing file fully before
touching it. Never destroy content — integrate. Confirm-first on every
brownfield merge.** Skipping a step because a prerequisite is missing is not
"done" — report it in the checklist and record the gap.

## Order of operations

Run in order; each item is a detect → act-or-report cycle. A ✅ "already
conforming" per item is the desired result on huhhb and on any re-run.

### 0. Preflight
- Confirm you are at a git repo root (`git rev-parse --show-toplevel`).
- Classify **greenfield vs brownfield** — does any of `README.md`, `AGENTS.md`,
  `docs/` already exist with real content?
- Detect the **stack** (`package.json` / `pyproject.toml` / `go.mod` /
  `Cargo.toml` / `pom.xml` / …). It feeds AGENTS/ARCHITECTURE context,
  `.cbmignore`, and CodeRabbit's language tools.
- **Derive the two names** (`reference.md` §0): `BANK_ID` = **directory name +
  a hash of canonical identity**, never the bare directory name · the graph
  project = the tool's own lossy derivation from the repo *path*, which needs an
  identity check **before you index**.
- **Probe every prerequisite** — the graph tool (including
  `CBM_ALLOWED_ROOT` containment) and the experience store (probe, never assume
  its endpoint). Each missing one is `skipped — <reason>` in the checklist
  **plus a recorded gap**; none fails the run, none is a silent pass. Installing
  a server is **machine scope**: name the remedy (`memory-setup`), never install.
- **Detect existing state** (`reference.md` §0): an existing index or bank, and
  every memory store already on disk. **Conformance is per artifact, never per
  repo**: present → ✅ and leave it exactly as it is; missing → create it. Never
  re-init, never overwrite, never delete.

### 1. Convention files (templates in `reference.md` §1)
Create if missing; on brownfield, **propose a merge, don't overwrite**.
- **README.md** — entry point; links `AGENTS.md`, `KICKSTART.md`,
  `ARCHITECTURE.md`, and `plans/`. Brownfield: add only the links block.
- **AGENTS.md** — the **canonical** agent operating instructions. Its
  `## Repo Memory` section is where the wiring **persists**: the store map in
  brief and the identifier→domain translate step. It belongs here, **not** in
  CLAUDE.md.
- **CLAUDE.md** — a **one-line pointer** to AGENTS.md. If a full CLAUDE.md
  already exists, leave it and offer to slim it — never clobber.
- **KICKSTART.md** — human + agent onboarding: setup, run, develop, where plans
  live.
- **ARCHITECTURE.md** — current-state architecture; links `plans/architecture/`.

### 2. Planning tree (`reference.md` §2)
Three homes under `plans/`; where a repo keeps plans under another name, **report
the divergence and create no second tree**.
- `plans/development/` — dated plan files, `YYYY-MM-DD-<slug>.md`, plus a README.
- `plans/architecture/` — decision records; seed only its `README.md`.
  `repo-memory` authors `DECISIONS.md`, `TEMPLATE.md` and the year files.
- `plans/product/README.md` — seeding is standard, using it is opt-in.
- **No change index is seeded.** Work status lives in the work tracker and the
  PRs, not in a hand-kept file, which drifts.

### 3. Memory kickstart — two-store, owned by THIS skill (`reference.md` §3)
Registry-free: this skill does **not** track or register conformance anywhere.
**Hard rule: `plans/` holds DOCUMENTS only — no memory of any kind is ever
written under `plans/`.** Decision records are documents and belong at
`plans/architecture/` via `repo-memory`. Experience goes to the bank, structure
to the graph, instructions to AGENTS.md.
- **codebase-memory-mcp — the structure store.** `.cbmignore` written *before*
  indexing (secrets pass included) → index with `persistence=true` → prove
  `git check-attr merge -- .codebase-memory/graph.db.zst` prints `merge: ours` →
  commit the artifact. **Each step works around a defect that fails silently**
  (§3.1).
- **Hindsight — the experience store.** One bank per repo, `bank_id` per §0.
  `verbatim` extraction and `retain_mission` in separate calls, **re-applied
  every run** (both write-only), then a project charter: purpose, constraints,
  current state, **never an inventory**. Write with `sync_retain` (§3.2).
- **`.claude/memory/` — retired from routing, data kept.** Never delete, move
  or migrate it. `repo-memory` still owns it (§3.5 — **state the ownership split
  in the report**).
- **Activate the git hooks**: `.githooks/` post-commit capture + pre-commit
  record lint, then `git config core.hooksPath .githooks`. The journal under
  `.claude/memory/wip/` is a **staging buffer** — draft material for the PR
  retain, deleted on consolidation (§3.3).
- **Seed the kickstart outcome** as one `sync_retain` into the bank. A re-run
  that changed nothing retains nothing.

### 4. Review tooling (`reference.md` §5)
- **`.coderabbit.yaml`** — generate from the template, adapted to the detected
  language(s).
- **Branch protection — ruleset first.** No GitHub remote → N/A, stop. Else
  `gh api "repos/$OWNER_REPO/rules/branches/$BR"`: any `pull_request` rule →
  ✅ with the ruleset id; never recommend classic protection on top. Else
  `gh api "repos/$OWNER_REPO/branches/$BR/protection"`: 200 → classic
  protection present, report it; 404 → absent. If absent, **do not configure
  it**: emit the ruleset create command from §5 for the human **and report the
  gap in the run's summary**. Any `pull_request` rule satisfies pr-shepherd;
  report its `required_approving_review_count` for information, not as a gap.

### 5. Verification checklist
End by printing the pass/fail table (`reference.md` §6): convention files, plans
tree, both memory stores verified **by evidence** (node/edge counts ·
`check-attr` printing `merge: ours` · a verbatim round-trip that brings a
rejected alternative back · a domain-language recall that returns the charter),
capture hooks, CodeRabbit config, branch-protection status. State **which skill
owns which store** and list every recorded gap.

Branch protection **red with instructions** on a fresh repo is a pass for the
run, as is any `⚠ skipped — <reason>` row whose gap was recorded. A row you
could not verify is reported honestly, never optimistically.

## Idempotency & non-destruction (never skip)
Present + conforming → ✅ "already conforming", change nothing — a **second
consecutive run must be a no-op**. Never fabricate a checklist result. Never
overwrite content you didn't just create; propose merges confirm-first.

The idempotency matrix, rationalization table and red flags are in
**`reference.md`** — read them before you start authoring.
