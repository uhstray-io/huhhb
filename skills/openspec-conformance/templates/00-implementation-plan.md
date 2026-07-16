# Implementation Plan — living index

The index over OpenSpec changes under `openspec/changes/`, including archived
history. One row per change; the change's own `tasks.md` is the task detail,
not this file.

**Update rules (who writes this file):** the four writer roles are
canonically enumerated in `openspec-conformance` ("Index writers") —
kickstart SEEDS, W1 `to-issues` ADDS a row, W2 step 7 REFRESHES
status/links, and pr-shepherd's `promote-adr.ts` FLIPS a row to
`archived` (do not hand-edit the status/ADR link).

Keep the columns exactly as below — `promote-adr.ts` matches a row by its first
cell (the change slug) and edits the Status and Links cells in place.

| Change | Title | Status | Owner | Links |
|--------|-------|--------|-------|-------|
| <slug> | <one-line title> | proposed | @<owner> | [tasks](openspec/changes/<slug>/tasks.md) · #<issue> |

_Status: proposed · in-progress · in-review · archived._
