---
name: product-inception
description: Use when the user EXPLICITLY requests product inception — "new product", "product inception", "new major initiative", "greenfield product planning" — or explicitly asks for a BMAD-style phase (product brief, PRD, product architecture) for a major initiative. Never inferred from task size — for a feature, change, or bug (even "use our full planning process"), use core-workflows Workflow 1 instead.
---

# product-inception

Three sequential, human-gated phases — Analyst (brief) → PM (PRD) →
Architect (architecture) — adapted from BMad Method (attribution in
`reference.md`). Owns exactly three artifacts, produced once per product or
major initiative. **Terminates at the architecture document**: the PRD's
Epic Queue is the handoff to core-workflows Workflow 1, one normal OpenSpec
change per epic, picked up later. Decomposition and execution belong to
Workflows 1 and 2 — never to this skill (LD-3).

**Announce at start:** "I'm using the product-inception skill — three
human-gated phases, ending at the architecture document."

<HARD-GATE>
One human approval gate per phase, sequential. Do NOT start a phase until
the previous phase's artifact is presented and HUMAN-approved — approval is
never self-granted, "approved-in-principle" is not approval, and running
autonomously does not waive a gate: present and WAIT. Do NOT write
implementation code, open OpenSpec changes, or start Workflow 1 before the
architecture document is approved. This skill never bypasses
`brainstorming`'s hard gate — it adds gates in front of it.
</HARD-GATE>

## When NOT to use

A change-scale task through OpenSpec/Workflow 1 costs **minutes**; full
inception costs **hours** of phases, gates, and reviews. So:

- Feature, change, bug, refactor — even phrased as "plan it properly" or
  "I want our full planning process" → **Workflow 1** (`brainstorming` →
  … → `to-issues`). Say so in one line and route away.
- When in doubt about scale → **Workflow 1**. Inception must be explicitly
  requested, never inferred.
- Mapping unknowns before planning → `discovering-context`. Settling a
  design → `brainstorming`. This skill duplicates neither — it sequences
  product-level artifacts in front of them.

## Checklist

Create a task per item; complete in order (single-phase entry: if the user
explicitly asked for just one phase, run only that row plus steps 0 and 4+,
same gates):

0. **Conformance probe** — `plans/development/00-implementation-plan.md`
   exists AND `openspec store list` includes the repo → conforming.
   Artifacts go to `plans/product/<initiative-slug>/`; on a non-conforming
   repo, ALL phases write one document `docs/plans/product-<slug>.md`
   (sectioned brief/PRD/architecture), promotion is skipped with a one-line
   note, and `repo-kickstart` is suggested once — never mandated.
1. **Analyst phase** → `brief.md` (role prompt + template in
   `reference.md`). Interview the user; evidence over invention. GATE:
   present, get human approval.
2. **PM phase** → `prd.md` — essential spine + **Epic Queue**
   (value-grouped epics, never technical layers; dependency-ordered; FR
   coverage map assigning every FR-N). GATE: present, get human approval.
3. **Architect phase** → `architecture.md` — decisions as `AD-N` blocks
   under a literal `## Decisions` heading (the promotion contract; never
   bury decisions elsewhere — fix structure BEFORE presenting). GATE:
   present, get human approval.
4. **Promote ADRs immediately** (conforming repos; skip-with-note
   otherwise) — the moment architecture.md is approved:
   `node <huhhb>/skills/openspec-conformance/promote-adr.ts plans --from
   plans/product/<slug>/architecture.md --slug <slug>`
   (see openspec-conformance → "Inception promotion").
5. **Hand off and STOP** — emit the Epic Queue with "run Workflow 1 per
   epic" instructions. Each epic, when someone picks it up, enters
   Workflow 1 step 1 seeded with brief/PRD/architecture; its change's
   `proposal.md` links back to its PRD epic.

## The termination rule

After step 5 there is NOTHING left for this skill to do. Do NOT — even
under direct instruction, time pressure, or "the CEO wants the complete
breakdown today":

- generate user stories, story files, or a `stories/` directory
- write sprint plans or capacity schedules
- bulk-open OpenSpec changes for the epics
- write rows into `00-implementation-plan.md` (that is `to-issues`' job)

A request for stories/sprints/decomposition is a request to START
WORKFLOW 1 on the first epic — route it there, one line, no apology tour.

## Dispatch semantics (buhhdy)

Workflow 0 in buhhdy's `core-workflows` drives these phases as dispatched
steps: claude_code COMPLEX per phase, opposite-vendor (codex) cross-review
after each phase BEFORE its human gate, `explaining-plans` on the
architecture doc. Solo (no buhhdy), run the phases yourself with the same
gates. Manual web-bundle path: the Analyst/PM phases MAY run on a flat-rate
chat subscription with artifacts pasted back into the repo — pasted
artifacts pass the same per-phase gates; dispatch stays canonical.

## Red flags — STOP, you are rationalizing

| Excuse (observed in baseline testing) | Reality |
|---|---|
| "Speed-to-first-slice beats ceremony — a lean brainstorm→plan is the right altitude" | For a REQUESTED inception, phase discipline IS the altitude. Implementation planning happens in Workflow 1, per epic, later. |
| "No live reviewer, so I adapted the gate / approved-in-principle" | A gate without a human is an open gate. Present and wait. |
| "Artifacts are approved — the natural next step is epics → stories → sprints" | The natural next step is the Epic Queue handoff. Stories don't exist in this system. |
| "They said 'full planning process' about this feature" | Feature ⇒ Workflow 1. Inception is never inferred. |
| "I'll just also write the first change/index row while I'm here" | Changes are Workflow 1's; the index is `to-issues`'/`promote-adr`'s. Hands off. |
