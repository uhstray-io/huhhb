---
name: pr-shepherd
description: Use when an orchestrating session has open PRs that need driving from creation through merge and cleanup, the terminal step once PRs are open. Triggers on "shepherd this PR", "drive the PR to merge", "babysit the PRs", "monitor the PR to merge", and post-merge close-out (close linked issues, close out the Plane item, remove the worktree, janitor stale branches in the orchestrator's own prefix). Also load to verify PR-lifecycle preconditions (branch protection, CodeRabbit) before shepherding.
---

# pr-shepherd

The terminal step of an orchestrating session's development workflow. Any agent that opens PRs can run it. It begins where that workflow ends — its PRs are open — and finishes with each PR merged through the Merge gate below, its issues closed, its Plane item closed out, its worktree removed, and stale branches janitored.

Shepherding is run by the orchestrating session itself; only fix-work is dispatched. Two kinds of step appear below:

- **Orchestrator** — the orchestrating session runs it itself (Skill tool, `gh`, `git`). Never dispatch pr-shepherd itself to a sub-agent.
- **Dispatched** — the orchestrating session sends a fix task to a worker through its own dispatch mechanism.

## Position in the review pipeline (fixed — do not reorder)

| # | Stage | When | Owner |
|---|-------|------|-------|
| 1 | Review round: CodeRabbit, or a fallback reviewer agent when CodeRabbit is unavailable | after PR creation, and again on each new head | the reviewer |
| 2 | **pr-shepherd** | PR creation → merge → cleanup | the orchestrating session |

pr-shepherd does not run the review itself; it monitors review output and routes what it surfaces.

## Preconditions — refuse to operate if unmet

Check all three before shepherding anything. The first is a hard gate
(safety, not conformance — it applies on every repo); the second and
third are warn-and-continue.

1. **The default branch requires a pull request.** This is the mechanism-layer backstop: if the branch accepts direct pushes, the skill's own gate is not enough.
   ```bash
   gh api repos/{owner}/{repo}/rules/branches/{branch} \
     --jq '[.[] | select(.type=="pull_request")] | length'
   ```
   A non-zero count passes. Zero or an error: check classic protection with
   `gh api repos/{owner}/{repo}/branches/{branch}/protection --jq '.required_pull_request_reviews != null'`,
   which passes on `true`. Neither passes: **STOP**, tell the human the default
   branch does not require a PR, and do not shepherd. Changing branch rules is
   the human's call.
2. **GitHub "Automatically delete head branches" is OFF** — check
   `gh api repos/{owner}/{repo} --jq .delete_branch_on_merge` (must be
   `false`; UI: Settings → General → Pull requests). Else the retention
   policy below is void. `true` → warn with that path and continue.
3. **`.coderabbit.yaml` present.** If absent, warn that PR coverage is reduced
   (stage 1 above is weakened) and continue.

## Lifecycle per PR

Run this per open PR. Fan out across the PRs concurrently — monitoring is
cheap and independent — but the merge gate and post-merge steps run
per-PR, in order.

| # | Step | Kind | Gate / output |
|---|------|------|----------------|
| 1 | **Preflight** | Orchestrator | Preconditions above pass |
| 2 | **Monitor** | Orchestrator | Watch `gh pr checks <pr>`, review rounds and review threads through the orchestrator's wake mechanism (a timer, a monitor or a notification) — **never busy-poll**. End the turn; wake on the notification |
| 3 | **Triage findings** | Orchestrator | Turn each CI failure and each review finding into a scoped fix task. Two reviewers contradict each other → decide before dispatching |
| 4 | **Fix** | Dispatched | Send it to the **original implementer** (same worktree, branch and PR) so it updates its existing PR. A fresh worker has no memory of the task — never do that |
| 5 | **Re-review** | Reviewer | A push makes a new head, and the new head needs a new review round (Merge gate (c)). The reviewer surfaces findings, never edits |
| 6 | **Escalation gate** | Orchestrator | 2-attempts-then-human (below). No autonomous attempt #3 |
| 7 | **Merge gate** | Orchestrator | All five conditions below hold |
| 8 | **Post-merge close-out** | Orchestrator | The ordered checklist below |
| 9 | **Branch janitor** | Orchestrator | Once per run, confined to the orchestrator's own prefix (below) |

## Escalation rule

Per PR finding-set:

```
attempt 1 (original model)  ──findings persist──▶  attempt 2 (same model)
attempt 2 findings persist  ──────────────────▶  escalate to the human and WAIT
```

**No autonomous attempt #3.** After the second failed fix pass, stop, hand
the human the specifics (the persisting findings + both diffs), and wait for
direction. Do not open a third fix-task on your own.

## Merge gate

The orchestrating session merges a PR **only** when ALL of these hold on the PR's current head:

- **(a)** checks are green — `gh pr checks <pr>` all pass;
- **(b)** no review thread is unanswered — every finding is fixed and pushed, or answered on the PR with the reason it was not changed;
- **(c)** the review rounds are complete on the final head: one round for a PR into a feature or integration branch, two for a promotion into the default branch. A round is a CodeRabbit review, or a fallback reviewer agent's review when CodeRabbit is unavailable. A round on an earlier commit does not count: a push after it needs a new round;
- **(d)** the last round on the final head asked for no changes;
- **(e)** version reconciled: if `main`'s manifest version moved past this
  PR's claim, re-bump to the next free number (final pre-merge commit)
  per AGENTS.md's Release Checklist. Docs/CI-only PRs carry no bump — skip (e).

Merge with a merge commit, bound to the head the rounds reviewed:

```bash
gh pr merge <pr> --merge --match-head-commit <full head sha>
```

Never `--squash` or `--rebase`; `--admin` only with the human's approval for
that one merge. If any of (a)–(e) is missing, do not merge; report which one
is missing and wait.

## Post-merge close-out — in this order

1. **Close linked issues.** Verify each `Closes #N` actually resolved; if
   GitHub didn't auto-close it, close it manually with a reference to the
   merge commit.
2. **Close out the Plane item** with the `plane-work-tracking` skill's close-out
   (work log, outcome comment, state, relations, read back), before step 4
   removes the worktree. Skip when the repo has no Plane project.
3. **Write the outcome** per repo-memory § Hooks — recall
   the bank FIRST; if this branch's outcome is there, the PR hook wrote it, so
   stop. Else ONE `sync_retain` (`bank_id` per repo-kickstart §0): what merged,
   finding counts, escalations, outcome labelled **worked / dead end /
   corrected**. Journal folds in; delete only after `completed`. No bank →
   `repo-memory` record.
4. **Remove the worktree** for the merged task:
   ```bash
   git worktree remove .worktrees/<task_id>
   ```

## Branch retention & janitor

**Retention, not deletion-on-merge.** A merged branch is kept even when
inactive. A branch is deleted **only** after **90 days with no commits** AND
only if it is already **merged into the default branch** — an unmerged stale
branch may hold recoverable work, so it is skipped and reported, never
force-deleted.

Each pr-shepherd run does one janitor pass, confined to the ORCHESTRATOR'S
OWN branch prefix via one validated `ORCHESTRATOR_PREFIX` variable
(default `agent`; never a bare `refs/heads/`). The guard is
structural AND atomic: only that prefix is enumerated; no resolvable
`origin/HEAD` default → the pass deletes nothing (fail closed); deletion
is compare-and-delete on the inspected object id, so a moved branch
survives; success logs only on actual deletion.

The runnable script lives in `references/janitor.md`.

Log every deletion (branch + age) and every skipped-unmerged branch via the
`repo-memory` skill (`.claude/memory/`). **Never janitor a branch outside the
`$ORCHESTRATOR_PREFIX/*` namespace, and never force-delete an unmerged branch.**

## Dry-run — a 3-PR fanout (acceptance narrative)

A full worked example — 3 PRs through monitor → fix → merge-gate → post-merge
→ janitor, demonstrating correct ordering, 2-attempts-then-human escalation,
a merge blocked until a review round on the current head asks for no changes,
the post-merge checklist, and the janitor deleting only
merged+inactive `agent/*` branches — lives in
[references/dry-run.md](references/dry-run.md).

## Red flags — STOP

- About to merge when the last review round is on an earlier commit → **stop.** A push after the round needs a new round.
- About to merge with an unanswered review thread, or after the last round asked for changes → **stop.** No "checks are green so it's fine."
- About to merge with `--squash` or `--rebase` → **stop.** Merge commits only.
- A third autonomous fix attempt → **stop and escalate** instead.
- Busy-polling `gh pr checks` in a loop → wait on a timer, a monitor or a notification.
- Any branch delete where the name doesn't start with `$ORCHESTRATOR_PREFIX/` → **stop.**
- Force-deleting a stale branch that isn't merged into the default branch →
  **stop**, skip and report it instead.
- Deleting a merged branch that's <90 days inactive → retention, not
  deletion-on-merge.
