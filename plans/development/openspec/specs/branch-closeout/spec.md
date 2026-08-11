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
configured namespace, has been inactive for **more than** 90 days, and is
neither the default branch nor any other protected ref. These checks run BEFORE
any merge proof and define the run's *candidate set* — they are not checks a
candidate can fail.

The inactivity boundary is strict on purpose: at exactly 90 days a branch is
kept. `janitor.md` compares against `now - 90 days` and deletes only when the
last commit is strictly older, so an inclusive reading here would delete one
day's worth of branches the script keeps.

That candidate/failure distinction is a reporting contract, not pedantry. The
three disjoint sets a run reports partition the **candidates**, not every branch
in the repository. An ineligible branch belongs to none of them and is not
listed individually — this repository carries 37 local branches, most outside
any sweep namespace, and reporting them as "deliberately kept" would bury the
handful that were actually considered. To keep that honest, a run SHALL state
the scope it applied — the namespace, the cutoff and the protected refs — so
that "nothing deleted" from an empty candidate set is distinguishable from
"nothing deleted" because every candidate failed its proof.

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

#### Scenario: A branch inside the inactivity cutoff is not a candidate

- **WHEN** a branch's last commit is at, or newer than, the 90-day cutoff —
  exactly 90 days included, since the boundary is strict
- **THEN** it is not a candidate, regardless of whether it satisfies a merge
  proof

#### Scenario: A run states the scope it applied

- **WHEN** a close-out reports its results
- **THEN** it names the namespace, the inactivity cutoff and the protected refs
  it applied, so an empty candidate set cannot be read as a clean sweep

#### Scenario: An unusable namespace aborts the run

- **WHEN** the configured namespace prefix is empty, or contains a slash or a
  space
- **THEN** the run aborts before enumerating anything, rather than falling back
  to a wider scope

### Requirement: The protected-ref set is resolved explicitly or the run stops

The refs treated as protected SHALL be resolved at the start of a run from a
named authoritative source, and a run that cannot resolve that set stops before
any deletion. Protection that is merely assumed is not protection: an
unresolvable list degrades silently into an empty one, and an empty list guards
nothing while still reading as "protected refs were respected".

The default branch is resolved from `origin/HEAD` and is always in the set —
that resolution already fails closed. Any further protected refs come from the
remote's branch-protection rules; where the host cannot be queried, a run either
stops or proceeds against an explicitly supplied list, and its report SHALL say
which of the two happened. The `janitor.md` sweep does not yet perform this
resolution — it relies on the namespace scope alone — and gains it when this
capability is implemented.

#### Scenario: An unresolvable protected-ref set stops the run

- **WHEN** the protected-ref set cannot be resolved from its authoritative
  source
- **THEN** the run stops before any deletion, rather than continuing with only
  the refs it managed to resolve

#### Scenario: A run says how it resolved protection

- **WHEN** a close-out reports its results
- **THEN** it names the source the protected-ref set came from, so a sweep that
  fell back to a supplied list is distinguishable from one that queried the host

### Requirement: A deletion requires proof the work has landed

A branch SHALL NOT be deleted unless its work is demonstrably present in the
default branch. Two independent proofs are acceptable, and either alone is
sufficient: its tip is an ancestor of the default branch, or the file-level diff
between the default branch and the branch, restricted to the files the branch
itself changed, is empty.

The second proof exists because a rebased or cherry-picked branch carries no
ancestry to the commits that landed its content, yet has nothing left to lose.
Requiring ancestry alone would strand such branches forever.

**That second proof is only as sound as its inputs, so both are named and
recorded in the audit.** The *base* is the merge-base of the branch and the
resolved default branch. The *path set* is the files the branch changed relative
to that base — `git diff --name-only <base>..<branch>`. The proof is that
`git diff <default>..<branch> -- <path set>` is empty. Left undefined, the path
set is where this proof lies: under-approximate it and the restricted diff comes
back empty while unique work sits outside it, which reads exactly like a branch
that landed. Recording the base and the path set is what makes a deletion
reviewable afterwards instead of taken on trust.

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

