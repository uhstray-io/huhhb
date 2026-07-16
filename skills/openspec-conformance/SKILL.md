---
name: openspec-conformance
description: Use when making OpenSpec conform to Uhstray's plans/development + plans/architecture layout — the store-registration setup a repo runs once, the house openspec/config.yaml rules, and the archive-time ADR promotion into plans/architecture/. Triggers on "openspec conformance", "register the openspec store", "plans/ layout", "promote an ADR", "openspec store setup", "conform openspec to plans". The single source of truth repo-kickstart (setup) and pr-shepherd (archive) both call.
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

**Index writers (canonical enumeration — the four roles, nothing else
writes `00-implementation-plan.md`):** `repo-kickstart` SEEDS the file
from this skill's template; Workflow 1's `to-issues` ADDS a change's row;
Workflow 2 step 7 REFRESHES statuses/links; `promote-adr.ts`
(pr-shepherd's post-merge) FLIPS a row to `archived`. Reference this
list; don't restate subsets.

**Layout (what adopted repos use):**
- `plans/development/openspec/changes/<slug>/` — active changes (proposal, specs, design, tasks)
- `plans/development/00-implementation-plan.md` — living index over active changes
- `plans/architecture/NNN-<slug>.md` — durable ADRs (promoted on archive)

**Mechanism:** OpenSpec's native **store registration** relocates the root to
`plans/development` (verified live, openspec 1.6.0). A forked schema was
**rejected** — it can rename/re-template artifacts but cannot move the root. What
OpenSpec doesn't model — the index and ADRs — is carried as a promotion pattern.

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
- Seed the index and ADR home from `templates/` (copy, then fill placeholders):
  `templates/00-implementation-plan.md` → `plans/development/00-implementation-plan.md`;
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
`plans/architecture/NNN-<slug>.md` ADR (next number; Context/Decision/Consequences
+ a link back to the archived design), and flips exactly that change's row in
`00-implementation-plan.md` to `archived` with the ADR link. It never copies the
full design doc. A change with no `## Decisions` promotes no ADR but still updates
the index. Offline check: `node --test tests/test_openspec_conformance.test.ts`.

## Full detail

`reference.md` — the `config.yaml` house-rules block, the `/opsx:*` per-tool
verification, the end-to-end proof commands, idempotency detection for
repo-kickstart, and the future "extract to a standalone community package" path.
