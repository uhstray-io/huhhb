## Why

The authoring standard shipped with its machine-enforceable checks — S9–S12 —
deliberately set to WARN. A FAIL-on-adoption gate would have needed a baseline
large enough to be indistinguishable from having no check at all, so adoption
was made non-blocking on purpose. That was the right call and it left an
obligation: **until the debt is burned down, the standard is advisory.**

This change is the burndown. It is also what the `--battle` gate was built for:
battle proves a revised skill is not worse than the version it replaces, and
until skills are actually revised it has nothing to prove.

Current debt, measured: **0 FAIL, 2 grandfathered (S6), 21 WARN** — 19 S6,
2 S11, 1 S12 (`writing-skills` appears in both S6 and S12).

## What Changes

- **New**: `plans/development/skill-retrofit-order.md` — the dependency-ordered
  burndown, generated once and checked in. Ordering is immutable once written;
  *progress* lives in the shrinking lint baseline, not in a second status file
  that can disagree with it.
- Each skill is brought to the standard: lint findings fixed, the judgment half
  applied (description cut test, body over budget moved to `references/`,
  gotchas inline, explicit load triggers), bench coverage brought to E2 shape.
- Each skill is proven not-worse by `skill-bench.ts --battle` before it merges.
  Two revise-and-rebattle attempts, then revert and move it to the tail of the
  order. **A regression is never merged.**
- **BREAKING (for the gate, not for users)**: once the gate reports **zero
  S9–S12 findings**, those checks are promoted from WARN to FAIL. After that a
  new violation blocks a merge instead of printing a line. The predicate is the
  finding count, not an empty baseline — the baseline grandfathers `FAIL` only,
  so S9–S12 warnings never enter it and "baseline empty" would be true while
  28 of them were still outstanding.

**Scope correction the source plan does not carry.** "Retrofit every skill"
resolves to **51, not 53**. `huhhb-welcome` (`onboarding/welcome.md`) and
`huhhb-skills` (`onboarding/skills-list.md`) are marketplace entries pointing at
onboarding documents, not `skills/<name>/SKILL.md`. They are linted, but they
have no body to restructure, no bench fixture, and no content hash for battle to
resolve — `skillContentHash` cannot address them. Treating them as retrofittable
would produce two permanently-failing batches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skill-authoring`: adds the promotion requirement — what must be true before
  S9–S12 become blocking, and what the burndown must guarantee along the way.
  The existing requirements are unchanged; this adds a concern the standard
  deliberately deferred rather than altering behavior it already specifies.

**Sequencing:** this change depends on `skill-authoring-standard` being archived
first, so `openspec/specs/skill-authoring/spec.md` exists for this delta to
extend. Applying it earlier would create the capability from the wrong half.

## Impact

- All 51 `skills/*/SKILL.md`, iteratively — as many small PRs, batches of 3–5.
- `tests/bench/<name>.json` for each: currently 15 of 53 marketplace entries have
  a fixture, so most batches include authoring one from nothing.
- `scripts/skill-lint-baseline.json` shrinks each batch and ends empty. It is the
  progress tracker.
- `scripts/skill-lint.ts` — the WARN→FAIL promotion, last.
- Cost: battle is judge-calls-only over banked outputs, but bench coverage is
  not — each new fixture needs a real baseline capture. On the last sweep a
  single scenario ran up to 36 minutes and ~$2. **This is the dominant cost of
  the change and it is per-skill, not per-batch.**
- `evolve-skills`' lifecycle pass already audits every skill against lint debt
  and bench history; batches route through it rather than standing up a parallel
  process.

## Rollback Plan

The burndown is designed to be abandonable at any batch boundary without leaving
the repo worse than it started.

- **Per skill** — each retrofit is its own commit inside a batch PR, with a
  recorded battle tally. Reverting restores a *named champion version*, not a
  guess, because the champion's outputs are banked under its content hash.
- **Per batch** — one PR, revert whole. The lint baseline is restored by the same
  revert, since its shrinkage is part of the batch commit.
- **The promotion to FAIL** is a one-line change and the last step precisely so
  it can be reverted alone, without unwinding any skill work, if it turns out to
  block merges for reasons the burndown did not anticipate.
- **Partial completion is a valid resting state.** A half-burned baseline is
  strictly better than the starting position, and S9–S12 stay WARN until it is
  empty — so stopping early degrades to the status quo rather than to a broken
  gate.

The one thing that does not roll back cleanly is a bench fixture authored against
a contaminated baseline. That is why fixture creation records the contamination
caveat with the measurement rather than after it.