**Re-deriving is necessary but not sufficient.** A revalidation that succeeds
and a deletion that follows are still two steps, and the default branch can be
force-pushed between them — the window shrinks but does not close. The deletion
SHALL therefore be a single ref transaction that verifies both the candidate's
recorded commit id *and* the default branch's, and fails as a unit if either has
moved. `git update-ref --stdin` expresses exactly this — `verify` the default
ref, `delete` the candidate, in one transaction — where a bare `git branch -D`
cannot, and where a compare-and-delete on the candidate alone leaves the ref the
proof depended on unguarded.

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

**A remote branch is deleted under the same rule.** `git push origin --delete`
compares nothing, so it removes a remote ref that moved after the audit —
somebody else's push, silently. Remote deletion SHALL carry the audited object
id as a lease (`git push --force-with-lease=refs/heads/<b>:<oid> origin
:refs/heads/<b>`), which refuses the delete when the remote ref no longer points
where the audit saw it. A run that cannot supply the lease SHALL exclude remote
deletion rather than perform it unguarded.

#### Scenario: The deletion verifies both refs as one transaction

- **WHEN** a branch approved for deletion is removed
- **THEN** the removal is a single ref transaction verifying both the
  candidate's and the default branch's recorded commit ids, so a force-push
  landing between revalidation and deletion fails the transaction rather than
  slipping through the gap between them

#### Scenario: A remote branch that moved since the audit is not deleted

- **WHEN** a remote branch approved for deletion no longer points at the object
  id recorded during the audit
- **THEN** the lease refuses the deletion, the remote branch survives, and the
  discrepancy is reported

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

Any **candidate** failing any check SHALL be skipped and reported rather than
forced. A close-out run SHALL report three disjoint sets — deleted, skipped with
reason, and deliberately kept — which together account for every candidate, so
that an incomplete sweep is visible rather than being mistaken for a clean one.
Branches that never became candidates are covered by the run's stated scope
rather than by these sets.

#### Scenario: An unresolvable default branch stops the run

- **WHEN** the default branch cannot be resolved from the remote at the start of
  a run
- **THEN** the run stops before any deletion occurs

#### Scenario: A partial sweep reports what it did not do

- **WHEN** a run completes with some items skipped
- **THEN** the report names each skipped item and the check it failed, and the
  run is not described as a complete close-out

### Requirement: Deleted work stays recoverable

A close-out SHALL preserve the recovery window for everything it deletes, and
SHALL state that window rather than implying one. The reflog is the safety net
this protocol depends on, so a close-out MUST NOT prune it, and the commit id of
every deleted branch is recorded in the run's report — the recorded id is the
part that does not expire.

**The window is shorter than the protocol's own numbers suggest.** A deleted
branch's tip becomes *unreachable*, so it is governed by
`gc.reflogExpireUnreachable` — **30 days** by default — and not by
`gc.reflogExpire`'s 90, nor by the 90-day inactivity threshold used to pick
candidates. Two unrelated 90s invite the reading that a deleted branch is
recoverable for 90 days. It is not. A run SHALL read the effective retention,
including any ref-specific override, and report the real figure; where it cannot
determine one, it SHALL describe recovery as best-effort rather than asserting a
window it has not checked.

#### Scenario: A branch deleted in error is restorable within the stated window

- **WHEN** a branch is deleted during a close-out and is later found to have been
  needed
- **THEN** its recorded commit id restores it, provided the run is inside the
  retention window the run itself reported

#### Scenario: An unverifiable retention window is reported as best-effort

- **WHEN** effective reflog retention cannot be determined for a run
- **THEN** the report describes recovery as best-effort and names the recorded
  commit ids, rather than stating a window it did not check

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
