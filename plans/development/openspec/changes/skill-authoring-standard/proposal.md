## Why

Fifty-three skills ship from this repo with no normative standard behind them.
`scripts/skill-lint.ts` enforces S1–S8, all of which are mechanical — frontmatter
shape, body size, naming. Nothing states what makes a skill *good*: whether its
description is discoverable, whether it earns the context window it consumes,
whether it was ever evaluated. The result is 18 open WARN and two grandfathered
skills with no shared definition of what they are failing to be.

The gap is now blocking work rather than merely permitting drift. The E5 battle
gate landed 2026-08-08 and currently gates nothing: it exists to prove a refined
skill is not worse than the version it replaces, but the standard it enforces
does not exist, and the retrofit it was built to gate has no target to retrofit
toward.

## What Changes

- **New**: the standard document at `skills/writing-skills/references/skill-authoring.md`
  — five properties (discoverable, discrete, efficient, effective, evaluated),
  each rule carrying an evidence tag so it is auditable rather than asserted.
- **New**: lint checks **S9–S12**, the machine-enforceable subset. The linter
  currently implements S1–S8 only.
- **New**: `expect_no_activation` bench scenarios — a skill must be provably
  silent when it should not fire. Type support landed 2026-08-08; **zero fixtures
  use it**, so negative activation is currently unmeasured across all 53 skills.
- **Modified**: `skills/writing-skills/SKILL.md` points at the standard and
  absorbs the three genuinely new rules (TDD-gated — its own Iron Law applies).
- **Modified**: `skills/evolve-distill/SKILL.md` and `skills/evolve-skills/SKILL.md`
  consult the standard when generating or refining, so machine-authored skills
  are held to the same bar as hand-written ones.
- **Modified**: `AGENTS.md` skill-authoring section points at the standard.
**Not in this change**: retrofitting the 53 existing skills. That is a follow-on
change, gated by battle non-regression — which is what the battle machinery was
built for, and sequencing it after this one gives it both a target to retrofit
toward and something to gate.

Not breaking: the standard grandfathers existing violations through
`scripts/skill-lint-baseline.json` rather than failing the gate on adoption.

## Capabilities

### New Capabilities

- `skill-authoring`: the normative properties every skill in this repo must
  have — hand-written or evolve-generated — and which enforcement layer owns
  each rule (lint / bench / battle / human review).

### Modified Capabilities

None. This store currently holds no main specs, so there are no existing
requirements to amend.

## Impact

- `scripts/skill-lint.ts`, `scripts/skill-lint-baseline.json` — S9–S12 and their
  grandfather entries.
- `scripts/skill-bench.ts` — `expect_no_activation` handling in the trigger
  probe path. The `--battle` machinery it composes with is already in place.
- `tests/test_evolve.test.ts` — unit rows for S9–S12; the lint-gate subtest
  already runs the linter.
- `tests/bench/writing-skills.json` — new fixture asserting the standard is
  consulted, which is itself the new-skill G1 requirement.
- No existing skill's content changes here. The 53 skills are touched by the
  follow-on retrofit change, as many small PRs each gated by battle
  non-regression rather than by review alone.
- **Measurement caveat that must not be papered over**: trigger numbers remain
  provisional while `.claude/skills/` carries ~50 untracked auto-loading BMAD
  skills. Any activation figure produced before that is resolved is contaminated
  and must be reported as such.

## Rollback Plan

Each piece reverts independently, which is why they are separable:

- **Standard document** — delete the file. It is a reference; nothing imports it.
- **S9–S12** — revert the `skill-lint.ts` commit. The baseline file is additive,
  so stale grandfather entries are inert once their check is gone.
- **`expect_no_activation`** — scenarios are opt-in per fixture; remove the key
  and the bench ignores it. No fixture depends on it today.
- **Skill body edits** (writing-skills, evolve-*, AGENTS.md) — ordinary reverts.
- **Retrofit** — each skill is its own PR with a recorded battle tally, so a bad
  retrofit reverts to a named champion version rather than to a guess.

The irreversible risk is the retrofit touching many skills at once. It is
mitigated by sequencing: the standard and its enforcement land first, and no
skill is retrofitted until the gate that proves non-regression is green on a
skill nobody disputes.
