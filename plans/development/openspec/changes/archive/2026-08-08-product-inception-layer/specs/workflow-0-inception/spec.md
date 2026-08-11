# workflow-0-inception

## ADDED Requirements

### Requirement: Workflow 0 table in core-workflows
`buhhdy/skills/core-workflows/SKILL.md` SHALL define "Workflow 0 — Product
Inception (opt-in, rare)" above Workflow 1, in the same table format
(Step/Kind/Primary/Purpose/Tier/Reviewer/Gate), with: one dispatched step per
phase (Analyst, PM, Architect) at COMPLEX tier with claude_code primary;
opposite-vendor (codex) cross-review after each phase per the Cross-Review
Rule; `explaining-plans` (codex primary) applied to the architecture document;
and a terminal buhhdy-level handoff step emitting the epic queue. The intro
SHALL state that Workflow 0 is exceptional and Workflow 1 remains the default
entry point.

#### Scenario: Cross-review after each phase
- **WHEN** any Workflow 0 phase artifact (brief, PRD, architecture) is authored
- **THEN** the immediately following review step is dispatched to the opposite vendor before the next phase's gate

#### Scenario: Workflow 0 ends at handoff
- **WHEN** the terminal handoff step completes
- **THEN** Workflow 0 is finished — no story creation, no tasks.md, no tracker issues; those belong to Workflow 1 runs per epic

### Requirement: Inception-vs-change routing rule
`buhhdy/skills/routing-guide/SKILL.md` and `buhhdy/config.yaml` SHALL each
carry one short routing block: product/initiative scale, explicitly requested
→ Workflow 0; everything else → Workflow 1; tie-breaker: when in doubt,
Workflow 1 — inception MUST be explicitly requested, never inferred.

#### Scenario: Ambiguous scale defaults to Workflow 1
- **WHEN** a request's scale is ambiguous between initiative and change
- **THEN** buhhdy routes it to Workflow 1

### Requirement: LD-3 decision record
`buhhdy/README.md`'s Planning Layout section SHALL gain a dated LD-3 record
in the LD-1/LD-2 style: the BMAD-adapted inception layer is opt-in and
terminates at architecture; OpenSpec is the sole change substrate; no story
system. It SHALL record the rejected alternative (adopting BMAD wholesale
including its story/sprint layer) and why (two competing sources of truth;
token/ceremony cost; overlap with to-issues/pr-shepherd).

#### Scenario: Record present and dated
- **WHEN** the deliverable PR merges
- **THEN** buhhdy/README.md contains the dated LD-3 record including the rejected alternative
