# Implementation Plan — living index

The index over active OpenSpec changes under `openspec/changes/`. One row per
change; the change's own `tasks.md` is the task detail, not this file.

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
| _(none yet)_ | | | | |

_Status: proposed · in-progress · in-review · archived._

## Open conformance gaps

- **Branch protection on `main`** — not configured (GitHub returns 404). The
  human must enable required PR reviews (precondition for pr-shepherd). Commands
  in [KICKSTART.md](../../KICKSTART.md#branch-protection-one-time-admin).
