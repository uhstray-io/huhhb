# Proposal: product-inception-layer

## Why

huhhb has no process for genuine product inception — a new product or major
initiative currently enters core-workflows Workflow 1 at change scale, with no
place for the product brief, PRD, or product-architecture thinking that should
precede the first OpenSpec change. BMAD-METHOD models these upstream phases
well (Analyst → PM → Architect) but brings a story/sprint/dev layer that would
compete with our OpenSpec + to-issues + pr-shepherd substrate.

## What Changes

- New skill `skills/product-inception/` (SKILL.md + reference.md): three
  sequential, human-gated phases (Analyst → PM → Architect) adapted from BMAD
  house-style, producing `plans/product/<initiative-slug>/{brief,prd,architecture}.md`
  on conforming repos (single `docs/plans/product-<slug>.md` with skip-notes on
  non-conforming ones, mirroring core-workflows degradation).
- Inception terminates at the architecture document. The PRD's Epic Queue
  section (value-grouped epics, dependency-ordered, FR-coverage map) is the
  handoff: each epic is later consumed by Workflow 1 as a normal OpenSpec
  change. No story system, no second implementation index.
- `buhhdy/skills/core-workflows/SKILL.md`: new "Workflow 0 — Product Inception
  (opt-in, rare)" table above Workflow 1 — COMPLEX-tier authoring per phase,
  opposite-vendor cross-review after each phase, explaining-plans on the
  architecture doc, terminal epic-queue handoff step.
- `buhhdy/skills/routing-guide/SKILL.md` + `buhhdy/config.yaml`: inception-vs-
  change routing rule; tie-breaker: when in doubt, Workflow 1 — inception is
  explicitly requested, never inferred.
- `buhhdy/README.md`: decision record LD-3 (opt-in, terminates at architecture,
  OpenSpec sole change substrate; rejected alternative: adopting BMAD wholesale).
- `skills/openspec-conformance/`: "Inception promotion" subsection —
  architecture.md `## Decisions` (AD-N blocks) promote immediately on
  architecture approval via a new source-file mode on `promote-adr.ts`
  (same extraction rule and numbering, no index-row flip).
- `skills/repo-kickstart/`: seed `plans/product/` (+ README) in the conforming
  tree, one checklist row; non-mandatory for adoption.
- Pressure tests per writing-skills TDD for the new skill and routing rule.

## Capabilities

### New Capabilities

- `product-inception`: the gated three-phase skill — triggers, phase gates,
  artifact placement, epic-queue handoff contract, non-conforming degradation,
  when-NOT-to-use discipline.
- `workflow-0-inception`: buhhdy's Workflow 0 sequence, dispatch/cross-review
  semantics, and the inception-vs-change routing rule.
- `inception-adr-promotion`: immediate promotion of architecture decisions to
  numbered ADRs in `plans/architecture/`, reusing the archive-time mechanism.
- `inception-scaffold`: repo-kickstart seeding of `plans/product/`, idempotent
  and non-destructive.

### Modified Capabilities

None — the store has no existing specs; all four are new.

## Impact

- Docs/skills-only change: `skills/`, `buhhdy/`, plus one small
  `promote-adr.ts` extension (Node stdlib only, covered by its existing test
  file).
- No change to Workflow 1/2 semantics, pr-shepherd, to-issues, or the four
  index writers — the epic queue lives in `prd.md` only (per human decision
  2026-07-21).
- BMAD-METHOD is NOT vendored; the local `_bmad/`/`.claude/skills/bmad-*`
  install stays untracked. Template structure adapted with attribution
  (BMad Method v6.x, bmad-code-org, MIT) in the skill's reference.md.

## Rollback Plan

Revert the PRs — all artifacts are markdown/skills plus one flag-guarded
`promote-adr.ts` mode; nothing migrates or persists outside git. Any
`plans/product/` trees already created on adopting repos are inert documents
and can stay.
