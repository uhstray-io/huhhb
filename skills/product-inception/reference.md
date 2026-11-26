# product-inception — reference

Role prompts and artifact templates for the three phases.

**Attribution:** phase structure, template outlines, and the FR/AD/UJ/SM ID
conventions are adapted from **BMad Method v6.x** (github.com/bmad-code-org/
BMAD-METHOD, MIT), rewritten house-style. Nothing is vendored; the
story/sprint layer is deliberately not adapted. The Epic Queue section
is a house addition — upstream BMAD sequences epics downstream of the PRD, in
the story layer we cut.

## Role prompts

Terse, checklist-driven, announce-at-start. Each is one phase: a single
session drafts the artifact, then presents it at the human gate.

### Analyst

> You are the Analyst for <initiative>. Announce: "Analyst phase — producing
> the product brief." Interview the user; ground every finding in evidence
> (their answers, market/domain facts they supply, repo reality) — never
> invent users or numbers; unknowns become explicit assumptions with a
> validation owner. Fill the brief template only — no solution design beyond
> a sketch, no planning. Terminate by presenting brief.md for human approval.

### PM

> You are the PM for <initiative>. Announce: "PM phase — producing the PRD."
> Input: the approved brief. Requirements emerge from the users and problem,
> not template-filling; ship-smallest-that-validates drives MVP scope. Number
> requirements globally (FR-1..N, never reused), journeys UJ-N, metrics SM-N
> with at least one counter-metric. Build the Epic Queue last: value-grouped
> epics (never technical layers), dependency-ordered, every FR-N mapped to
> exactly one epic. Terminate by presenting prd.md for human approval.

### Architect

> You are the Architect for <initiative>. Announce: "Architect phase —
> producing the architecture document." Input: the approved brief + PRD.
> Answer with trade-offs, not verdicts; boring technology wins ties; no
> abstraction before the Rule of Three. Every load-bearing choice is an AD-N
> block (rule + rationale + what it prevents) under the literal `## Decisions`
> heading — that section is recorded as one architecture decision per block on
> approval. Map every PRD
> capability to a structural element; park what you're not deciding in
> Deferred. Terminate by presenting architecture.md for human approval. Do
> not decompose into stories or changes.

## Templates

Adapt aggressively — drop any section that doesn't earn its place; never add
the dropped upstream ceremony back (Document Purpose, Assumptions Index,
market-research/PRFAQ appendices) without the human asking.

### brief.md

```markdown
# <Initiative> — Product Brief

## Executive Summary
## Problem
## Solution
## Who This Serves
<primary users, jobs-to-be-done; non-users worth naming>
## Constraints
## Success Criteria
<measurable — numbers, not adjectives>
## Scope
<in / out>
```

### prd.md

```markdown
# <Initiative> — PRD

## Vision
## Target Users
<UJ-1..N key user journeys; jobs-to-be-done>
## Glossary
<the load-bearing terms — downstream artifacts reuse these words>
## Capabilities
<### <Capability name> — narrative, then its FR-N requirements (globally
numbered, testable consequences)>
## Non-Goals
## MVP Scope
<in / out>
## Success Metrics
<SM-1..N, each cross-referencing the FR-N it validates; ≥1 counter-metric>
## Epic Queue
<E1..En, value-grouped, dependency-ordered. Per epic: goal, FRs covered,
depends-on. Close with the FR coverage map: every FR-N → exactly one epic.
This section is the hand-off queue — each epic is filed as a Plane work item
on approval, with depends-on as blocked-by relations.>
## Open Questions
```

### architecture.md

```markdown
# <Initiative> — Product Architecture

## Design Paradigm
<the shape of the system and why>
## Decisions
<AD-1..N blocks — **AD-n: <title>.** rule + rationale + prevents. This exact
section is recorded as architecture decisions on approval, one record per
AD-n block, with repo-memory.>
## Consistency Conventions
<naming / data / state rules that hold everywhere>
## Stack
<name + version, only what's decided>
## Capability → Architecture Map
<every PRD capability → the structural element that serves it>
## Deferred
<explicitly not decided yet, and what would force the decision>
```

## Non-conforming repos

All three phases write into one `docs/plans/product-<slug>.md` with `## Brief`
/ `## PRD` / `## Architecture` top sections (same content, same gates).
On approval, each `AD-N` block is still recorded as its own architecture
decision with `repo-memory`, which discovers where this repo keeps decisions.
Suggest repo-kickstart once per session.
