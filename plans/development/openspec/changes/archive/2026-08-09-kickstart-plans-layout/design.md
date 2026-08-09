## Context

See proposal.md — Why. The design-relevant state, measured:

- `promote-adr.ts` reads `join(plansDir, "development", "00-implementation-plan.md")`,
  flips the matching row, and on `!rowFound` prints `FAIL` and `process.exit(1)`.
  Source-file mode already short-circuits before that block.
- `tests/test_openspec_conformance.test.ts` — 11 cases, green. Several assert
  index behavior directly.
- `repo-kickstart/SKILL.md` body is **10,900 chars** against a 12,000 FAIL
  threshold; `reference.md` is 889 lines.
- `reference.md:341` is `mkdir -p plans/development plans/architecture`, while
  `reference.md:822` verifies `plans/product/README.md` exists.
- OpenSpec handling: `command -v openspec || echo "skipped — openspec not installed"`
  (detect) and `[ -f .../config.yaml ] || openspec init --tools none` (init).
- huhhb has both `plans/` (tracked) and `plan/` (gitignored, `.gitignore:5`).
  Another repo in this org uses `plan/` as its real tree — the same name means
  opposite things in two places.

## Goals / Non-Goals

**Goals:**

- One home for change status, so the drift that produced a six-day-stale
  `proposed` row cannot recur by construction.
- `promote-adr.ts` narrowed to one concern, so decision promotion never fails on
  the state of an unrelated file.
- A scaffold whose verification checklist asserts only what it creates.

**Non-Goals:**

- **Deleting huhhb's own `00-implementation-plan.md`.** It holds the only
  change→ADR join in the repo. See Open Questions.
- Migrating already-kickstarted repositories. Their index files stay; nothing
  reaches into them.
- Installing the OpenSpec CLI on the operator's behalf.
- Renaming or relocating any other repository's `plan/` tree. This change fixes
  what huhhb scaffolds, not what already exists elsewhere.

## Decisions

**Delete the index block outright rather than gate it behind a flag.** A
`--no-index` flag would leave two supported behaviors and a decision at every
call site. *Alternative rejected:* keep the block but downgrade the exit-1 to a
warning — that preserves the coupling while hiding its failure, which is worse
than either extreme.

**`plans/` is the house name; the divergence is reported, never merged.** When
kickstart meets a repository keeping plans under another name, creating `plans/`
beside it would produce two trees where one is real and one is empty — the same
two-sources defect this change exists to remove. *Alternative rejected:*
auto-migrate — moving another repo's planning tree is not a scaffolder's
decision.

**OpenSpec: verify and report, never install.** Installing a global package
touches state outside the repository, binds to whichever Node was active, and can
fail on permissions or PATH in ways a scaffolder cannot recover from. Kickstart
is idempotent and non-destructive by contract; `npm install -g` is neither.
*Alternative rejected:* install-if-missing behind a prompt — the prompt is the
tell that it does not belong in a scaffolder.

**Land the script change before or with the skill change, never after.**
Removing the index from what kickstart seeds while `promote-adr.ts` still
requires a row breaks the first archive in every newly-kickstarted repo. Task
ordering enforces this and the phase gate names it.

**Fix `inception-adr-promotion`'s `TBD` Purpose while editing that capability.**
The archive left placeholders in all four specs because none of the delta files
carried a `## Purpose`. Per the archive contract, a Purpose is corrected by
editing the main spec directly, not through a delta. Only the capability this
change already touches is in scope; the other three are noted, not fixed.

## Risks / Trade-offs

- **The change→ADR join disappears with the index.** Today the index row is the
  only place linking a change slug to its ADR number. The reverse link exists
  (ADR-0006 is titled `product-inception-layer`), so the information is not lost
  — but slug→ADR becomes a search rather than a lookup. → Accepted for
  newly-kickstarted repos, which have no such rows to lose. For huhhb, the join
  must be relocated before its own index is retired; that is the open question,
  not a silent consequence.

- **Tests assert behavior being deleted.** Removing the block will fail existing
  cases. → That is the correct signal, not collateral damage: those cases are
  rewritten to assert the *absence* of index coupling, which is what keeps the
  coupling from returning.

- **Kickstart grows while near a hard lint threshold.** → Net additions land in
  `reference.md`; the SKILL.md edit is roughly cost-neutral because the seeded
  file list loses an entry as the OpenSpec text gains one. The phase gate checks
  the number rather than trusting the estimate.

- **"Report the divergence" is easy to state and easy to implement as a silent
  no-op.** → The requirement's scenario is written so that a run which neither
  creates nor reports fails it.

## Migration Plan

No data migration. Rollout order is the whole plan:

1. `promote-adr.ts` narrowed, tests rewritten — safe alone, because a repo that
   still has an index simply stops having its row flipped.
2. `openspec-conformance` documentation follows the script it describes.
3. Kickstart stops seeding the index — safe only after step 1.
4. Layout and OpenSpec-verification changes — independent of 1–3, may land
   in any order relative to them.

Rollback is per-step and covered in proposal.md — Rollback Plan.

## Open Questions

- **Where does huhhb's own change→ADR join live once its index is retired?**
  Candidates: rely on the reverse link from the ADR title; add the change slug to
  the archived change's own metadata; or keep a minimal join that is generated
  rather than hand-maintained. This does not change this change's specs, approach,
  or tasks — huhhb's file is explicitly out of scope here — but it must be
  answered before a follow-on retires that file.
- **Do the other three archived specs get their `TBD` Purposes fixed together or
  individually?** A one-line fix each, no behavioral effect either way.
