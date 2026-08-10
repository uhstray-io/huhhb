## 1. Write huhhb's PRINCIPLES.md

Content first: the genre is easier to specify once a real instance exists, and
the skeleton in phase 3 is derived from this file rather than invented for it.

- [ ] 1.1 Draft the principles from evidence already in the repository. Each must
      cite a decision record, a measurement, or an incident — candidates, all
      sourced: skills earn their context (T/E3/C4); nothing ships on vibes
      (E1–E5); a gate with no evidence must not certify (empty battle →
      `NO VERDICT`, 12 of 13 non-discriminating fixtures); enforce only what is
      decidable and name the rest as review (the S9–S12 split); objective gates
      first, judge second, humans last (ADR-0005); a gate ships only after the
      mechanism it enforces exists (S9–S12 shipped WARN); memory splits on
      regenerability (ADR-0001/0004); records are append-only (ADR-0003)
- [ ] 1.2 Write each as a rule plus a separate terse reason. Reject any candidate
      that cannot name its source in this repository, however sound it reads
- [ ] 1.3 Add honest as-built notes and `[TARGET]` labels. The known ones:
      `plan/explanation-principles.md` claims canonical status from a gitignored
      path; ADR-0005 is still `Proposed` though implemented; the negative-activation
      mechanism has 2 fixtures of 53 and has never run live; every trigger
      measurement is contaminated by ~50 untracked auto-loading skills in
      `.claude/skills/`
- [ ] 1.4 Add an **Open tensions** section for what is genuinely unresolved rather
      than merely unbuilt
- [ ] 1.5 State the audience and the relationship to `AGENTS.md` at the top
- [ ] 1.6 **Gate:** every principle names its evidence, every unmet rule is
      labelled, and no principle reproduces a procedure — proves *Each principle
      can name its evidence*, *An aspirational rule cannot be mistaken for a
      guarantee*, and *Procedure is deferred, not restated*

## 2. State the audience split and bind the derivation

- [ ] 2.1 `AGENTS.md` — state that it is written for agents mid-task, that
      `PRINCIPLES.md` is written for humans, and that AGENTS.md is partly derived
      from it. Name which sections are the derived ones
- [ ] 2.2 Add the maintenance clause: when a principle changes, the sections
      derived from it are reviewed in the same change. Without it this is a
      duplication, not a derivation — `plan/explanation-principles.md` is the
      in-repo example of that failure
- [ ] 2.3 `CLAUDE.md` — qualify "single source of truth" as *for agents*, so the
      repository does not appear to name two sources
- [ ] 2.4 Add the reciprocal statement to `PRINCIPLES.md` — each document names
      its own audience and the other's
- [ ] 2.5 **Gate:** both documents state their audience and the derivation
      direction, and neither claims precedence over the other — proves *A reader
      knows which document they are in* and *Neither document is the tiebreaker
      over the other*

## 3. Ship the authoring skill

- [ ] 3.1 Author the skill: crawl the repository for evidence first, then
      interrogate the operator about the trade-offs behind what was found. The
      crawl precedes the questions, and the questions are grounded in findings —
      a skill that interviews without evidence produces received wisdom
- [ ] 3.2 It refuses to admit a principle it cannot source, and says so rather
      than filling the gap
- [ ] 3.3 Register it: `marketplace.json` entry, `onboarding/skills-list.md` row.
      It must ship in the marketplace — the existing grill-style skills are
      user-tier only and would be a dangling reference for every user but one
- [ ] 3.4 Author `tests/bench/<skill>.json` to E2 shape: ≥2 positive scenarios
      including a phrasing variant, and ≥1 `expect_no_activation` against its
      nearest neighbour. Capture a baseline and confirm it **fails** before
      trusting any assert; replay asserts through `/bin/sh -c`, which is the
      engine the bench actually uses
- [ ] 3.5 Assert the *shape* of the output and the refusal behavior, not an
      interview transcript — the pass is interactive and a transcript assert would
      measure phrasing
- [ ] 3.6 **Gate:** `node scripts/skill-lint.ts` reports 0 FAIL with the new skill
      registered, and **`node scripts/skill-bench.ts <skill>` is actually run**
      and passes with at least one positive scenario discriminating against the
      skill-disabled baseline. Naming the command matters: the fixture's
      `expect_no_activation` scenario is decided by a trigger probe and never
      reaches the G1 judge, so a fixture that carried only negatives would look
      complete while measuring nothing — proves *The mechanism travels with the
      plugin* and *The crawl precedes the questions*

## 4. Seed the skeleton from repo-kickstart

- [ ] 4.1 Add a `PRINCIPLES.md` skeleton template to
      `skills/repo-kickstart/reference.md` — the audience statement, the
      rule-plus-reason form, the target-labelling convention, and an Open tensions
      heading. **Not** SKILL.md: it is at 10,900 of a 12,000-char budget
- [ ] 4.2 Seed it only when absent; never overwrite an existing file
- [ ] 4.3 Name the authoring skill in the skeleton, so a repository that stops
      here still knows what fills it
- [ ] 4.4 Add a verification-checklist row that reports an unfilled skeleton as
      **present-but-unauthored**, not as satisfied — seeding a file must not be
      enough to look conformed
- [ ] 4.5 **Gate:** a kickstart run on a scratch repository with no
      `PRINCIPLES.md` produces a skeleton and invents no principle; a re-run
      leaves a filled file byte-identical — proves *A repository without one gets
      a skeleton, not content*, *An existing PRINCIPLES.md is never overwritten*,
      and *The skeleton is reported as unfinished*

## 5. Close out

- [ ] 5.1 Confirm `skills/repo-kickstart/SKILL.md` is still under 12,000 chars
- [ ] 5.2 Run the full gate set: `node scripts/skill-lint.ts` (0 FAIL),
      `node --test tests/*.test.ts`, `openspec validate --all --store huhhb`
- [ ] 5.3 Record which `AGENTS.md` sections were declared derived, so the
      maintenance clause has a concrete scope to apply to
- [ ] 5.4 **Gate:** all three gates green and every scenario in
      `specs/repo-principles/spec.md` and `specs/repo-bootstrap/spec.md` is
      exercised by a gate above
