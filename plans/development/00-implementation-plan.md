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
| _(none yet)_ | | | | |

_Status: proposed · in-progress · in-review · archived._

## Audits

- **2026-07-15 — org-wide fleet conformance audit** →
  [`audits/2026-07-15-fleet-conformance-audit.md`](audits/2026-07-15-fleet-conformance-audit.md).
  Read-only sweep of 29 active non-fork uhstray-io repos (+9 forks report-only).
  Headline: no repo has branch protection; only huhhb is conventions-complete.
  Human-run settings fixes: [`audits/2026-07-15-remediation.sh`](audits/2026-07-15-remediation.sh).

## Open conformance gaps

- **Branch protection on `main`** — not configured (GitHub returns 404). The
  human must enable required PR reviews (precondition for pr-shepherd). Commands
  in [KICKSTART.md](../../KICKSTART.md#branch-protection-one-time-admin).
  Confirmed org-wide by the 2026-07-15 audit above — **no** uhstray-io repo has it.
