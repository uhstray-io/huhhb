# branch-closeout Specification

## Purpose
Governs the deletion of merged branches, worktrees and stashes — what must be
proven before anything is removed, in what order removals happen, and what
happens when a proof cannot be produced — so that repository cleanup can never
be the reason work is lost.

> **[TARGET] — not yet true.** The protocol is specified but nothing implements
> or enforces it; the repository currently carries 37 local branches, 8
> worktrees and 2 stashes. Tracked by the `branch-closeout-protocol` change
> (no tasks yet). Do not reason as if these guarantees hold.

## Requirements

### Requirement: Only an eligible branch is a deletion candidate

A branch SHALL be considered for deletion only if it sits inside the sweep's
configured namespace, has been inactive for at least 90 days, and is neither the
default branch nor any other protected ref. These checks run BEFORE any merge
proof. A branch failing one is not skipped-with-a-reason; it is never a
candidate and is never examined.

Eligibility is separate from proof because **the merge proofs cannot exclude the
default branch on their own**. A tip is trivially an ancestor of itself, so the
default branch satisfies the ancestry proof; its diff against itself is empty,
so it satisfies the content proof too. Safety here rests on the scope check, not
on the proofs — which is exactly how the `janitor.md` prose this spec formalizes
stays safe: it enumerates only `refs/heads/<prefix>/` and re-asserts the
namespace per branch. A prefix that is empty, or contains a slash or a space,
aborts the run rather than silently widening its scope.

#### Scenario: The default branch is never a candidate

- **WHEN** a sweep enumerates branches
- **THEN** the default branch is excluded before any proof is evaluated, even
  though it satisfies both merge proofs

#### Scenario: A branch outside the namespace is never a candidate

- **WHEN** a branch does not sit under the configured namespace prefix
- **THEN** it is not examined and not deleted

#### Scenario: A recently active branch is kept

- **WHEN** a branch's last commit is newer than the 90-day inactivity cutoff
- **THEN** it is kept, regardless of whether it satisfies a merge proof

#### Scenario: An unusable namespace aborts the run

- **WHEN** the configured namespace prefix is empty, or contains a slash or a
  space
- **THEN** the run aborts before enumerating anything, rather than falling back
  to a wider scope

### Requirement: A deletion requires proof the work has landed

A branch SHALL NOT be deleted unless its work is demonstrably present in the
default branch. Two independent proofs are acceptable, and either alone is
sufficient: its tip is an ancestor of the default branch, or the file-level diff
between the default branch and the branch, restricted to the files the branch
itself changed, is empty.

The second proof exists because a rebased or cherry-picked branch carries no
ancestry to the commits that landed its content, yet has nothing left to lose.
Requiring ancestry alone would strand such branches forever.

#### Scenario: An ancestor tip is deletable

- **WHEN** a branch's tip is an ancestor of the default branch
- **THEN** the branch satisfies the merge proof and may be deleted

#### Scenario: A content-equivalent branch is deletable without ancestry

- **WHEN** a branch's tip is not an ancestor of the default branch, but the diff
  against the default branch over the branch's own changed files is empty
- **THEN** the branch satisfies the merge proof and may be deleted

#### Scenario: An unproven branch survives

- **WHEN** neither proof can be produced for a branch
- **THEN** the branch is skipped and reported, and MUST NOT be deleted

### Requirement: Deletion is atomic against the audited state

A branch SHALL be deleted only by comparing against the exact commit id recorded
when it was audited, so that a branch which moved between audit and execution
aborts rather than deleting the newer work. An audit and its execution are
separated in time, and this repository has twice had in-flight commits stranded
by acting on a stale picture.

**The default branch is pinned the same way.** A merge proof is a statement
about two refs, so recording only the candidate's commit id leaves the proof
true on paper while the ref it was proved against is rewritten underneath it — a
force-push or reset that drops the landed commits turns a valid proof into a
deletion of work that is no longer anywhere. Where the default branch has moved
since the audit, the run SHALL re-derive the proof against its current tip or
abort; it MUST NOT delete on the strength of the earlier proof.

