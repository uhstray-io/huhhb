## Why

This repo carries **37 local branches, 8 worktrees and 2 stashes**. A close-out
was audited on 2026-07-18 and never executed, and the backlog has grown since.

The audit is not the durable artifact — it went stale the moment branches merged
and new ones appeared, and re-running it produces a different list every time.
What *is* durable is the protocol the audit was written against: the proof a
branch owes before it may be deleted, and the ordering that keeps a deletion from
stranding work. That protocol currently lives as prose inside a dated plan and
inside `skills/pr-shepherd/references/janitor.md`, where nothing enforces it.

This repo has already been bitten twice by deleting or merging against an
incomplete picture — PR #20 merged into a stale stacked base and never reached
main; PR #21 merged while a final review round was still landing, stranding its
last commit. Both were recoverable. The protocol exists so the third time is too.

## What Changes

- **New**: a specified close-out protocol — the conditions under which a branch,
  worktree or stash may be deleted, stated as requirements with scenarios rather
  than as a checklist in a dated plan.
- The protocol codifies four properties the 2026-07-18 audit applied by hand:
  - **Two independent proofs of merge**, not one: either the tip is an ancestor
    of `origin/main`, or the file-level diff against main over the branch's own
    changed files is empty (content-equivalence — how
    `refactor/buhhdy-memory-hierarchy` was cleared despite a non-ancestor tip).
  - **Compare-and-delete**, never a bare delete: capture the audited oid and
    delete atomically against it, so a branch that moved between audit and
    execution aborts instead of silently losing the move.
  - **Worktree before branch** — a checked-out branch is removed by removing its
    worktree first, and never with `--force` over uncommitted files.
  - **Fail closed** — anything that fails a check is skipped and reported, never
    forced. A close-out that cannot prove a branch is merged leaves it alone.
- Stashes are explicitly *not* cleanup: a stash carrying real work is converted
  to a branch and a PR before it is dropped.
- **Excluded from the spec**: the 2026-07-18 inventory itself. A list of branch
  names is an execution artifact with a shelf life measured in days; the
  protocol that generates a correct list on any given day is what belongs here.

## Capabilities

### New Capabilities

- `branch-closeout`: the safety protocol governing deletion of merged branches,
  worktrees and stashes — what must be proven before a deletion, in what order
  deletions occur, and what happens when a proof cannot be produced.

### Modified Capabilities

None. This store currently holds no main specs.

## Impact

- `skills/pr-shepherd/references/janitor.md` — the prose this spec formalizes.
  The spec becomes the source of truth; the reference points at it.
- No production code. This capability governs repository operations, so its
  "implementation" is the protocol being followed and, optionally, a script that
  performs the checks mechanically.
- Executing a close-out under this protocol will remove branches and worktrees.
  That is the point, and it is what makes the fail-closed and compare-and-delete
  requirements load-bearing rather than decorative.
- **Currently blocked from a full sweep**: PR #47 is still open, so
  `feat/evolve-r3-champion` and its `.worktrees/r3cc` worktree must survive. Any
  execution must re-audit rather than replay the 2026-07-18 verdicts.

## Rollback Plan

The protocol document itself reverts trivially — it is a specification, and
nothing depends on it at runtime.

Deletions performed *under* it are the real question, and the protocol is
designed so they stay reversible:

- **Branches** — `git reflog` retains deleted tips for 90 days, and the spec
  forbids `git gc --prune` during close-out precisely to preserve that window.
  A branch deleted in error is restored with `git branch <name> <oid>` using the
  oid the compare-and-delete step already recorded.
- **Worktrees** — removing a worktree deletes no commits; the branch is
  re-checkout-able.
- **Stashes** — the highest-risk item, because a dropped stash is not covered by
  the branch reflog in the same obvious way. This is why the spec requires a
  stash carrying real work to become a commit on a branch *before* it is dropped:
  the rollback is that the work was never only in a stash to begin with.

Nothing here touches `origin` until local deletions are proven, and remote
deletion skips any branch with an open PR.
