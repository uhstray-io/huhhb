---
name: project-repo-kickstart-2026-08-01
description: Outcome of the 2026-08-01 repo-kickstart conformance run on huhhb — what was already conforming, the two gaps found, and why the branch-protection check reads 404
metadata:
  node_type: memory
  type: project
  kind: outcome
  status: active
---

2026-08-01: huhhb re-kickstarted against Uhstray conventions (huhhb plugin
v0.6.18, Node/JS stack). Ten of twelve checklist items were already
conforming and were left untouched — convention files, the plans tree,
the OpenSpec store (`huhhb`, registered, validates with zero changes),
`.coderabbit.yaml`, and the `.claude/memory/` store (9 records, index
complete, 0 `promote: candidate`, no memory material under `plans/`).

Two gaps were real:

`.githooks/` had shipped with both hooks present but `core.hooksPath` was
never set, so the repo-memory post-commit capture and pre-commit lint had
been silently inert — `.claude/memory/wip/` journals were not being
written for any commit on this machine. Set to `.githooks` during this
run. Because `core.hooksPath` is per-clone local config and not
committed, every fresh clone starts inert the same way; that makes it a
recurring kickstart finding, not a one-time fix.

Branch protection on `main` had been recorded as absent because
`gh api repos/.../branches/main/protection` returns 404. That reading was
wrong: the repo is governed by the **`protect-main` ruleset** (active
2026-07-18) — PR required, force-push and deletion blocked — and the
classic-protection endpoint returns 404 for ruleset-governed branches. The
genuine gap is narrower: the ruleset's
`required_approving_review_count` is `0`, so a PR can be self-merged with
no approval, leaving the pr-shepherd precondition half met. KICKSTART.md
and the plan index were corrected to say so, and both now warn against
layering classic protection on top of the ruleset.

evolve is configured (honcho mode, `uhstray` workspace) but its local
queue is backed up: 56 spooled observations, 23 quarantined by the
poisoning guardrail, 1 pending proposal, and an injection cache ~23 days
stale. Not a kickstart gap; noted because `project__huhhb` has no accrued
representation until that queue is triaged.
