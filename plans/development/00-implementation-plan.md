# Implementation Plan — RETIRED, historical only

> **This index is no longer maintained and nothing writes to it.** Change status
> has one home: the store. `openspec list --store huhhb` reports every change's
> name, status and task counts, derived from the changes themselves. Two records
> of one fact diverge, and the hand-maintained one is the one that goes stale —
> which is what happened here.
>
> It is kept as a **retired artifact** rather than deleted, because its rows
> carry links to archived changes and their ADRs that predate the store. Read it
> as history. Do not add rows, do not update statuses, and do not preserve its
> column shape for any tool.

The rows below index OpenSpec changes under `openspec/changes/` as of
retirement. The change's own `tasks.md` is the task detail, not this file.

**Who used to write it, and why none of them do now:**
- **buhhdy Workflow 1, step 8 (`to-issues`)** added a row when a change's tasks
  and tracker issues were cut. Superseded by the store.
- **pr-shepherd post-merge close-out** flipped the row to `archived` and
  appended the promoted ADR link, via `promote-adr.ts`. **`promote-adr.ts` no
  longer reads or writes this file at all** — it owns decision records and their
  two indexes and nothing else. A promotion that failed on a missing row made an
  unrelated file a precondition for writing a decision, so that coupling was
  removed rather than made conditional.

The columns below are frozen as they were at retirement. Nothing parses them —
the claim that `promote-adr.ts` matches a row by its first cell and edits the
Status and Links cells in place stopped being true when that code was removed.

| Change | Title | Status | Owner | Links |
|--------|-------|--------|-------|-------|
| product-inception-layer | BMAD-adapted product-inception layer (Workflow 0) | archived | joe | [tasks.md](openspec/changes/archive/2026-08-08-product-inception-layer/tasks.md) · [ADR-0006](../architecture/2026/2026-08.md) |
| voice-anatomy-layer | Voice anatomy for explaining-changes + user-kickstart profile skill | in-progress | joe | [tasks.md](openspec/changes/voice-anatomy-layer/tasks.md) |

_Status: proposed · in-progress · in-review · archived._

## Deferred follow-ups

Scoped-out work with a decision behind it. Each becomes its own OpenSpec change when
picked up — they are listed here rather than as table rows because no `changes/<slug>/`
exists yet, and a row without one is a broken link.

- **Downstream-conformance benchmark for `user-kickstart`** (deferred 2026-08-02 from
  `voice-anatomy-layer`). The change proves the write contract — idempotency, the
  60-line cap, marker-scoped preservation, audit honesty — and measures routing
  accuracy. It does **not** prove the interview produces a profile that actually
  changes downstream output, because that is a property of the block's *effect*, not
  its text: a block that reads well and changes nothing is a bad block.
  The design: define a ground-truth voice spec whose rules have mechanically observable
  signatures (leads with the conclusion, never contains a named banned word, sentences
  under 20 words, no emoji, ends with a next action); script a persona that answers the
  interview to that spec; install the produced block in a scratch CLAUDE.md; run N
  downstream probe prompts through it; grep-score conformance against a no-block control
  arm. The score is the conformance delta, which is objective rather than
  judge-dependent. A third arm with an adversarial persona — self-contradicting answers,
  rules the git history refutes, an over-cap answer set, a credential in a sampled
  commit message — exercises the audit, the cap, the keep/edit/drop gate, and redaction.
  **Why deferred:** `scripts/skill-bench.ts` is single-prompt, and this needs a
  two-stage harness (produce artifact → evaluate artifact). That is new tooling plus its
  own spec requirements, and folding it in would have pushed `voice-anatomy-layer` well
  past its scope.

## Open conformance gaps

- **Required approvals on `main`** — the `protect-main` ruleset is active (PR
  required, force-push and deletion blocked), but
  `required_approving_review_count` is `0`, so a PR can be self-merged with no
  approval — the pr-shepherd precondition is only half met. An admin must raise
  it to `1`; command in
  [KICKSTART.md](../../KICKSTART.md#branch-protection-one-time-admin).
  (The classic `/branches/main/protection` API returns 404 here — that is
  expected: this repo uses a ruleset, not classic protection.)
