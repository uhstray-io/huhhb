# Implementation Plan — living index

The index over OpenSpec changes under `openspec/changes/`, including archived
history. One row per change; the change's own `tasks.md` is the task detail,
not this file.

**Update rules (who writes this file):**
- **buhhdy Workflow 1, step 8 (`to-issues`)** adds a row when a change's tasks
  and tracker issues are cut — status `proposed`/`in-progress`, with links to the
  change's `tasks.md` and its issue number(s).
- **pr-shepherd post-merge close-out** flips the row to `archived` and appends
  the promoted `plans/architecture/NNN-<slug>.md` ADR link (via
  `promote-adr.ts` — do not hand-edit the status/ADR link).

Keep the columns exactly as below — `promote-adr.ts` matches a row by its first
cell (the change slug) and edits the Status and Links cells in place.

| Change | Title | Status | Owner | Links |
|--------|-------|--------|-------|-------|
| product-inception-layer | BMAD-adapted product-inception layer (Workflow 0) | proposed | joe | [tasks.md](openspec/changes/product-inception-layer/tasks.md) |

_Status: proposed · in-progress · in-review · archived._

## Open conformance gaps

- **Required approvals on `main`** — the `protect-main` ruleset is active (PR
  required, force-push and deletion blocked), but
  `required_approving_review_count` is `0`, so a PR can be self-merged with no
  approval — the pr-shepherd precondition is only half met. An admin must raise
  it to `1`; command in
  [KICKSTART.md](../../KICKSTART.md#branch-protection-one-time-admin).
  (The classic `/branches/main/protection` API returns 404 here — that is
  expected: this repo uses a ruleset, not classic protection.)
