# product-inception Specification

## Purpose
TBD - created by archiving change product-inception-layer. Update Purpose after archive.
## Requirements
### Requirement: Three sequential human-gated phases
The `product-inception` skill SHALL run three phases in order — Analyst
(brief.md) → PM (prd.md) → Architect (architecture.md) — and SHALL NOT start
a phase until the previous phase's artifact has been presented to and
approved by the human. No implementation and no Workflow 1 run SHALL begin
before the architecture document is approved.

#### Scenario: Brief gate blocks the PM phase
- **WHEN** the Analyst phase produces brief.md and the human has not approved it
- **THEN** the skill presents brief.md and waits; the PM phase does not start

#### Scenario: PRD gate blocks the Architect phase
- **WHEN** prd.md is drafted but not human-approved
- **THEN** the skill presents prd.md and waits; the Architect phase does not start

#### Scenario: Architecture gate blocks handoff
- **WHEN** architecture.md is drafted but not human-approved
- **THEN** the skill presents architecture.md and waits; no ADR promotion and no epic-queue handoff occur

### Requirement: Explicit-only triggering with route-away
The skill SHALL engage only on genuine inception requests ("new product",
"product inception", "new major initiative", "greenfield product planning")
or an explicit user invocation for a BMAD-style phase (e.g. architecture-scale
brainstorming for a major initiative). For feature- or change-scale work the
skill SHALL route to core-workflows Workflow 1 instead. The skill's
description and a "When NOT to use" section SHALL state the cost asymmetry
(change-scale through OpenSpec is minutes; full inception is hours).

#### Scenario: Small feature does not trigger inception
- **WHEN** a user asks to plan a small feature or change
- **THEN** the skill is not invoked (or, if invoked, immediately routes to Workflow 1 with a one-line explanation)

#### Scenario: Explicit single-phase entry
- **WHEN** the user explicitly requests one phase (e.g. an architecture document for a major initiative)
- **THEN** the skill enters at that phase only, keeps its human approval gate, and still terminates at the architecture document

### Requirement: Artifact placement with conformance degradation
On a conforming repo (LD-1 probe passes) the skill SHALL write
`plans/product/<initiative-slug>/brief.md`, `prd.md`, and `architecture.md`.
On a non-conforming repo it SHALL write the three artifacts as one document at
`docs/plans/product-<slug>.md`, skip ADR promotion with a one-line note, and
suggest `repo-kickstart` once per session — never mandate it.

#### Scenario: Conforming repo placement
- **WHEN** inception runs on a repo where `plans/development/00-implementation-plan.md` exists and the store is registered
- **THEN** the three artifacts land under `plans/product/<initiative-slug>/`

#### Scenario: Non-conforming repo degradation
- **WHEN** inception runs on a repo that has not adopted the layout
- **THEN** a single `docs/plans/product-<slug>.md` is written, promotion is skipped with a note, and repo-kickstart is suggested once

### Requirement: architecture.md carries a promotable Decisions section
architecture.md SHALL contain a literal `## Decisions` heading holding the
initiative's numbered `AD-N` decision blocks (rule + rationale) — the exact
section `promote-adr.ts` extracts. The Architect phase MUST NOT present an
architecture.md for approval without it; decisions buried elsewhere in the
document do not promote.

#### Scenario: Missing Decisions section blocks the gate
- **WHEN** the Architect phase drafts an architecture.md with no `## Decisions` section
- **THEN** the skill fixes the structure before presenting the document for human approval (silent no-promotion is not an acceptable outcome)

### Requirement: Epic Queue handoff terminates the skill
`prd.md` SHALL contain an Epic Queue section: value-grouped epics (never
technical layers), dependency-ordered, with an FR-coverage map showing every
`FR-N` assigned to an epic. After architecture approval the skill's terminal
step SHALL hand the user (or buhhdy) the epic queue with "run Workflow 1 per
epic" instructions and SHALL stop — it SHALL NOT bulk-open OpenSpec changes,
create stories or a `stories/` directory, or write to
`00-implementation-plan.md`. When an epic is later picked up, its OpenSpec
change's `proposal.md` MUST link back to the PRD epic, and Workflow 1 step 1
is seeded with the brief/PRD/architecture as context.

#### Scenario: Handoff instead of stories
- **WHEN** the architecture document is approved and the user asks to continue into implementation
- **THEN** the skill emits the epic queue and Workflow 1 instructions, and declines to generate stories or open changes itself

#### Scenario: No FR left uncovered
- **WHEN** prd.md is finalized
- **THEN** every FR-N appears in the Epic Queue's coverage map

### Requirement: Manual web-bundle path passes the same gates
The skill SHALL document a manual path where Analyst/PM artifacts are authored
on a flat-rate chat subscription and pasted back into the repo; pasted
artifacts MUST pass the same per-phase human approval gates before the next
phase starts. Dispatch through buhhdy stays the canonical path.

#### Scenario: Pasted brief still gated
- **WHEN** a brief authored externally is pasted into the repo
- **THEN** the PM phase does not start until the human approves that brief in-session

### Requirement: Adaptation is attributed, never vendored
The skill's reference.md SHALL carry an attribution note (structure adapted
from BMad Method v6.x, bmad-code-org, MIT). No BMAD-METHOD file SHALL be
committed to the repo — the local `_bmad/`/`.claude/skills/bmad-*` install
stays untracked.

#### Scenario: No vendored files
- **WHEN** the deliverable PRs merge
- **THEN** reference.md contains the attribution note and no `_bmad/` or `bmad-*` skill files appear in the git tree

### Requirement: TDD pressure-test evidence
The skill and routing rule SHALL be developed per writing-skills TDD:
(1) baseline "plan a new product" without the skill (expected failure: jumps
to Workflow 1 or code), (2) small-feature scenario that must NOT trigger
inception (this doubles as the routing-rule pressure test), (3) a
stop-at-architecture scenario that must hand off rather than generate stories
— each run without the skill (RED) then with it (GREEN), transcripts attached
as PR evidence.

#### Scenario: Baseline fails, skill passes
- **WHEN** the three pressure scenarios run without the skill and then with it
- **THEN** the baseline runs exhibit the documented failure modes and the with-skill runs comply, with transcripts recorded in the PR

