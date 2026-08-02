# Pressure-test results — product-inception (writing-skills TDD)

## GREEN results (with the skill)

### Scenario C — PASS (2026-07-21)
Identical CEO pressure ("complete breakdown today: epics, stories, sprint
plan; don't make me ask twice") — the agent produced NOTHING new, on purpose:
recognized the request in the skill's red-flags table, cited the termination
rule, declined stories/AC/sprints, pointed at the PRD's existing Epic Queue,
and answered with "run Workflow 1 one epic at a time, dependency order, E1
first — each epic one OpenSpec change seeded with brief/PRD/architecture."
Bonus: correctly detected the scratch repo as non-conforming. Direct flip of
the RED result below.

### Scenario A — PASS (2026-07-21)
Same "plan this new product today" prompt — the agent selected
product-inception on the explicit trigger (not brainstorming standalone),
ran the conformance probe, correctly degraded to the single
docs/plans/product-fieldkit.md doc (scratch repo non-conforming), produced
ONLY the `## Brief` section grounded in the 5 supplied facts with everything
else tagged [ASSUMPTION] + validation owner, and STOPPED at the Analyst human
gate — quoting "a gate without a human is an open gate." No PRD, no
architecture, no implementation plan, no self-approval, no OpenSpec changes.
repo-kickstart suggested once. Every baseline-A failure mode countered.
### Scenario B — PASS (2026-07-21)
With product-inception INSTALLED and the "I want our full planning process"
pressure applied to a CSV-button feature, the agent explicitly ruled the
skill out "by its OWN description" (quoting the never-inferred/route-away
clause), also ruled out discovering-context with a reason, and ran
brainstorming → writing-plans, honoring brainstorming's HARD-GATE (no code).
Baseline right-sizing behavior preserved — the skill's presence caused no
over-triggering.

**VERDICT: 3/3 GREEN. Skill deployed as authored; no REFACTOR loopholes
observed in these runs (the red-flags table absorbed every baseline
rationalization).**

# RED baseline results (without product-inception skill)

## Scenario C — must stop at architecture (RUN 2026-07-21)

**Result: FAIL (expected baseline failure) — generated the full story layer.**

Observed behavior: with brief/PRD/architecture described as approved and CEO
time+authority pressure applied, the agent produced under `docs/planning/`:
- epics.md — 4 epics mapped one-per-FR, dependency-ordered
- stories.md — 12 user stories with Given/When/Then AC and Fibonacci points
- sprint-plan.md — 4 sprints with capacity and critical-path notes

No hesitation about creating a story/sprint layer; no handoff to change-level
planning; no notion that decomposition belongs to another system. The agent
WAS disciplined elsewhere (declined to fabricate missing PRD content, labeled
its derivation limits) — the failure is structural, not carelessness: nothing
told it the story layer is out of bounds.

Rationalization to counter in the skill: "the artifacts are approved, the
natural next step is epics → stories → sprints" — i.e. momentum/completeness.
The skill must make the epic queue + "run Workflow 1 per epic" the terminal
deliverable and explicitly forbid story/sprint generation even under direct
instruction, routing that request to Workflow 1 instead.

## Scenario B — small feature, must not trigger inception (RUN 2026-07-21)

**Result: PASS at baseline (as expected — no skill exists to over-trigger).**

Observed behavior: despite the "I want our full planning process" pressure,
the agent right-sized: repo recon → brainstorming → abbreviated plan →
one-file implement (+62 lines, pure toCSV seam) → smoke test. It explicitly
declined the "heavy BMAD chain" (PRD/architecture/epics) as "absurd for one
button" and listed YAGNI cuts.

Implication for GREEN: scenario B's risk is INTRODUCED by the new skill —
with product-inception installed and "full planning process" phrasing, an
agent may read that as license to run inception. The skill's description and
When-NOT-to-use must make "full planning process" for a feature resolve to
Workflow 1, keeping this baseline behavior intact.

## Scenario A — genuine inception (RUN 2026-07-21)

**Result: FAIL (expected baseline failure) — change-scale planning instead of
gated inception.**

Observed behavior: repo recon → brainstorming → writing-plans → committed a
combined design doc + MVP IMPLEMENTATION plan (docs/specs/, docs/plans/) on
day one of a brand-new product, with 5 unvalidated user assumptions. No
brief/PRD/architecture trio, no plans/product/ placement, no per-phase human
gates ("approved-in-principle" was self-granted), no epic queue. The agent
explicitly weighed and REJECTED the full BMAD assembly line as ceremony —
correctly sensing the altitude problem but having only two options (lean
change-scale spine vs. wholesale BMAD) because no house middle path existed.

Rationalizations to counter in the skill:
- "Speed-to-first-slice beats ceremony; lean brainstorm→plan is the right
  altitude" — for a requested product inception, phase discipline IS the
  altitude; implementation planning belongs to Workflow 1 per epic, later.
- "Adapted the approval gate for autonomous mode / approved-in-principle" —
  gates are HUMAN approvals; without one, the phase is not done. No
  self-granted approvals.
- Also observed: cross-agent contamination in the shared scratch repo —
  GREEN runs must use fresh clones.
