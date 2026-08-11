## 1. Close the curation gap

Highest value and lowest uncertainty: the policy already states the need and
names no remedy.

- [ ] 1.0 **Create a scratch bank first, and probe only there.** `clear_memories`
      and `invalidate_memory` are destructive, the project bank holds the only
      copy of everything in it, and this change's design says existing data is
      not altered while its proposal calls rollback documentation-only — three
      claims that cannot all survive a probe against the live project bank.
      Name the scratch bank, seed it with throwaway memories, and record how it
      is torn down
- [ ] 1.1 Establish what each curation operation actually does **in that scratch
      bank** — `invalidate_memory`, `update_memory`, `clear_memories`,
      `list_memories`, `list_tags`. Verify behaviour rather than inferring it
      from names; this repo has already been bitten by a store where `tags` do
      not filter and a `PUT` silently updates
- [ ] 1.1a **Gate:** the project bank's fact count and a spot-checked recall are
      unchanged from before the probes. A destructive probe that ran against the
      wrong bank is not recoverable, so this is checked rather than assumed
- [ ] 1.2 Add the correction path to the routing policy: which operation retires
      a wrong memory, which amends a stale one, and the situation each is for
- [ ] 1.3 Distinguish correcting from deleting explicitly — a memory that is out
      of date should not lose its reasoning to a fix
- [ ] 1.4 Point `skills/repo-memory/` and `skills/fix-memory/` at the path where
      they describe retiring or migrating a record, rather than restating it
- [ ] 1.5 **Gate:** an agent following the policy alone can retire a wrong memory
      and amend a stale one, and the two are not confusable — proves *A wrong
      memory can be retired by an agent following the policy* and *Correction is
      distinguished from deletion*

## 2. Evaluate mental models

- [ ] 2.1 Exercise the family **in the scratch bank from 1.0**, never the project
      bank — create, refresh, list, get, update, clear — and record what a mental
      model *is* here as opposed to a retained memory. `clear_mental_model` and
      `delete_mental_model` are as destructive as their names suggest. Budget:
      model calls at roughly measured `reflect` cost
- [ ] 2.2 Decide adopt or decline, and write the answer into the policy either
      way. If adopted, state what belongs in a mental model versus a retained
      memory; the boundary is the whole value, and without it this becomes a
      second place to put the same fact
- [ ] 2.3 If adopted, name the concrete situation that triggers reaching for one
- [ ] 2.4 **Gate:** the policy answers "should I use a mental model here?" for a
      reader who has never used one — proves *Adoption is testable by its trigger*

## 3. Evaluate directives and documents

- [ ] 3.1 Establish what `create_directive` / `list_directives` do relative to a
      bank's `retain_mission`, which this project already uses and has measured
      as advisory rather than enforced
- [ ] 3.2 Establish what the document family stores that a memory does not
- [ ] 3.3 Adopt or decline each, with the reason recorded in the policy
- [ ] 3.4 **Gate:** every capability family the store exposes is accounted for as
      adopted-with-a-purpose or declined-with-a-reason — proves *A reader can
      tell a rejection from an oversight* and *A declined capability stays
      declined without re-litigation*

## 4. Keep it in one document

- [ ] 4.1 Land every adopted rule in the routing policy `memory-setup` writes.
      Do not create a hindsight skill for anything expressible as a rule — this
      repo has removed three duplicate-source-of-truth defects in the past week
      and a fourth would be self-inflicted
- [ ] 4.2 If any capability genuinely needs a gated procedure rather than a rule,
      propose it as a skill in its own change and have the policy point at it —
      do not smuggle a skill into this one
- [ ] 4.3 Check the policy block against its own budget: it is injected into
      every session on the machines that install it, so an adopted capability
      must earn its tokens the same way a skill does
- [ ] 4.4 **Gate:** no new document restates any part of the routing policy, and
      the policy is no longer than its content justifies — proves *A rule extends
      the policy* and *A procedure earns a skill, and says why*

## 5. Close out

- [ ] 5.1 Record which families were declined and why, so the next reader of the
      tool list finds an answer rather than an open question
- [ ] 5.2 Record the measured cost of the evaluation, so a future re-evaluation
      can be budgeted rather than guessed
- [ ] 5.3 **Gate:** `openspec validate --all --store huhhb` green, and every
      scenario in `specs/hindsight-usage/spec.md` exercised by a gate above
