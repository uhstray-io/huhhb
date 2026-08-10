## Why

`retire-mempalace` closed with **four of its eight spec scenarios verified
structurally rather than live**. The manifest registers no server, the four
skills carry their prerequisite and their corrected descriptions, and every one
of those facts is asserted by a test. What none of it proves is what a *loader*
does with those files, or what an *agent* does with those descriptions.

All four are blocked on one action: this branch installed into a real profile.

| Scenario | What is proven | What is not |
|---|---|---|
| A retired store's server is absent from a fresh install | the manifest registers nothing, in both places | that a fresh install therefore registers nothing |
| Invoking a legacy skill without its server fails legibly | the wording exists and is reachable | that it is what a user actually meets |
| A current-system phrasing routes to the current system | the four no longer claim those phrasings | where those phrasings actually go |
| A retired skill is reachable by name | all four carry an explicit by-name trigger | that naming it reaches it |

This is not unique to MemPalace. The same missing action blocks
`skill-authoring-standard`'s unrun live bench and every trigger figure this repo
has ever produced. The pattern is worth a capability rather than a note: a claim
that can only be checked after release should be *marked* as such, checked when
the release exists, and written back to the change that made it.

The alternative is what already happened once here — `a7d2a4a` was believed to
have retired four skills and had not, for eight days, because nobody checked the
surface a runtime reads.

## What Changes

- **New**: the four partial scenarios are verified against a **published**
  huhhb, installed from the marketplace after this work merges — not against a
  working tree, and not against a hand-assembled cache.
- **New**: the result is written back into the `retire-mempalace` change, so its
  scenario table stops reading "partial" or records why it still does. That
  change is **active** as this is written, not archived; task 4.0 requires
  archiving it first and naming the resulting dated path, because writing to an
  archived path that does not exist yet just creates a second copy.
- A failed check **reopens the claim** — but only once it is attributed. If a
  fresh install still registers the server, or a retired skill still answers to
  "remember this", that is a defect in `retire-mempalace` rather than an
  observation about it. **First establish which copy answered.** This machine
  carries ~50 untracked auto-loading skills in `.claude/skills/`, which no
  install replaces; a retired skill firing from that copy is contamination, and
  the run is recorded void or partial for that phrasing rather than reopening a
  change that shipped correctly. Only a failure attributable to the *installed*
  artifact is a defect.
- The verification procedure is recorded where the next post-release check can
  reuse it, because this repo's install mechanics are documented as hostile:
  `plugin install` reports success and does nothing, `plugin update` reads a
  stale catalog, and `marketplace update` resets the clone to `main` and deletes
  the branch under test.

**Sequencing — this change cannot start until the work is released.** Push, PR,
human merge, then the marketplace carries it. That ordering is the point, not an
inconvenience: verifying against anything earlier verifies a different artifact.

## Capabilities

### New Capabilities

- `release-verification`: how this project treats a requirement it cannot check
  before release — how such a requirement is marked, when it is checked, against
  what artifact, and what happens to the originating change when the check
  fails.

### Modified Capabilities

None. `memory-routing`'s requirements are unchanged; this change proves four of
them rather than altering any.

## Impact

- The `retire-mempalace` change, once archived (task 4.0 — it is active today) —
  its scenario coverage table is
  updated in place with the live result. This is the one case where writing into
  an archived change is correct: the archive records what was proven, and the
  proof arrived late.
- No production code, no skills, no manifest. If this change edits any of those,
  it has found a defect and that fix belongs to a change of its own.
- **Cost:** one real install plus a handful of prompts. Trigger figures carry the
  `.claude/skills/` contamination caveat, which no install fixes.
- **Adjacent, deliberately not absorbed:** `skill-authoring-standard`'s live
  bench and its `3.6` reload check are blocked on the same install. Doing them in
  the same sitting is sensible; folding them into this change is not, because a
  bench run costs money and this does not.

## Rollback Plan

Nothing to roll back in the usual sense — this change verifies rather than
alters. Its outputs are a recorded result and, if a check fails, a defect report.

- **A wrong result recorded** is the real risk: writing "verified" against a
  check that did not actually run, or that ran against the wrong artifact. That
  is why each task names the artifact under test and requires the installed
  version to be read back and matched against the expected release.
- **If the install itself is wrong** — a stale cache, a branch that self-reverted
  to `main` — every result is void. The first task exists to prove the installed
  version *is* the released one before any scenario is checked.

Reverting the recorded result restores the archived change's "partial" status,
which is the honest default and costs nothing.
