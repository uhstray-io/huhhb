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
    "required_pull_request_reviews": {"required_approving_review_count": 1},
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
| 7 | **Merge gate** | buhhdy-level | **human merges** | — | — | All four conditions below hold. There is no autonomous-merge path |
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
substitutes for the per-PR review. Condition (c) means a **human** — CodeRabbit
and other bots post reviews too; filter them out. An approval from
`coderabbitai[bot]` or any `*[bot]` / `Bot`-type author does **not** satisfy
(c) (guard `is_bot` and a `[bot]` login suffix, defaulting a missing `is_bot`
to non-bot so an absent field can't slip through):

```bash
gh pr view <pr> --json reviews \
  --jq '[.reviews[] | select(.state=="APPROVED"
          and ((.author.is_bot // false) | not)
          and ((.author.login // "") | endswith("[bot]") | not))] | length'
```

**Human review is always required. There is no autonomous-merge path.**
buhhdy's autonomy over commit/push/PR-create does **not** extend to merge —
merge authority is the human's alone. If any of (a)–(d) is missing, do not
merge; report which one is missing and wait.

## Post-merge close-out — in this order

1. **Close linked issues.** Verify each `Closes #N` actually resolved; if
   GitHub didn't auto-close it, close it manually with a reference to the
   merge commit.
2. **Update the plan.** Set the corresponding status in
   `plans/development/00-implementation-plan.md`.
3. **Archive the change.** Run `openspec archive <slug> --store <repo>` for
   the completed change (it moves to `openspec/changes/archive/`), per the
   Planning Layout decision record (buhhdy's README). Promote its durable
   design decisions into `plans/architecture/` as numbered ADRs.
4. **Write the outcome record** to repo-memory (`plans/memory.md`): what
   merged, findings-per-channel counts (CI / CodeRabbit / human), and any
   escalations.
5. **Remove the worktree** for the merged task:
   ```bash
   git worktree remove .worktrees/<task_id>
   ```

## Branch retention & janitor

**Retention, not deletion-on-merge.** A merged branch is kept even when
inactive. A branch is deleted **only** after **90 days with no commits**.

Each pr-shepherd run does one janitor pass. The namespace guard is structural:
the ref pattern enumerates **only** `refs/heads/buhhdy/`, so nothing outside
`buhhdy/*` can ever appear in the loop — and each candidate is re-checked
before deletion as a belt-and-suspenders guard.

```bash
# ponytail: git for-each-ref over refs/heads/buhhdy/ can only ever yield
# buhhdy/* branches — non-buhhdy branches are unreachable by construction.
cutoff=$(( $(date +%s) - 90*24*3600 ))
git for-each-ref --format='%(refname:short) %(committerdate:unix)' refs/heads/buhhdy/ |
while read -r branch ts; do
  case "$branch" in buhhdy/*) ;; *) continue ;; esac   # re-assert namespace
  [ "$ts" -lt "$cutoff" ] || continue                  # keep if <90d inactive
  git branch -D "$branch"
  echo "janitored $branch (last commit $(( ( $(date +%s) - ts ) / 86400 ))d ago)"
done
```

Log every deletion (branch + age) to repo-memory (`plans/memory.md`).
**Never janitor a branch outside the `buhhdy/*` namespace.**

## Provider routing

Shepherding is buhhdy-level (monitoring, `gh` plumbing, docs/memory writes —
permitted non-code authoring, not dispatched). Fix-tasks route through the
standard Provider Routing Decision Tree; re-reviews follow the Cross-Review
Rule (opposite vendor from the implementer). Suggested tiers:

| Activity | Tier |
|----------|------|
| Monitoring / janitor | LIGHTWEIGHT |
| Finding-triage | STANDARD |
| Adjudicating conflicting review channels | COMPLEX |

## Dry-run — a 3-PR fanout (acceptance narrative)

Workflow 2 left three PRs open: **#41, #42** (implementer PRs, worktrees
`.worktrees/t-41`, `.worktrees/t-42`) and **#43** (buhhdy's docs PR).

1. **Preflight.** Branch protection on `main` requires 1 review → passes.
   `.coderabbit.yaml` present. Stage-1 cross-review records exist for all
   three branches. Shepherd all three concurrently.
2. **Monitor.** Set timers; end the turn. Wakes: #41 CI red (1 test);
   CodeRabbit leaves 2 findings on #42; #43 clean, no findings.
3. **#41 — fix attempt 1.** Re-dispatch the original implementer (same model,
   `title=t-41`) to fix the failing test. It pushes; CI still red. **Attempt
   2** (same model): CI green. Fix diff cross-reviewed by the opposite vendor
   → clean.
4. **#42 — fixes.** Both CodeRabbit findings dispatched to #42's original
   implementer; cross-reviewed clean. CI green.
5. **Merge gate.**
   - #43: checks green, no CHANGES_REQUESTED, **but no human approval yet** →
     **merge blocked.** Report "waiting on human review," wait.
   - #41/#42: green and no CHANGES_REQUESTED, but no human approval → also
     blocked.
   Human approves #43 and says "merge #43." Now (a)+(b)+(c)+(d) all hold →
   the human's grant is satisfied; merge #43. #41/#42 stay blocked until each
   gets BOTH a human approval and an explicit instruction.
6. **Post-merge (#43).** Close `Closes #38`; set its row in
   `plans/development/00-implementation-plan.md` to done; trigger the OpenSpec
   archive; write the outcome to `plans/memory.md` (findings: CI 0 /
   CodeRabbit 0 / human 0; escalations 0); `git worktree remove` — #43 is
   buhhdy's own docs commit with no task worktree, so skip that line.
7. **Janitor.** `for-each-ref refs/heads/buhhdy/` lists `buhhdy/t-41`,
   `buhhdy/t-42`, and an old `buhhdy/t-12` (merged 120 days ago, no commits
   since). Only `t-12` is >90d → deleted and logged. `t-41`/`t-42` are recent
   → **retained**. A `feature/other` branch never enters the loop.

Demonstrated: correct ordering; 2-attempts-then-human escalation shape; merge
blocked until a human approval **and** an explicit instruction exist;
post-merge checklist executed in order; worktree removed; branches retained
with age logged; janitor structurally confined to `buhhdy/*`.

## Red flags — STOP

- About to merge with no human `APPROVED` review → **stop.** No exceptions,
  no "checks are green so it's fine," no bot approval counting as human.
- About to merge on a vague "looks good" / "ship it" → not a merge
  instruction (Merge Authorization). Ask.
- A third autonomous fix attempt → **stop and escalate** instead.
- Busy-polling `gh pr checks` in a loop → use timers/inbox.
- Any branch delete where the name doesn't start with `buhhdy/` → **stop.**
- Deleting a merged branch that's <90 days inactive → retention, not
  deletion-on-merge.
