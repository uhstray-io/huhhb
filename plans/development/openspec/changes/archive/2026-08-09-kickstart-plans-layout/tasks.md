## 1. Narrow promote-adr.ts to decision records

First, and alone-safe: a repo that still has an index simply stops having its row
flipped. Doing this after phase 3 instead would break the first archive in every
newly-kickstarted repo.

- [x] 1.1 Rewrite the affected cases in `tests/test_openspec_conformance.test.ts`
      first — assert that a run in a repository with **no** implementation-plan
      index exits 0 and writes the ADR plus both index rows. The suite is 11 green
      cases today and several assert the behavior being deleted; watch them fail
      before deleting anything
- [x] 1.2 Delete the index block from `skills/openspec-conformance/promote-adr.ts`:
      the `indexPath` constant, the row-flip section, and the `!rowFound` →
      `console.error` + `exit 1` path. Delete it rather than gating it — a
      `--no-index` flag leaves two behaviors and a decision at every call site
- [x] 1.3 Update the script's header comment, which currently enumerates four
      steps ending in the implementation-plan flip
- [x] 1.4 **Gate:** `node --test tests/test_openspec_conformance.test.ts` passes,
      and a promotion run against a fixture repo with no index exits 0 — proves
      *No mode consults an implementation-plan index* and *One writer owns
      decision records, and owns nothing else*
      → RED first: removing the index from the fixture failed 9 of 12 cases on
      the old `exit 1`. After the deletion: 12/12, full suite 231 pass, and a
      live fixture promotion in an index-less repo exits 0 with both index rows
      written

## 2. Reconcile the documentation that describes the script

- [x] 2.1 `skills/openspec-conformance/SKILL.md` — rewrite the "Inception
      promotion" subsection to describe `promote-adr.ts` as owning decision
      records only, and remove the four-writer index enumeration
- [x] 2.2 Search the repo for surviving references to the index as a required
      artifact (`AGENTS.md`, `skills/pr-shepherd/`, `skills/repo-memory/`) and
      correct each; a stale instruction to add a row is worse than none, because
      it sends an agent to edit a file that no longer exists
- [x] 2.3 Fix the `TBD` Purpose placeholder in
      `plans/development/openspec/specs/inception-adr-promotion/spec.md` by
      editing the main spec directly — a Purpose is not changed through a delta.
      Note in the PR that the other three archived specs carry the same
      placeholder and are out of scope
- [x] 2.4 **Gate:** no file instructs a reader to write or maintain an
      implementation-plan index row — proves *No stale index guidance survives*

      → openspec-conformance SKILL.md + reference.md, pr-shepherd SKILL.md +
      dry-run.md, product-inception, KICKSTART.md all corrected; the seed
      template `templates/00-implementation-plan.md` deleted. The conformance
      probe in pr-shepherd and product-inception now tests the store root, not
      the index. Remaining hits are deliberate: buhhdy (out of scope, being
      removed), the script's historical note, the tests' absence-assertions and
      sentinel, two main specs whose references are conditional (`WHEN … exists`)
      or historical, and huhhb's own README which truthfully describes the index
      this change deliberately keeps
## 3. Stop seeding the index

Safe only after phase 1.

- [x] 3.1 Remove `plans/development/00-implementation-plan.md` from the seeded
      file list in `skills/repo-kickstart/SKILL.md` and from its template and
      verification-checklist rows in `reference.md`
- [x] 3.2 State the replacement explicitly where the seeded list lives: change
      status comes from `openspec list`, and the repository keeps no second
      register. A removal with no stated replacement reads as an oversight and
      invites someone to add it back
- [x] 3.3 **Gate:** a kickstart dry-run on a scratch repository produces no index
      file, and an `openspec archive` in that repository completes — proves
      *Kickstart seeds no change index* and *Archiving succeeds without an index*

      → **partially verified.** The artifacts are correct: zero index references
      in either kickstart file, and phase 1 proved `openspec archive` +
      promotion complete with no index (live fixture, exit 0). A full kickstart
      dry-run on a scratch repo was NOT executed — repo-kickstart is an agent
      skill, not a script, so it cannot be invoked from a test harness here
## 4. Complete the plans layout

Independent of phases 1–3; may land in any order relative to them.

- [x] 4.1 Add `plans/product` to the `mkdir -p` in `reference.md` — it is asserted
      by the verification checklist but never created by the scaffold
- [x] 4.2 State that `plans/` is the house name and that `plan/` is not a synonym.
      Where a repository already keeps planning documents under a different name,
      the run **reports** the divergence and creates no second tree
- [x] 4.3 **Gate:** a kickstart run on an empty scratch repository produces all
      three directories with READMEs, and its verification checklist passes with
      no row asserting something the scaffold did not create — proves *All three
      directories exist after a run* and *A differently-named tree is reported,
      not merged into*

      → **partially verified.** `mkdir -p plans/development plans/architecture
      plans/product` now creates all three, and the `plans/`-is-the-house-name
      rule with report-don't-merge is stated in SKILL.md §2. The end-to-end
      scratch-repo run was not executed, same reason as 3.3
## 5. Resolve OpenSpec presence instead of skipping it

- [x] 5.1 Replace the detect-and-skip line so an absent CLI reports the OpenSpec
      steps as **unresolved**, names the install command, and does not let the
      verification checklist report the repository as conformed
- [x] 5.2 Keep the existing init and `store register` steps unchanged — both are
      already idempotent and correct
- [x] 5.3 Do **not** add an install path. Kickstart is idempotent and
      non-destructive by contract; installing a global package is neither, and it
      fails in ways a scaffolder cannot recover from
- [x] 5.4 **Gate:** with the CLI hidden from `PATH`, a run reports the OpenSpec
      steps unresolved and installs nothing; with it present, init and
      registration are idempotent across two runs — proves *Absent CLI stops the
      step and says why*, *Installation stays the operator's decision*, and *An
      already-registered store is not duplicated*

      → **partially verified.** The detect-and-skip line is replaced by an
      `UNRESOLVED` message naming the install command; init and `store register`
      are untouched and already idempotent; no install is performed — the only
      `npm install -g` in the file is inside that message. The PATH-hidden run
      was not executed, same reason as 3.3
## 6. Close out

- [x] 6.1 Verify `skills/repo-kickstart/SKILL.md` is still under the 12,000-char
      FAIL threshold — it was 10,900 before this change, and net additions were
      meant to land in `reference.md`
- [x] 6.2 Run the full gate set: `node scripts/skill-lint.ts` (0 FAIL),
      `node --test tests/*.test.ts`, `openspec validate --all --store huhhb`
- [x] 6.3 Record in the PR that huhhb's own `00-implementation-plan.md` is
      deliberately untouched, and that retiring it needs the change→ADR join
      relocated first — so a reviewer does not read its survival as an oversight
- [x] 6.4 **Gate:** all three gates green and every scenario in
      `specs/repo-bootstrap/spec.md` and `specs/inception-adr-promotion/spec.md`
      is exercised by a gate above
      → gates: `skill-lint` 53 skills / 0 FAIL / 21 WARN · `node --test` 231
      pass / 0 fail · `openspec validate --all --store huhhb` 19/19.
      `specs/inception-adr-promotion` scenarios all exercised by 1.4 and 2.4.
      `specs/repo-bootstrap`: the two index scenarios and the promotion scenario
      are proven; the three-directory, differently-named-tree, absent-CLI and
      already-registered scenarios are verified by artifact only — see 3.3
