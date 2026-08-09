## 1. Derive the order, once, mechanically

- [ ] 1.1 Seed the inventory from `node scripts/evolve/skill_graph.ts inventory
      --json --tier repo` — 51 entries, already verified working. Do not
      re-implement enumeration; the new work is edge extraction and the sort
- [ ] 1.2 Record the two exclusions explicitly: `huhhb-welcome`
      (`onboarding/welcome.md`) and `huhhb-skills` (`onboarding/skills-list.md`)
      are marketplace entries without a `SKILL.md`, so they have no body to
      restructure and no content hash for battle. They are held to lint alone.
      **51 retrofittable, not 53** — an unrecorded exclusion becomes two
      permanently-failing batches
- [ ] 1.3 Extract edges: a skill depends on another when its `SKILL.md` or
      `references/` names, links, or invokes it. Grep each body for every other
      skill's name, and keep the matched line as the edge's evidence
- [ ] 1.4 Topo-sort dependencies-first. Seed rank 0 explicitly with
      `writing-skills` (its `references/` hosts the standard), then
      `evolve-distill` and `evolve-skills` (they mass-produce skills — retrofitting
      them first stops new debt being minted mid-burndown). Tie-break equal ranks
      by existing bench coverage, cheapest-to-verify first. Cycles collapse into
      a single batch
- [ ] 1.5 Write `plans/development/skill-retrofit-order.md`: the order plus each
      edge's evidence, and **no per-skill status column** — progress belongs to
      the lint baseline, and a second tracker is how a plan comes to report 0 of
      48 while the work is shipped
- [ ] 1.6 **Gate:** the file lists 51 skills with cycles grouped and rank 0 as
      specified, and contains no completion state — proves *The ordering and the
      progress are separate artifacts* and *A dependency cycle is retrofitted as
      one unit*

## 2. Per-skill retrofit protocol

This phase repeats per skill; it is the definition of done for one skill, not a
one-time task. Batches are 3–5 skills, in rank order.

- [ ] 2.1 Fix the skill's S1–S12 findings and delete its entries from
      `scripts/skill-lint-baseline.json` in the same commit — the baseline
      shrinking IS the progress record
- [ ] 2.2 Apply the judgment half of the standard (D/C/T/P): description against
      the cut test and never a workflow summary, body over budget moved to
      `references/` with explicit load triggers, gotchas inline in `SKILL.md`
- [ ] 2.3 Bring `tests/bench/<name>.json` to E2 shape — ≥2 positive scenarios
      including a phrasing variant, ≥1 `expect_no_activation`. Only 15 of 53
      entries have a fixture today, so most batches author one from nothing.
      Capture the baseline and confirm it **fails** the assert before trusting
      the scenario, and replay every assert through `/bin/sh -c` — the bench
      spawns `sh`, not the interactive shell
- [ ] 2.4 Prove not-worse: `node scripts/skill-bench.ts <name> --battle`. The
      champion side comes from the bank, so bench the pre-retrofit version
      first — battle never generates the champion. Non-regression is wins ≥
      losses among decided; record the tally in the PR
- [ ] 2.5 On a losing tally: at most two revise-and-rebattle attempts, then
      revert the skill to its champion version and move it to the tail of the
      order. Never merge a regression to finish a batch
- [ ] 2.6 **Gate:** every skill in the batch has a recorded battle tally that is
      not a loss, and `node scripts/skill-lint.ts` shows the WARN and
      grandfathered counts no higher than before the batch — proves *A
      regression is reverted after two attempts* and *Debt never grows during
      the burndown*

## 3. Batch close-out

- [ ] 3.1 One PR per batch, one commit per skill inside it, with the battle
      tallies and the lint delta in the description
- [ ] 3.2 Route batches through `evolve-skills`' lifecycle pass where it fits —
      it already audits every skill against lint debt and bench history. This
      change defines the order and the per-skill gate, not a parallel process
- [ ] 3.3 Report the `.claude/skills/` contamination with any trigger number the
      batch produces; ~50 untracked auto-loading BMAD skills are still present,
      so activation measurements are provisional until that is resolved
- [ ] 3.4 **Gate:** across merged batches the grandfathered count and the S9–S12
      finding count are monotonically falling — proves *Debt never grows during
      the burndown*

## 4. Promote S9–S12 to blocking

Last, and deliberately a single reversible step.

- [ ] 4.1 Confirm `scripts/skill-lint-baseline.json` is empty, every retrofittable
      skill has an E2 bench fixture, and `node scripts/skill-lint.ts` reports
      0 FAIL and 0 grandfathered
- [ ] 4.2 Change S9–S12 from `WARN` to `FAIL` in `scripts/skill-lint.ts` and
      update the note beside the constants, which currently records this
      promotion as an obligation owed by this change
- [ ] 4.3 Update `AGENTS.md` → Skill Quality Bar: S9–S12 are no longer "WARN
      until the retrofit burns the debt down"
- [ ] 4.4 Add a unit row asserting a violating fixture now produces FAIL rather
      than WARN — the promotion is a behavior change and needs a test that would
      fail if it silently reverted
- [ ] 4.5 **Gate:** a deliberately violating skill fixture fails the gate, and
      the existing 51 skills still pass at 0 FAIL — proves *A new violation
      blocks once the baseline is empty* and *The gate stays advisory while debt
      remains* (by its absence: there is no debt left for it to apply to)