#### Scenario: A branch that moved since the audit is not deleted

- **WHEN** a branch's current tip differs from the commit id recorded during the
  audit
- **THEN** the deletion aborts, the branch survives, and the discrepancy is
  reported

#### Scenario: A rewritten default branch invalidates the audited proof

- **WHEN** the default branch's tip differs from the commit id recorded during
  the audit
- **THEN** no deletion proceeds on the recorded proof — each proof is re-derived
  against the current default branch, or the run aborts and reports

### Requirement: A worktree is removed before the branch it holds

A branch checked out in a worktree SHALL have that worktree removed first. A
worktree with uncommitted changes MUST NOT be force-removed; it is skipped and
reported instead.

#### Scenario: A clean worktree is removed ahead of its branch

- **WHEN** a branch approved for deletion is checked out in a worktree with no
  uncommitted changes
- **THEN** the worktree is removed first, and only then is the branch deleted

#### Scenario: A dirty worktree stops the deletion

- **WHEN** a worktree holding a branch approved for deletion contains uncommitted
  changes
- **THEN** neither the worktree nor the branch is removed, and both are reported
  as skipped

### Requirement: A close-out fails closed

Any item failing any check SHALL be skipped and reported rather than forced. A
close-out run SHALL report three disjoint sets — deleted, skipped with reason,
and deliberately kept — so that an incomplete sweep is visible rather than being
mistaken for a clean one.

#### Scenario: An unresolvable default branch stops the run

- **WHEN** the default branch cannot be resolved from the remote at the start of
  a run
- **THEN** the run stops before any deletion occurs

#### Scenario: A partial sweep reports what it did not do

- **WHEN** a run completes with some items skipped
- **THEN** the report names each skipped item and the check it failed, and the
  run is not described as a complete close-out

### Requirement: Deleted work stays recoverable

A close-out SHALL preserve the recovery window for everything it deletes. The
reflog is the safety net the protocol depends on, so a close-out MUST NOT prune
it, and the commit id of every deleted branch is recorded in the run's report.

#### Scenario: A branch deleted in error is restorable

- **WHEN** a branch is deleted during a close-out and is later found to have been
  needed
- **THEN** its recorded commit id restores it, and the reflog still holds the tip

### Requirement: A stash carrying work becomes a branch before it is dropped

A stash SHALL NOT be dropped as cleanup while it carries work not present
elsewhere. Such a stash is first converted to a commit on a branch and taken
through the normal review path; only then is the stash dropped.

#### Scenario: A stash holding a real fix is preserved as a branch

- **WHEN** a stash contains a change that exists nowhere else in the repository
- **THEN** it is committed to a branch and proposed for review before the stash
  is dropped

#### Scenario: A stash of superseded work is dropped after confirmation

- **WHEN** a stash's contents are already present in the default branch or are
  confirmed unwanted
- **THEN** the stash may be dropped, and the confirmation is recorded in the
  report

### Requirement: A branch with an open proposal is never swept

A branch backing an open pull request SHALL be excluded from deletion regardless
of its merge proof, locally and on the remote. An open proposal is active work by
definition, and deleting its branch destroys the review in progress.

#### Scenario: An open PR protects its branch

- **WHEN** a branch satisfies the merge proof but has an open pull request
- **THEN** the branch is kept and reported as blocked by that proposal

### Requirement: An audit is valid only for the run it was taken for

A close-out SHALL act on an inventory taken against current repository state. A
previously recorded inventory MUST NOT be replayed, because branches merge and
are created between audits, and every verdict in a stale inventory is a claim
about a repository that no longer exists.

#### Scenario: A stale inventory is re-audited rather than replayed

- **WHEN** a close-out is executed from an inventory taken in an earlier session
- **THEN** every verdict is re-derived against current state before any deletion
