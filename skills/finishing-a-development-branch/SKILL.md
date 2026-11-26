---
name: finishing-a-development-branch
description: Use when implementation is complete and the branch needs finishing, such as "finish this branch" or "I'm done implementing". Verifies tests, then opens or updates a pull request, keeps the branch, or discards it. It never merges locally, and it closes out the Plane item before any branch or worktree cleanup.
---

# Finishing a Development Branch

## Overview

Finish development work by verifying tests, offering three options, and running the one chosen. Work reaches the base branch only through a pull request. Cleanup runs only after that pull request merges or after a confirmed discard.

**Core principle:** Verify tests → Present options → Execute choice → Cleanup only after merge or discard.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify the test suite passes.** Run the project's test command, for example `npm test`, `cargo test`, `pytest`, or `go test ./...`.

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

The base branch is the branch this work was cut from. Never assume `main`.

```bash
# Prints the base branch of the open pull request for this branch
gh pr view --json baseRefName --jq .baseRefName
```

If the command prints a base, use it. If no pull request exists for this branch, ask the user: "Which branch was this work cut from?"

### Step 3: Present Options

Present exactly these 3 options:

```
Implementation complete. What would you like to do?

1. Push and open a pull request (or update the existing one)
2. Keep the branch as-is (I'll handle it later)
3. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Push and Open or Update a Pull Request

Nothing merges here.

1. **Push the branch.**
   - If the branch has an upstream (`git rev-parse --abbrev-ref @{u}` succeeds), run `git push`.
   - If it has no upstream, run `git push -u origin <branch>`, then run `git rev-parse --abbrev-ref @{u}`. It must print `origin/<branch>`. If it prints `origin/main` or anything else, stop and report it. A branch cut from `origin/main` can end up tracking `origin/main`.
2. **Check for an existing pull request.** Run `gh pr view --json url,state,baseRefName`.
   - If a pull request exists, the push updated it. Report its URL. If its state is `MERGED`, go to Cleanup.
   - If none exists, create one against the base branch from Step 2:

```bash
gh pr create --base <base-branch> --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

The title carries the Plane identifier in brackets when the repository tracks work in Plane, for example `feat(dns): handle AAAA [AC-123]`.

Then: no cleanup. The worktree and branch stay until the pull request merges.

#### Option 2: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't run cleanup.**

#### Option 3: Discard

**Show this first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for the exact word `discard`. Anything else cancels the discard.

After a confirmed discard, run Cleanup (case b).

### Merge Rule

This skill never merges. A pull request merges only when all three hold:
- its review rounds are done,
- every finding is fixed or answered, and
- its required checks are green.

Merge it with `gh pr merge <n> --merge`, which creates a merge commit. Never use `--squash` or `--rebase`. Merging belongs to whoever owns the pull request, a person or `pr-shepherd`, not to this skill.

### Cleanup

Run cleanup only in one of two cases:
- (a) the pull request has merged, or
- (b) the user confirmed a discard.

Never run cleanup after Option 1 or Option 2. Run these three steps in this order.

1. **Close out the Plane item.** Use the `plane-work-tracking` skill's close-out before anything else. It must come first because `git branch -d` deletes the branch's `planeItem` and `planeItemStart` git config.
   - Merged work: close out as that skill directs.
   - Discard with no pull request: set the state to Cancelled.
   - With no pull request, the close-out sets Done or Cancelled itself. A pull request whose title carries `[ID]` owns the state.
2. **Remove the worktree.**
   - If `orca worktree current` finds this worktree, run from outside it:
     ```bash
     orca worktree rm --worktree path:<worktree-path>
     ```
     Add `--delete-branch` for merged work. Do not add it for a discard.
   - Otherwise run `git worktree remove <worktree-path>`, and only in the session that created the worktree.
3. **Delete the branch**, if it still exists. Run from outside the worktree.
   - Merged work: `git branch -d <branch>`. Orca may already have deleted the branch through `--delete-branch`, so check first with `git show-ref --verify --quiet refs/heads/<branch>`.
   - Discarded work: `git branch -D <branch>`.

Never remove a worktree or branch that another session owns.

## Quick Reference

| Option | Pushes | Opens or updates PR | Worktree and branch |
|--------|--------|---------------------|---------------------|
| 1. Push and open or update PR | Yes | Yes | Kept until the PR merges, then cleanup |
| 2. Keep as-is | No | No | Kept |
| 3. Discard | No | No | Cleanup after typed `discard` confirmation |

## Common Mistakes

**Skipping test verification**
- **Problem:** Open a PR with failing tests
- **Fix:** Verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" is ambiguous
- **Fix:** Present exactly the 3 options

**Cleaning up before the PR merges**
- **Problem:** Removing the worktree or branch while the PR still needs review
- **Fix:** Option 1 and Option 2 never run cleanup

**Cleaning up before the Plane close-out**
- **Problem:** `git branch -d` deletes the branch's `planeItem` and `planeItemStart` git config
- **Fix:** Close out the Plane item first, then remove the worktree and branch

**Merging locally or merging a PR from this skill**
- **Problem:** Skips review rounds and required checks
- **Fix:** Merge only by the Merge Rule, and only the pull request owner merges

**Branch tracking `origin/main`**
- **Problem:** Pushes and pulls go to the wrong branch
- **Fix:** After `git push -u`, confirm `git rev-parse --abbrev-ref @{u}` prints `origin/<branch>`

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed `discard` confirmation

**Assuming the base branch is main**
- **Problem:** Opens a PR against the wrong base
- **Fix:** Use the base from `gh pr view --json baseRefName`, or ask the user

## Red Flags

**Never:**
- Proceed with failing tests
- Merge locally, or merge a pull request from this skill
- Merge with `--squash` or `--rebase`
- Delete work without typed `discard` confirmation
- Force-push without explicit request
- Run cleanup after Option 1 or Option 2, or before the pull request merges
- Remove a worktree or branch that another session owns

**Always:**
- Verify tests before offering options
- Present exactly the 3 options
- Close out the Plane item before removing a worktree or branch
- Confirm `@{u}` is `origin/<branch>` after pushing with `-u`

## Integration

**Pairs with:**
- **plane-work-tracking**: close-out runs before any cleanup.
- **pr-shepherd**: where used, it drives review rounds and the merge of the pull request.
