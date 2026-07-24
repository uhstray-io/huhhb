## 1. ADR promotion mechanics (inception-adr-promotion)

- [x] 1.1 Add failing test cases to `tests/test_openspec_conformance.test.ts` for a source-file mode: promotes from an `architecture.md` `## Decisions` section, next-`NNN` numbering, per-slug idempotent re-run, exit 0 + note when no meaningful `## Decisions`, index file untouched (no missing-row failure)
- [x] 1.2 Run the tests, confirm they fail
- [x] 1.3 Implement `--from <file> --slug <slug>` mode in `skills/openspec-conformance/promote-adr.ts`, reusing the existing `section()`/`meaningful()`/`nextAdrNumber()` helpers and skipping the index-flip block
- [x] 1.4 Run `node --test tests/test_openspec_conformance.test.ts`, confirm all pass
- [x] 1.5 Add the "Inception promotion" subsection to `skills/openspec-conformance/SKILL.md` (invocation, `## Decisions`-only rule, immediate-on-approval timing, four-writer enumeration explicitly unchanged)
- [x] 1.6 Commit

## 2. product-inception skill (RED → GREEN per writing-skills)

- [x] 2.1 Write the three pressure scenarios: (a) "plan a new product", (b) small feature that must NOT trigger inception, (c) must stop at architecture and hand off, not generate stories
- [x] 2.2 Run all three WITHOUT the skill (baseline/RED); capture transcripts and verbatim rationalizations to the scratchpad
- [x] 2.3 Author `skills/product-inception/SKILL.md`: description with explicit-only triggers + route-away line, three human-gated phases (announce-at-start, terse, checklist-driven), single-phase entry, conformance degradation, epic-queue handoff terminal step (invokes promote-adr.ts source-file mode on architecture approval), "When NOT to use" with the minutes-vs-hours cost asymmetry, web-bundle manual path note; frontmatter per feedback-skill-frontmatter (no `triggers:` field)
- [x] 2.4 Author `skills/product-inception/reference.md`: trimmed brief/PRD/architecture templates (per design Decision 7, incl. Epic Queue section and `## Decisions`/`AD-N` structure) + BMad Method attribution note
- [x] 2.5 Re-run all three scenarios WITH the skill (GREEN); close any new rationalization loopholes and re-test
- [x] 2.6 Register the skill in `marketplace.json`/plugin manifest as existing skills are
- [x] 2.7 Commit with pressure-test evidence summarized in the message body

## 3. buhhdy wiring (workflow-0-inception)

- [x] 3.1 Add "Workflow 0 — Product Inception (opt-in, rare)" table to `buhhdy/skills/core-workflows/SKILL.md` above Workflow 1: analyst/PM/architect dispatched steps (claude_code COMPLEX, codex reviewer after each phase), explaining-plans on the architecture doc (codex primary, claude_code reviewer), buhhdy-level terminal handoff emitting the epic queue; intro line marking Workflow 0 exceptional
- [x] 3.2 Add the inception-vs-change routing block to `buhhdy/skills/routing-guide/SKILL.md` (explicit-request precondition, when-in-doubt-Workflow-1 tie-breaker)
- [x] 3.3 Add the matching short block to `buhhdy/config.yaml`'s Core Workflows section
- [x] 3.4 Append dated LD-3 decision record to `buhhdy/README.md` Planning Layout section (opt-in, terminates at architecture, OpenSpec sole change substrate, no story system; rejected alternative: BMAD wholesale — two sources of truth, ceremony cost, to-issues/pr-shepherd overlap)
- [x] 3.5 Commit

## 4. repo-kickstart seeding (inception-scaffold)

- [x] 4.1 Add `plans/product/` + README seeding to `skills/repo-kickstart/SKILL.md` step 2 and its `reference.md` templates (detect-before-write, idempotent, non-mandatory)
- [x] 4.2 Add one verification-checklist row for `plans/product/`
- [x] 4.3 Commit

## 5. Verification and close-out

- [x] 5.1 Dry run on a scratch repo: Workflow 0 end-to-end on a toy product — confirm three gated artifacts, immediate ADR promotion, termination at architecture, epic-queue handoff
- [x] 5.2 Continue the dry run: consume one epic via a normal Workflow 1 run into an OpenSpec change whose proposal links back to its PRD epic
- [x] 5.3 Run `evolve-map`; confirm the skill registers cleanly and reports no unflagged overlap with brainstorming/writing-plans/discovering-context
- [ ] 5.4 Open the batched PR(s) with test evidence; after human merge, archive this change (`openspec archive product-inception-layer --store huhhb`) and promote its ADR via pr-shepherd close-out
