## Why

`repo-kickstart` scaffolds a planning layout that has since diverged from how
this repo actually works, and one component of it is a second tracker that
demonstrably drifts.

`plans/development/00-implementation-plan.md` is a hand-maintained index of
changes — slug, title, status, owner, links. `openspec list` already reports the
first three. On 2026-08-08 the index read `product-inception-layer | proposed`
for a change that was 24 of 25 tasks done and had been merged six days earlier.
Two trackers over one fact disagree eventually, and the merely-written one goes
stale.

`promote-adr.ts` does not merely update that index — it **depends** on it. Step 4
flips the row and, when no row exists, prints `FAIL` and exits 1. Any repo
kickstarted without an index therefore fails its first archive.

Two smaller gaps sit alongside: `plans/product` appears in the README templates
and in the verification checklist, but not in the `mkdir` that creates the tree —
so the checklist can fail on a step the scaffold never performed. And OpenSpec is
detected-and-skipped when absent (`command -v openspec || echo "skipped"`) rather
than surfaced as something the operator must resolve.

## What Changes

- **Remove** `00-implementation-plan.md` from what `repo-kickstart` seeds. Change
  status lives in `openspec list`; there is no second copy to keep in sync.
- **Narrow `promote-adr.ts` to ADR ownership**: it writes the record at
  `plans/architecture/YYYY/YYYY-MM.md`, the year `INDEX.md` row, and the master
  `DECISIONS.md` row. It no longer reads or writes any implementation plan, and
  the missing-row failure path is deleted rather than made conditional.
  **BREAKING** for any caller relying on the status flip.
- **Complete the plans layout**: `plans/development/` (with `openspec/` inside it
  and the store registered), `plans/architecture/`, `plans/product/` — all three
  created, not just two. `plans/` is the house name; `plan/` is not a synonym.
- **OpenSpec presence is resolved, not skipped**: kickstart verifies the CLI is
  present and the root initialized; when the CLI is absent it reports what to run
  and stops that step rather than continuing silently. It does **not** install
  global software on the operator's behalf.

**Scope assumption, recorded rather than assumed silently:** this change removes
the index from *what kickstart scaffolds* and from *what promote-adr requires*.
It does **not** delete huhhb's own `plans/development/00-implementation-plan.md`.
That file currently carries the only change→ADR join in the repo, and retiring it
needs that join relocated first. Tracked as an open question in design.md.

## Capabilities

### New Capabilities

- `repo-bootstrap`: what a kickstarted repository guarantees — the planning tree
  that exists, the OpenSpec root and its registration, and the invariant that
  change status has exactly one home.

### Modified Capabilities

- `inception-adr-promotion`: two of its three requirements are defined by
  contrast with the index-flipping mode they sit beside. Source-file mode is
  currently specified as "SHALL NOT read or modify `00-implementation-plan.md`
  **in this mode** (the missing-row failure path MUST NOT fire)" — once no mode
  reads it and no such path exists, that carve-out describes a distinction that
  no longer exists. The documentation requirement likewise rests on "the
  canonical four-writer index enumeration is unchanged".

## Impact

- `skills/repo-kickstart/SKILL.md` and `reference.md` — the seeded file list, the
  `mkdir`, and the verification checklist. **Constraint:** the SKILL.md body is
  10,900 characters against a 12,000 FAIL threshold, so net additions belong in
  `reference.md`.
- `skills/openspec-conformance/promote-adr.ts` — delete the index block and the
  missing-row exit path; its "Index writers" documentation goes with them.
- `skills/openspec-conformance/SKILL.md` — the four-writer index enumeration.
- `tests/test_openspec_conformance.test.ts` — 11 passing cases today, several of
  which assert index behavior that is being removed.
- `plans/development/openspec/specs/inception-adr-promotion/spec.md` — also
  carries a leftover `TBD` Purpose placeholder from the archive; corrected here
  since this change already edits that capability. The other three archived specs
  have the same placeholder and are **not** in scope.
- Repos already kickstarted keep their index files; nothing migrates them.

## Rollback Plan

Each piece reverts independently, and none of them destroys data.

- **`promote-adr.ts`** — revert the commit. The index block is deletion-only, so
  restoring it restores the old behavior exactly, including the exit-1 path.
- **Kickstart's seeded list** — revert. Repos scaffolded in between simply lack an
  index file; running the older skill version adds one, since kickstart is
  idempotent and non-destructive by contract.
- **Layout changes** — `mkdir -p` is idempotent and creates only empty
  directories plus READMEs. Nothing is moved or deleted, so a revert leaves a
  harmless empty `plans/product/`.
- **Ordering is the real risk, not reversibility.** Removing the index from
  kickstart while `promote-adr.ts` still requires a row breaks the first archive
  in every newly-kickstarted repo. The two land together, or the script change
  lands first — never the reverse. Tasks are ordered accordingly and the phase
  gate names it.
