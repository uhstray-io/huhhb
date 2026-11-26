---
name: product-inception
description: Use when the user EXPLICITLY requests product inception — "new product", "product inception", "new major initiative", "greenfield product planning" — or explicitly asks for a BMAD-style phase (product brief, PRD, product architecture) for a major initiative. Never inferred from task size — for a feature, change, or bug (even "use our full planning process"), use change-scale planning (brainstorming, then writing-plans) instead.
---

# product-inception

Three sequential, human-gated phases — Analyst (brief) → PM (PRD) →
Architect (architecture) — adapted from BMad Method (attribution in
`reference.md`). Owns exactly three artifacts, produced once per product or
major initiative. **Terminates at the architecture document and the Epic
Queue**: each epic is filed as a Plane work item (the hand-off), and each
approved `AD-N` decision is recorded with `repo-memory`. Decomposing and
implementing an epic happen later, when someone picks up its Plane item,
through change-scale planning — never in this skill (ADR-0008).

**Announce at start:** "I'm using the product-inception skill — three
human-gated phases, ending at the architecture document and the Epic
Queue hand-off."

<HARD-GATE>
One human approval gate per phase, sequential. Do NOT start a phase until
the previous phase's artifact is presented and HUMAN-approved — approval is
never self-granted, "approved-in-principle" is not approval, and running
autonomously does not waive a gate: present and WAIT. Do NOT write
implementation code, file Plane work items, or start change-scale planning
before the architecture document is approved. This skill never bypasses
`brainstorming`'s hard gate — it adds gates in front of it.
</HARD-GATE>

## When NOT to use

A change-scale task through `brainstorming` → `writing-plans` costs
**minutes**; full inception costs **hours** of phases, gates, and reviews. So:

- Feature, change, bug, refactor — even phrased as "plan it properly" or
  "I want our full planning process" → **change-scale planning**
  (`brainstorming` → `writing-plans`). Say so in one line and route away.
- When in doubt about scale → **change-scale planning**. Inception must be
  explicitly requested, never inferred.
- Mapping unknowns before planning → `discovering-context`. Settling a
  design → `brainstorming`. This skill duplicates neither — it sequences
  product-level artifacts in front of them.

## Checklist

Create a task per item; complete in order (single-phase entry: if the user
explicitly asked for just one phase, run only step 0 and that phase, same
gates; steps 4 and 5 run only after architecture.md is approved, and a run
that stops earlier presents its artifact and files nothing in Plane). A
phase run in a chat app, with its artifact pasted back into the repo,
passes the same per-phase gate.

0. **Layout probe** — `plans/architecture/DECISIONS.md` exists → artifacts
   go to `plans/product/<initiative-slug>/`. Otherwise ALL phases write one
   document `docs/plans/product-<slug>.md` (sectioned `## Brief` / `## PRD`
   / `## Architecture`), and `repo-kickstart` is suggested once — never
   mandated.
1. **Analyst phase** → `brief.md` (role prompt + template in
   `reference.md`). Interview the user; evidence over invention. GATE:
   present, get human approval.
2. **PM phase** → `prd.md` — essential spine + **Epic Queue**
   (value-grouped epics, never technical layers; dependency-ordered; FR
   coverage map assigning every FR-N). GATE: present, get human approval.
3. **Architect phase** → `architecture.md` — decisions as `AD-N` blocks
   under a literal `## Decisions` heading (the recording contract: each
   block becomes one architecture decision on approval; never bury
   decisions elsewhere — fix structure BEFORE presenting). GATE: present,
   get human approval.
4. **Record decisions immediately** — the moment architecture.md is
   approved, record each `AD-N` block as its own architecture decision with
   the `repo-memory` skill, one record per decision. `repo-memory` discovers
   where this repo already keeps decisions and asks where they belong when
   it finds none. There is no skip path.
5. **Hand off and STOP** — file the Epic Queue in Plane. For each epic, in
   dependency order, file a work item with the `plane-work-tracking` skill
   in the repo's Plane project (as an Epic work-item type where the project
   has one: resolve that type with the Plane MCP `workitem_type` tool, action
   `resolve`, given the project id and the name `Epic`); each `depends-on`
   becomes a blocked-by relation. Nothing is dispatched or started by the
   filing. When someone picks up an epic's Plane item, its change-scale
   planning starts at `brainstorming`, seeded with brief/PRD/architecture.
   If the repo has no Plane project, present the Epic Queue as the hand-off
   and say so in one line.

## The termination rule

After step 5 there is NOTHING left for this skill to do. Do NOT — even
under direct instruction, time pressure, or "the CEO wants the complete
breakdown today":

- generate user stories, story files, or a `stories/` directory
- write sprint plans or capacity schedules
- start planning for more than the first epic, or do any epic's planning
  or implementation inside this skill (each starts when someone picks up
  its Plane item)

A request for stories/sprints/decomposition is a request to start
change-scale planning (`brainstorming`) on the first epic, seeded with
brief/PRD/architecture — route it there, one line, no apology tour.

## Red flags — STOP, you are rationalizing

| Excuse (observed in baseline testing) | Reality |
|---|---|
| "Speed-to-first-slice beats ceremony — a lean brainstorm→plan is the right altitude" | For a REQUESTED inception, phase discipline IS the altitude. Implementation planning happens per epic, later, through change-scale planning. |
| "No live reviewer, so I adapted the gate / approved-in-principle" | A gate without a human is an open gate. Present and wait. |
| "Artifacts are approved — the natural next step is epics → stories → sprints" | The natural next step is the Epic Queue handoff to Plane. Stories don't exist in this system. |
| "They said 'full planning process' about this feature" | Feature ⇒ change-scale planning. Inception is never inferred. |
| "I'll just also write the first change while I'm here" | Epic planning starts when someone picks the epic up. Hands off. |
