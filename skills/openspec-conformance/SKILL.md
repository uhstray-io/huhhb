---
name: openspec-conformance
description: Use when a repo OPTS INTO Uhstray's plans/development + plans/architecture conventions — the store-registration setup an adopting repo runs once, the house openspec/config.yaml rules, and the archive-time ADR promotion into plans/architecture/. Triggers on "openspec conformance", "register the openspec store", "plans/ layout", "promote an ADR", "openspec store setup", "conform openspec to plans". The single source of truth repo-kickstart (adoption) and pr-shepherd (archive, on adopted repos) both call.
---

# openspec-conformance

The one place that defines how OpenSpec conforms to Uhstray's planning
layout — a mechanism, not a mandate: the layout is OPT-IN per repo (LD-1;
adopted via `repo-kickstart` on repos we choose). `repo-kickstart` calls
the **Setup** section when a repo adopts; `pr-shepherd` calls the
**Promotion** section on archive — on adopted repos only (its own probe
skips-with-note elsewhere). buhhdy's `core-workflows` drives the change
lifecycle in between. Decision record: `buhhdy/README.md` → "Planning
Layout (OpenSpec conformance)".

**Change status has one home: the store.** `openspec list` reports a change's
name, status and task counts. Adopted repos keep no second, hand-maintained
register of the same facts — two records of one fact diverge, and the one
maintained by hand is the one that goes stale.

**Layout (what adopted repos use):**
- `plans/development/openspec/changes/<slug>/` — active changes (proposal, specs, design, tasks)
- `plans/architecture/` — the ADR store, **owned by `repo-memory`** (ADR-0003).
  OpenSpec writes specifications; this skill only carries the promotion mechanism

**Mechanism:** OpenSpec's native **store registration** relocates the root to
`plans/development` (verified live, openspec 1.6.0). A forked schema was
**rejected** — it can rename/re-template artifacts but cannot move the root. What
OpenSpec doesn't model — the index and ADRs — is carried as a promotion pattern.

**Ownership:** the ADR *records* belong to `repo-memory` — their shape, numbering
and lifecycle. This skill owns only the promotion mechanism that files one. OpenSpec
writes specifications, not decisions (ADR-0003).

## Setup (once per repo — what repo-kickstart runs)

`store register` needs an existing `openspec/` root, so **init then register**:

```bash
mkdir -p plans/development plans/architecture
( cd plans/development && openspec init --tools none )      # creates openspec/config.yaml
openspec store register plans/development --id <repo> --yes  # once per MACHINE; idempotent
```

- `<repo>` = the repository name (the store id). Commit the resulting
  `plans/development/.openspec-store/store.yaml` (`version` + `id`) — it keeps the
  id stable across machines. The machine registry
  (`~/.local/share/openspec/stores/registry.yaml`) is per-machine, so each machine
  runs the `register` line once; re-running is a no-op ("already registered").
- Seed the ADR home from `templates/` (copy, then fill placeholders):
  `templates/adr-NNN-slug.md` is the ADR shape the promoter emits.
- Add the house rules + `context:` to `plans/development/openspec/config.yaml`
  (block in `reference.md`).

From the repo root every OpenSpec command takes `--store <repo>` (root resolution
only walks ancestors — without the flag, commands at the repo root miss the nested
root). buhhdy uses the raw CLI (`openspec new change <slug> --store <repo>`, etc.).
The `/opsx:*` slash commands are an opt-in convenience — see `reference.md`.

## Validation — what `openspec validate` does and does not enforce

`openspec validate <slug> --store <repo>` is the deterministic schema gate. It
enforces the **spec** layer only: every requirement needs SHALL/MUST and **at
least one `#### Scenario:`** (Given/When/Then). A requirement with no scenario
fails with exit 1.

**A plan phase's validation gate is expressed as that scenario.** Each phase
delivers a capability; the capability's requirement MUST carry the scenario that
validates it, so a phase missing its gate = a requirement missing its scenario =
`openspec validate` errors. That is the structural check.

**Known limit (do not misreport):** `openspec validate` does **not** parse
`tasks.md` — no schema hook exists for it, and `config.yaml` `rules:` are
AI-authoring guidance, not enforced. The per-phase gate is enforced at the spec
layer above, plus buhhdy Workflow 1 step 5(b)'s reviewer judgment. Do not claim
validate checks tasks.md structure.

## Promotion (on archive — what pr-shepherd runs)

After `openspec archive <slug> --store <repo> --yes` (moves the change to
`openspec/changes/archive/<date>-<slug>/` and promotes specs to
`openspec/specs/`), promote the durable decisions:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/openspec-conformance/promote-adr.ts" \
  <path-to-plans> <date-slug-dirname> --change-url <pr-or-change-url>
```

It extracts **only** the archived `design.md` `## Decisions` section into one
`## ADR-NNNN — <slug>` record appended to `plans/architecture/YYYY/YYYY-MM.md`,
plus a row in that year's `INDEX.md` and a line in `DECISIONS.md` (globally
sequential numbering; the template's field block + a link back to the archived
design). **That is the whole of it — the script owns decision records and their
two indexes, and nothing else.** It never copies the full design doc, and it
reads no change-status register in any mode: a promotion that failed on a
missing row made an unrelated file a precondition of writing a decision. A
change with no `## Decisions` promotes no ADR and exits 0. Offline check:
`node --test tests/test_openspec_conformance.test.ts`.

## Inception promotion (on architecture approval — what product-inception runs)

Same mechanism, different source and timing: the moment a human approves an
initiative's `plans/product/<slug>/architecture.md` (huhhb's
`product-inception` skill / buhhdy Workflow 0), promote its decisions
IMMEDIATELY — inception decisions are repo-level context Workflow 1's
`investigate` step must find before any epic is picked up:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/openspec-conformance/promote-adr.ts" \
  <path-to-plans> --from <path-to-plans>/product/<slug>/architecture.md --slug <slug>
```

The `## Decisions`-section-only rule applies unchanged (the architecture doc
keeps its `AD-N` blocks under a literal `## Decisions` heading; nothing else
promotes). Same numbering sequence, same per-slug idempotency. The index is
NOT touched — no change row exists at inception time, so the four-writer
enumeration above is unchanged by this mode.

## Full detail

`reference.md` — the `config.yaml` house-rules block, the `/opsx:*` per-tool
verification, the end-to-end proof commands, idempotency detection for
repo-kickstart, and the future "extract to a standalone community package" path.
