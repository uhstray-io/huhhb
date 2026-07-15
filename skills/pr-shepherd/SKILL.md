---
name: pr-shepherd
description: Use when buhhdy's Development workflow has open PRs that need driving from creation through merge and cleanup — the terminal step once PRs are open. Triggers on "shepherd this PR", "drive the PR to merge", "babysit the PRs", "monitor the PR to merge", and post-merge close-out (close linked issues, archive the change, remove the worktree, janitor stale buhhdy/* branches). Also load to verify PR-lifecycle preconditions (branch protection, CodeRabbit) before shepherding.
---

# pr-shepherd

The terminal step of buhhdy's Development workflow (Workflow 2). It begins
exactly where that workflow ends — the implementer PRs and the docs PR are
open — and finishes with each PR **merged under human authority**, its issues
closed, its change archived, its worktree removed, and stale branches
janitored. buhhdy never merges on its own authority: a merge happens only
once a human has BOTH approved the PR (a GitHub review) AND given an explicit
merge instruction — pr-shepherd then executes that merge and does the
cleanup. There is no autonomous-merge path.

Shepherding itself is **buhhdy-level orchestration**; only the fix-work is
dispatched. Two kinds of step appear below, same as buhhdy's `core-workflows`:

- **buhhdy-level** — buhhdy runs it itself (Skill tool / `sys_os_*` / `gh`).
  Never dispatch pr-shepherd itself to a sub-agent.
- **Dispatched** — buhhdy sends a fix/review task to a sub-agent via
  `sys_session_send`.

## Position in the review pipeline (fixed — do not reorder)

This mirrors buhhdy's Cross-Review Rule (`config.yaml`).

| # | Stage | When | Owner |
|---|-------|------|-------|
| 1 | buhhdy local cross-vendor review (`cross-review`) | BEFORE the PR exists | already complete — pr-shepherd assumes it, and may verify the review record exists |
| 2 | CodeRabbit | independently, AFTER PR creation | CodeRabbit bot |
| 3 | **pr-shepherd** | PR creation → merge → cleanup | buhhdy-level |

pr-shepherd does not re-run stage 1 or stage 2; it monitors their output and
routes what they surface.

## Preconditions — refuse to operate if unmet

Check both before shepherding anything. The first is a hard gate; the second
is warn-and-continue.

1. **Default-branch protection with required human review.** This is the
   mechanism-layer backstop for the human-merge rule — if the branch itself
   won't block an unreviewed merge, the skill's own gate is not enough.
   ```bash
   gh api repos/{owner}/{repo}/branches/{branch}/protection \
     --jq '.required_pull_request_reviews.required_approving_review_count'
   ```
   If this errors (no protection) or returns `0`/null: **STOP**, tell the
   human, and emit the fix command — do not shepherd. `gh api` won't expand
   nested bracket fields, so send a JSON body:
   ```bash
   gh api -X PUT repos/{owner}/{repo}/branches/{branch}/protection --input - <<'JSON'
   {"required_status_checks": null, "enforce_admins": true,
    "required_pull_request_reviews": {"required_approving_review_count": 1,
                                      "dismiss_stale_reviews": true},
    "restrictions": null}
   JSON
   ```
2. **`.coderabbit.yaml` present.** If absent, warn that PR coverage is reduced
   (stage 2 above is weakened) and continue.

## Lifecycle per PR

Run this per open PR. Fan out across the PRs concurrently — monitoring is
cheap and independent — but the merge gate and post-merge steps run
per-PR, in order.

| # | Step | Kind | Primary | Purpose | Tier | Gate / output |
|---|------|------|---------|---------|------|----------------|
| 1 | **Preflight** | buhhdy-level | buhhdy | — | — | Preconditions above pass. Confirm the stage-1 cross-review record exists for this PR's branch |
| 2 | **Monitor** | buhhdy-level | buhhdy | — | LIGHTWEIGHT | Watch `gh pr checks <pr>`, CodeRabbit review comments, and human review comments via omnigent timers / inbox — **never busy-poll**. End the turn; wake on the inbox/timer |
| 3 | **Triage findings** | buhhdy-level (routes) | buhhdy | — | STANDARD | Turn each CI failure + each CodeRabbit/human finding into a scoped fix-task. Two review channels contradict each other → adjudicate at COMPLEX tier before dispatching |
| 4 | **Fix** | Dispatched | the **ORIGINAL implementer** sub-agent (same model, same worktree/branch/title) | implement | per task | Re-dispatch the same conversation so it keeps its worktree and updates its existing PR (see `cross-review` step 5). A fresh title spawns a memoryless worker — never do that |
| 5 | **Re-review the fix** | Dispatched | opposite vendor (Cross-Review Rule) | review | STANDARD | The fix diff is cross-reviewed by a different vendor, same discipline as the original. Reviewer surfaces, never edits |
| 6 | **Escalation gate** | buhhdy-level | buhhdy | — | — | 2-attempts-then-human (below). No autonomous attempt #3 |
| 7 | **Merge gate** | buhhdy-level | **human authorizes; buhhdy executes** | — | — | All four conditions below hold. There is no autonomous-merge path |
| 8 | **Post-merge close-out** | buhhdy-level | buhhdy | — | — | The ordered checklist below |
| 9 | **Branch janitor** | buhhdy-level | buhhdy | — | LIGHTWEIGHT | Once per run, across `buhhdy/*` only (below) |

## Escalation rule (inherited from buhhdy's `core-workflows`)

Per PR finding-set:

```
attempt 1 (original model)  ──findings persist──▶  attempt 2 (same model)
attempt 2 findings persist  ──────────────────▶  escalate to the human and WAIT
```

**No autonomous attempt #3.** After the second failed fix pass, stop, hand
the human the specifics (the persisting findings + both diffs), and wait for
direction. Do not open a third fix-task on your own.

