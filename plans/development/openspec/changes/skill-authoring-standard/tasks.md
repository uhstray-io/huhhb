## 1. The standard document

- [x] 1.1 Create `skills/writing-skills/references/` — the directory does not
      exist yet
- [x] 1.2 Write `skills/writing-skills/references/skill-authoring.md` with the
      five properties, lifting the text and evidence tags from
      `plans/development/2026-07-16-skill-authoring-standard-plan.md` Task 1
      rather than re-deriving them; dropping a tag drops the rule's auditability
- [x] 1.3 Add the enforcement split table — which layer owns each rule (lint /
      bench / battle / review) — so a reader can tell a machine-checked rule from
      a reviewed one without guessing
- [x] 1.4 **Gate:** the document states, for every requirement in
      `specs/skill-authoring/spec.md`, which layer proves it; `node
      scripts/skill-lint.ts` still reports 0 FAIL — proves *Machine-checkable
      rules are enforced mechanically*
      → 53 skills, 0 FAIL, 2 grandfathered, 18 WARN — unchanged from before

## 2. Lint checks S9–S12

- [x] 2.1 Add S9–S12 to `scripts/skill-lint.ts` as **WARN**, using the standard's
      own definitions (Split of enforcement table) rather than inventing new
      ones: **S9** spec-valid name charset, **S10** reference depth stays one
      level, **S11** description point of view is third person, **S12** body
      ≤500 lines. Each is decidable from the file alone, which is why these four
      are the machine-enforceable subset
- [~] 2.2 **SKIPPED — inert as written.** The baseline grandfathers `FAIL` only
      (`issue.level === "FAIL" && baseline.has(...)`), and S9–S12 ship as WARN,
      so any entry added now would never be consulted. `--strict` promotes WARN
      to FAIL but bypasses the baseline entirely and already exited 1 before this
      change (18 WARN), so there is no regression to absorb. The baseline becomes
      relevant at the moment these checks are promoted to FAIL — an obligation
      recorded in 5.2 for the retrofit change
- [x] 2.3 Add unit rows for S9–S12 to `tests/test_evolve.test.ts` — assert each
      check fires on a violating fixture and stays silent on a clean one, so a
      check that can never fire is caught
      → required exporting the predicates and adding a main-module guard to
      `skill-lint.ts`; `main()` previously ran on import, so nothing could
      import it. S9 and S10 fire on zero real skills, which is exactly why these
      rows exist
- [x] 2.4 **Gate:** `node scripts/skill-lint.ts` reports 53 skills, 0 FAIL, with
      S9–S12 appearing as WARN; `node --test tests/*.test.ts` passes — proves
      *Adoption does not retroactively fail existing skills*
      → 53 skills, 0 FAIL, 2 grandfathered, 21 WARN (18 + 2×S11 + 1×S12);
      229 tests pass, 0 fail

## 3. Negative-activation scenarios

- [x] 3.1 Make `expect_no_activation` act in `scripts/skill-bench.ts`: a scenario
      carrying it runs the trigger probe with an inverted expectation and MUST
      NOT run the assert or judge path. The `Scenario` type already carries the
      key and battle already excludes it; the probe path does not act on it yet
      → also relaxed spec validation: a negative scenario needs no `assert`,
      since requiring one invites a placeholder that later reads as a real check
- [x] 3.2 A negative scenario that cannot produce a verdict — probe error, no
      parseable events — MUST fail loudly rather than counting as "correctly
      silent", mirroring the existing `skillInvoked` guard
      → satisfied by reusing `skillInvoked`, which already throws on a non-run;
      no second guard written
- [x] 3.3 Add negative scenarios to a few representative fixtures (a skill with
      a narrow trigger surface and one with a broad one), not all 53 — bench runs
      cost real money
      → `repo-memory` (vs the OpenSpec propose workflow) and `explaining-changes`
      (vs explaining existing code). Both are confusables **not already** in
      `triggers.negative`: B10 is an aggregate ≥0.9 gate, so with 6 negative
      triggers one may fail and still pass — a negative scenario hard-gates the
      single nearest-neighbour case. Rationale carried in the existing `note`
      field rather than a new key
