# inception-adr-promotion Specification

## Purpose
Governs how ratified decisions reach the ADR store — the single mechanism that
promotes a `## Decisions` section into a numbered record with its two index
rows, and the boundary of what that mechanism owns.
## Requirements
### Requirement: Source-file promotion mode on promote-adr.ts
`promote-adr.ts` SHALL accept a source-file invocation (e.g.
`--from <path-to-architecture.md> --slug <initiative-slug>`) that reuses the
existing `## Decisions`-section-only extraction, next-`NNN` numbering, and
per-slug idempotency. `promote-adr.ts` SHALL own architecture decision records
only — the record at `plans/architecture/YYYY/YYYY-MM.md`, its year index row,
and its master index row — and SHALL NOT read or modify any implementation-plan
index in any mode. The missing-row failure path SHALL NOT exist, rather than
being suppressed per-mode. A source file with no meaningful `## Decisions`
section SHALL promote no ADR and exit 0 with a note. New cases in the existing
`tests/test_openspec_conformance.test.ts` SHALL cover the mode.

#### Scenario: Immediate promotion from architecture.md
- **WHEN** the script runs with `<plans-dir> --from plans/product/<slug>/architecture.md --slug <slug>`
- **THEN** exactly one `ADR-NNNN` record is appended to `plans/architecture/YYYY/YYYY-MM.md` from the `## Decisions` section only, plus its year-index and master-index rows

#### Scenario: Idempotent re-run
- **WHEN** the same source-file invocation runs twice
- **THEN** the second run writes nothing new and reports the existing ADR

#### Scenario: No Decisions section
- **WHEN** the source file lacks a meaningful `## Decisions` section
- **THEN** no ADR is written and the script exits 0 with a note

#### Scenario: No mode consults an implementation-plan index
- **WHEN** the script runs in any mode in a repository that has no
  implementation-plan index
- **THEN** it completes normally and exits 0, because no mode reads one and no
  missing-row failure path exists to fire

### Requirement: Promotion runs immediately on architecture approval
On a conforming repo, the moment the human approves architecture.md the
`product-inception` skill SHALL invoke `promote-adr.ts` in source-file mode,
so the ADR lands in `plans/architecture/` BEFORE the epic-queue handoff step —
inception decisions MUST be visible to Workflow 1's `investigate` step before
any epic is picked up.

#### Scenario: ADR lands before handoff
- **WHEN** the human approves architecture.md on a conforming repo
- **THEN** promote-adr.ts runs in source-file mode and the numbered ADR exists in `plans/architecture/` before the epic queue is handed off

### Requirement: Inception promotion documented in openspec-conformance
`skills/openspec-conformance/SKILL.md` SHALL gain a short "Inception
promotion" subsection: invocation, the `## Decisions`-only rule applying
unchanged, and timing (immediately on architecture approval). It SHALL describe
`promote-adr.ts` as owning decision records only, and SHALL NOT carry an
index-writer enumeration, because no writer maintains a change index.

#### Scenario: Single documented mechanism
- **WHEN** an agent needs to promote inception decisions
- **THEN** openspec-conformance's Inception promotion subsection is the only mechanism offered, and it invokes the same promote-adr.ts script

#### Scenario: No stale index guidance survives
- **WHEN** the skill is read after this change
- **THEN** it names no implementation-plan index and states no rule about who may
  write rows to one

