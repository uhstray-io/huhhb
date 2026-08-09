## 1. Build the detection list

- [ ] 1.1 Author the detection table in `skills/memory-setup/reference.md`: one
      row per store, each naming its **detection method** — binary on `PATH`,
      registered MCP server, data directory, or config entry. MemPalace first,
      with its retired-from-routing status stated
- [ ] 1.2 Cover the stores an agent machine plausibly carries beyond MemPalace,
      and mark the list explicitly **open** — an unlisted store the operator
      names is carried through the same decision
- [ ] 1.3 Point phase 0's SKILL.md row at the table rather than inlining it —
      `memory-setup`'s body is near this repo's lint thresholds
- [ ] 1.4 **Gate:** every row names a runnable detection check, and running them
      on this machine correctly reports MemPalace present — proves *A store the
      operator forgot is still found*, *A detection result is traceable to its
      check*, and *A machine carrying MemPalace is told so*

## 2. Put the keep-or-replace decision to the operator

- [ ] 2.1 Replace phase 0's retire/migrate/alongside/abandon prompt with the
      sharper question: **keep alongside hindsight, or replace with hindsight**,
      asked per store found
- [ ] 2.2 Name replacement as the recommended answer where hindsight fills the
      same role, and keep "keep" a first-class outcome — the run must not
      disable, remove or degrade a store the operator chose to keep
- [ ] 2.3 Keep the phase-0 **STOP**: the run proceeds only on the operator's
      answer, never on a default
- [ ] 2.4 **Gate:** a dry walkthrough on this machine stops at phase 0, presents
      MemPalace, and continues only on an answer — proves *The human decides and
      the run stops for it* and *Keeping a store is a supported outcome*

## 3. Record the answer where routing can honour it

- [ ] 3.1 Make phase 3's routing-policy block parameterised by the phase-0
      answers: a kept store is named as secondary to hindsight with a "when to
      reach for it" line; a replaced store is recorded as replaced
- [ ] 3.2 A replaced store is written down as replaced, not omitted — omission
      cannot be told apart from an oversight by the next reader
- [ ] 3.3 On re-run, present the recorded decision as current state and change it
      only on an explicit instruction; `memory-setup` is idempotent and this must
      not become the exception
- [ ] 3.4 **Gate:** running twice with the same answers produces a byte-identical
      routing block, and a kept store appears in it by name — proves *A kept
      store appears in the routing policy*, *A replaced store is recorded as
      replaced*, and *A re-run does not re-litigate a recorded decision*

## 4. Close out

- [ ] 4.1 Confirm phases 1 and 2 are untouched: codebase-memory-mcp and hindsight
      remain unconditional installs. This change alters what the survey finds and
      does with the answer, never what gets installed
- [ ] 4.2 Verify `skills/memory-setup/SKILL.md` is still within its lint budget
- [ ] 4.3 **Gate:** `node scripts/skill-lint.ts` 0 FAIL, `node --test
      tests/*.test.ts` green, `openspec validate --all --store huhhb` green, and
      every scenario in `specs/memory-store-survey/spec.md` exercised above
