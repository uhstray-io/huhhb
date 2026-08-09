# inception-adr-promotion Specification

## Purpose
TBD - created by archiving change product-inception-layer. Update Purpose after archive.
## Requirements
### Requirement: Source-file promotion mode on promote-adr.ts
`promote-adr.ts` SHALL accept a source-file invocation (e.g.
`--from <path-to-architecture.md> --slug <initiative-slug>`) that reuses the
existing `## Decisions`-section-only extraction, next-`NNN` numbering, and
per-slug idempotency, and SHALL NOT read or modify
`00-implementation-plan.md` in this mode (no index row exists; the
missing-row failure path MUST NOT fire). A source file with no meaningful
`## Decisions` section SHALL promote no ADR and exit 0 with a note. New cases
in the existing `tests/test_openspec_conformance.test.ts` SHALL cover the mode.

#### Scenario: Immediate promotion from architecture.md
- **WHEN** the script runs with `--from plans/product/<slug>/architecture.md --slug <slug>`
- **THEN** exactly one `plans/architecture/NNN-<slug>.md` ADR is written from the `## Decisions` section only, and the implementation-plan index is untouched

#### Scenario: Idempotent re-run
- **WHEN** the same source-file invocation runs twice
- **THEN** the second run writes nothing new and reports the existing ADR

#### Scenario: No Decisions section
- **WHEN** the source file lacks a meaningful `## Decisions` section
- **THEN** no ADR is written and the script exits 0 with a note

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
unchanged, timing (immediately on architecture approval), and an explicit
note that the canonical four-writer index enumeration is unchanged because
inception writes no index rows.

#### Scenario: Single documented mechanism
- **WHEN** an agent needs to promote inception decisions
- **THEN** openspec-conformance's Inception promotion subsection is the only mechanism offered, and it invokes the same promote-adr.ts script

