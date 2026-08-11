## Context

See proposal.md — Why. The design-relevant state:

- `scripts/skill-lint.ts` implements **S1–S8** and reports 53 skills, 0 FAIL,
  2 grandfathered, 18 WARN. It already carries a baseline file
  (`scripts/skill-lint-baseline.json`) and the grandfathering machinery works.
- `scripts/skill-bench.ts` gained `expect_no_activation` in its `Scenario` type
  on 2026-08-08 and **excludes such scenarios from battle**, but no fixture sets
  the key and the trigger-probe path does not yet act on it. The type is a
  placeholder, not a feature.
- `--battle` landed the same day: banked outputs keyed by (prompt hash, skill
  content hash), position-swapped judging, verified quotes, non-regression and
  superiority thresholds. It is the enforcement layer for the standard's
  refinement requirement and currently has nothing to enforce.
- `skills/writing-skills/` has **no `references/` directory** — the standard's
  intended home does not exist.
- Trigger measurement is contaminated: `.claude/skills/` holds ~50 untracked,
  unignored, auto-loading BMAD skills.

## Goals / Non-Goals

**Goals:**

- One normative document that both humans and the distillation pipeline read, so
  a hand-written and a generated skill are held to the same bar by construction
  rather than by discipline.
- Machine-enforce exactly the subset that can be checked without judgment, and
  leave the rest visibly to review rather than approximating it.
- Adopt without breaking the gate: existing violations become recorded debt.

**Non-Goals:**

- **The 53-skill retrofit.** It is a separate change, gated by battle
  non-regression. Sequencing it after this one is what gives battle something to
  gate and gives the retrofit a stable target.
- Resolving the `.claude/skills/` contamination. It is a real measurement
  problem, but it is an environment fix with its own blast radius; this change
  labels affected numbers provisional rather than pretending they are clean.
- Changing any skill's content. This change builds the standard and its
  enforcement only.

## Decisions

**The standard lives in `skills/writing-skills/references/`, not `docs/`.**
It is consumed by an agent mid-task, so it belongs on the progressive-disclosure
path of the skill that teaches skill authoring. A `docs/` location would be
read by humans and ignored by the pipeline. *Alternative rejected:* `AGENTS.md`
— it is already the canonical operating document and absorbing a full standard
would bury the operating instructions it exists to carry. AGENTS.md gets a
pointer instead.

**S9–S12 enforce only what is decidable from the file.** A check that needs to
know whether a rule is one the model already follows is a judgment call, and a
mechanical approximation of it produces confident wrong answers at scale — the
failure mode the bench already demonstrated thirteen times over. The split:

| Property | Enforced by | Why there |
|---|---|---|
| Discoverable | lint (shape) + bench triggers (behavior) | description *form* is mechanical; whether it actually fires is measurable |
| Discrete | lint (heuristic WARN) + review | "one coherent unit" is a judgment; lint can only flag smells |
| Efficient | lint (size) + bench token ratio | both already exist as gates |
| Effective | bench discrimination vs baseline | the only honest test is whether the baseline fails without it |
| Evaluated | bench (fixture exists and discriminates) | mechanically checkable |
| Not-worse | `--battle` non-regression | already built |

**New checks warn before they fail.** S9–S12 land as WARN, with the baseline
capturing current violations. Promotion to FAIL is a later, deliberate step once
the debt is burned down. *Alternative rejected:* ship as FAIL with a large
baseline — a 53-entry baseline is indistinguishable from no check at all, and
invites the habit of appending to it rather than fixing.

**`expect_no_activation` reuses the existing trigger-probe path.** The probe
already answers "did this skill fire for this prompt"; a negative scenario is
that same probe with an inverted expectation. *Alternative rejected:* a separate
negative-fixture format — it would duplicate probe machinery and drift from it.

**The standard's text is lifted from the source plan, not re-derived.**
`plans/development/2026-07-16-skill-authoring-standard-plan.md` Task 1 contains
the full standard inline with its evidence tags. Re-writing it would silently
drop the citations that make each rule auditable. The plan becomes the provenance
record; the reference file becomes the live document.

## Risks / Trade-offs

- **The standard is written by the same agent that will be measured against it**
  → the evidence tags are the mitigation: every rule cites a source in the plan's
  References table, so a rule that exists only because it was convenient has no
  tag and is visibly unsupported.

- **S9–S12 as WARN may never be promoted to FAIL**, leaving the standard advisory
  in practice → the retrofit change owns the burndown, and its completion
  criterion is that the baseline is empty enough for promotion. Recorded here so
  the follow-on inherits an explicit obligation rather than a vague intention.

- **Adding negative-activation fixtures increases bench cost**, which is real
  money on a suite that already spent ~$25 in one session → negative scenarios
  reuse the trigger probe, which is the cheapest arm (no assert run, no judge
  call), and they are added to a few representative skills rather than all 53.

- **Contaminated trigger numbers could be read as clean** by someone reading only
  the summary line → the requirement *Contaminated activation measurements are
  reported as such* is in the spec precisely so the caveat travels with the
  number rather than living in a session transcript.

- **Two task lists could compete for authority** — the source plan's Task 1–8 and
  this change's `tasks.md` → the plan is marked as provenance and its Task 1–6
  are represented here; Task 8 moves to the follow-on change. The plan is not
  deleted, because its Evidence base and References tables are cited by the
  standard itself.

## Migration Plan

No runtime migration — this change adds a document and gates. Rollout order
matters only in that the standard must exist before the checks that cite it:

1. Standard document (nothing depends on it yet).
2. Lint checks as WARN + baseline (gate stays green by construction).
3. Bench negative-activation support + representative fixtures.
4. Pointers (writing-skills, evolve-*, AGENTS.md) — last, so they never point at
   something absent.

Rollback is per-step and covered in proposal.md — Rollback Plan.