## Merge gate

buhhdy may merge a PR **only** when ALL of these hold:

- **(a)** checks are green — `gh pr checks <pr>` all pass;
- **(b)** no unresolved `CHANGES_REQUESTED` review remains;
- **(c)** an approving **human** review exists on the PR; and
- **(d)** an explicit merge instruction **naming this PR**, per buhhdy's
  **Merge Authorization** (`config.yaml`) — not vague approval ("looks
  good"), and not a chat-level standing grant on its own.

Conditions (c) and (d) are separate and both required: a GitHub review
approval never substitutes for the instruction, and the instruction never
substitutes for the per-PR review. Two traps in condition (c):

- **Humans only.** CodeRabbit and other bots post reviews too; an approval
  from `coderabbitai[bot]` or any `*[bot]` login does **not** count.
- **Current head only.** An approval on an earlier commit is stale — a push
  after it must re-earn approval. Count only approvals whose `commit_id` is
  the PR's current head, and set `dismiss_stale_reviews: true` in the
  branch-protection payload (Preconditions) so GitHub enforces it too.

```bash
head=$(gh pr view <pr> --json headRefOid --jq '.headRefOid')
gh api repos/{owner}/{repo}/pulls/<pr>/reviews --paginate \
  --jq "[.[] | select(.state==\"APPROVED\" and .commit_id==\"$head\"
          and ((.user.login) | endswith(\"[bot]\") | not))] | length"
```

A non-zero count = a current, human approval exists (condition (c)).

**Human review is always required. There is no autonomous-merge path.**
buhhdy's autonomy over commit/push/PR-create does **not** extend to merge —
merge authority is the human's alone. If any of (a)–(d) is missing, do not
merge; report which one is missing and wait.

## Post-merge close-out — in this order

1. **Close linked issues.** Verify each `Closes #N` actually resolved; if
   GitHub didn't auto-close it, close it manually with a reference to the
   merge commit.
2. **Archive + promote (owned by `openspec-conformance`).** Run `openspec
   archive <slug> --store <repo> --yes`, then that skill's `promote-adr.ts`: it
   writes exactly one `plans/architecture/NNN-<slug>.md` ADR from the design's
   `## Decisions` (never the full doc) and flips that change's
   `00-implementation-plan.md` row to `archived` + ADR link. No `## Decisions`
   → no ADR (expected). Don't hand-edit the row — the promoter owns it.
3. **Write the outcome record** via the `repo-memory` skill (buhhdy's repo
   memory standard — `.claude/memory/`, committed to git): what merged,
   findings-per-channel counts (CI / CodeRabbit / human), and escalations.
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

Each pr-shepherd run does one janitor pass. The namespace guard is structural:
the ref pattern enumerates **only** `refs/heads/buhhdy/`, so nothing outside
`buhhdy/*` can ever appear in the loop — and each candidate is re-checked
before deletion as a belt-and-suspenders guard.

```bash
# ponytail: git for-each-ref over refs/heads/buhhdy/ can only ever yield
# buhhdy/* branches — non-buhhdy branches are unreachable by construction.
cutoff=$(( $(date +%s) - 90*24*3600 ))
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
default=${default:-main}
git for-each-ref --format='%(refname:short) %(committerdate:unix)' refs/heads/buhhdy/ |
while read -r branch ts; do
  case "$branch" in buhhdy/*) ;; *) continue ;; esac       # re-assert namespace
  [ "$ts" -lt "$cutoff" ] || continue                      # keep if <90d inactive
  if git merge-base --is-ancestor "$branch" "origin/$default"; then
    git branch -D "$branch"                                # merged → safe to delete
    echo "janitored $branch (merged, last commit $(( ($(date +%s) - ts) / 86400 ))d ago)"
  else
    echo "SKIP $branch — >90d but NOT merged into $default; reporting, not deleting"
  fi
done
```

Log every deletion (branch + age) and every skipped-unmerged branch via the
`repo-memory` skill (`.claude/memory/`). **Never janitor a branch outside the
`buhhdy/*` namespace, and never force-delete an unmerged branch.**

## Provider routing

Shepherding is buhhdy-level (not dispatched). Fix-tasks route through the
standard Provider Routing Decision Tree; re-reviews follow the Cross-Review
Rule (opposite vendor). Suggested tiers:

| Activity | Tier |
|----------|------|
| Monitoring / janitor | LIGHTWEIGHT |
| Finding-triage | STANDARD |
| Adjudicating conflicting review channels | COMPLEX |

## Dry-run — a 3-PR fanout (acceptance narrative)

A full worked example — 3 PRs through monitor → fix → merge-gate → post-merge
→ janitor, demonstrating correct ordering, 2-attempts-then-human escalation,
a merge blocked until a current-head human approval **and** an explicit
instruction exist, the post-merge checklist, and the janitor deleting only
merged+inactive `buhhdy/*` branches — lives in
[references/dry-run.md](references/dry-run.md).

## Red flags — STOP

- About to merge with no human `APPROVED` review → **stop.** No exceptions,
  no "checks are green so it's fine," no bot approval counting as human.
- About to merge on a vague "looks good" / "ship it" → not a merge
  instruction (Merge Authorization). Ask.
- A third autonomous fix attempt → **stop and escalate** instead.
- Busy-polling `gh pr checks` in a loop → use timers/inbox.
- Any branch delete where the name doesn't start with `buhhdy/` → **stop.**
- Force-deleting a stale branch that isn't merged into the default branch →
  **stop**, skip and report it instead.
- Deleting a merged branch that's <90 days inactive → retention, not
  deletion-on-merge.
- Counting a stale (pre-last-push) or bot `APPROVED` review as condition (c).