- [~] 3.4 **Gate — dry-run half done, live run NOT run.** `--dry-run` renders
      both negative scenarios as probe-only and never emits an assert plan, and
      `tests/test_evolve.test.ts` asserts that routing. The **live** half is
      deliberately not run: there is no per-scenario filter, so exercising one
      negative probe means a full `skill-bench repo-memory` — three judged
      scenarios plus baselines, which cost ~$2/scenario and up to 36 min each on
      the last sweep. Needs explicit spend authorization. Until then *A
      negative-activation scenario holds the description honest* is proven for
      routing but **not** measured against a live model

## 4. Wire the pointers

Last, so nothing ever points at a document that does not exist.

- [x] 4.1 `skills/writing-skills/SKILL.md` — point at the standard and absorb the
      rules that are genuinely new to it. Its own Iron Law applies: TDD-gated,
      so the bench fixture in 4.2 comes first
      → three rules called out: no workflow summary in the description (D2),
      negative-activation required (E2), battle non-regression on revision (E5)
- [x] 4.2 Create `tests/bench/writing-skills.json` with a scenario asserting the
      standard is consulted when authoring a skill — capture a baseline first and
      confirm the baseline **fails** it, or the scenario is not evidence
      → 3 scenarios (2 positive + 1 negative-activation) plus trigger lists.
      Asserts replayed through `/bin/sh -c` — the engine the bench actually uses
      — and confirmed to pass a correct answer and **fail** a baseline-style
      one. That simulated baseline is necessary but NOT sufficient: a live
      baseline still has to fail it before this counts as evidence (see 3.4)
- [x] 4.3 `skills/evolve-distill/SKILL.md` and `skills/evolve-skills/SKILL.md` —
      consult the standard when generating or refining, so pipeline output is
      held to the same bar
      → the `evolve-skills` addition tripped S6 (6111 chars) and was cut back
      under the threshold rather than accepted as new debt; the standard's own
      T2 cut test caught the wiring that introduced it
- [x] 4.4 `AGENTS.md` — the skill-authoring section points at the standard rather
      than restating it
- [x] 4.5 **Gate:** `node scripts/skill-lint.ts` 0 FAIL and `node --test
      tests/*.test.ts` green; the new fixture discriminates (skill arm passes,
      baseline arm fails) — proves *Generated skills meet the same bar* and *A
      non-discriminating scenario is not evidence*
      → 53 skills, 0 FAIL, 21 WARN (no net new debt); 230 tests pass, 0 fail.
      Discrimination is proven offline only — the live half is blocked on 3.4

## 5. Close out

- [x] 5.1 Mark `plans/development/2026-07-16-skill-authoring-standard-plan.md` as
      superseded-by-this-change for Tasks 1–6, with Task 8 explicitly carried to
      the follow-on retrofit change — the plan stays in place because the
      standard cites its Evidence base and References tables
      → status table added at the head; checkboxes explicitly demoted from
      source-of-truth, since they read 6/32 while the work is done
- [x] 5.2 Record the obligation the follow-on inherits: S9–S12 are WARN until the
      retrofit burns the baseline down far enough to promote them to FAIL
      → recorded in `scripts/skill-lint.ts` beside the constants, in AGENTS.md
      → Skill Quality Bar, and in 2.2 above
- [~] 5.3 **DEFERRED BY REPO POLICY, not skipped.** AGENTS.md → Release Checklist
      step 1: the bump happens **when the PR opens**, to the next free number,
      and pr-shepherd re-bumps at merge if `main` moved. Bumping now would claim
      a number before the PR exists. Computed value when it does: **0.8.22 →
      0.9.22** (big feature → minor with monotonic patch carry-over)
- [x] 5.4 **Gate:** `openspec validate skill-authoring-standard --strict --store
      huhhb` passes and every scenario in `specs/skill-authoring/spec.md` is
      either exercised by a gate above or explicitly assigned to the follow-on
      retrofit change
