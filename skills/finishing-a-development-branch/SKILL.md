---
name: finishing-a-development-branch
description: Use when implementation is complete and the branch needs finishing, such as "finish this branch" or "done implementing". Verifies tests, then opens or updates a pull request, keeps the branch, or discards it. It never merges locally, and it closes out the Plane item before any branch or worktree cleanup.
---

# Finishing a Development Branch

## Overview

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

Stop. Don't proceed to Step 2. **If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

The base branch is the branch this work was cut from. Never assume `main`.

```bash
# Prints the base branch of the open pull request for this branch
gh pr view --json baseRefName --jq .baseRefName
```

If the command prints a base, use it. If no pull request exists, ask the user: "Which branch was this work cut from?"

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

1. **Read the upstream first.** Run `git rev-parse --abbrev-ref @{u}`.
   - Prints `origin/<branch>`: run `git push origin <branch>`.
   - Fails (no upstream): run `git push -u origin <branch>`, then run the check again. It must print `origin/<branch>`.
   - Prints anything else, including `origin/main`: stop and report it. Do not push.
2. **Read the pull request state.** Run `gh pr view --json number,url,state,baseRefName`.
   - `OPEN`: the push updated it. Report its URL.
   - `CLOSED`: report its URL and ask the user what to do. Never reopen it; it may have been closed on purpose.
   - `MERGED`: run `git fetch origin`, then `git merge-base --is-ancestor HEAD origin/<base-branch>`. Exit 0: go to Cleanup. Otherwise commits came after the merge: report them and ask before opening a new pull request.
   - No pull request: create one against the Step 2 base branch:

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

Then: no cleanup. The worktree and branch stay until merge.

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

Wait for the exact word `discard`. Anything else cancels.

After a confirmed discard:
1. If `gh pr view --json number,state` shows an open pull request, close it: `gh pr close <n>`.
2. Run Cleanup, case (b).

### Merge Rule

This skill never merges. A pull request merges only when its review rounds are done, every finding is fixed or answered, and its required checks are green. Merge it with `gh pr merge <n> --merge`. Never use `--squash` or `--rebase`. Merging belongs to the pull request owner (a person or `pr-shepherd`), not to this skill.

### Cleanup

Run cleanup only when (a) the pull request has merged, or (b) the user confirmed a discard. Never run it after Option 2, or after Option 1 unless the pull request has merged. Run these steps in order.

1. **Close out the Plane item** with the `plane-work-tracking` skill first. `git branch -d` deletes the branch's `planeItem` and `planeItemStart` git config, so close-out must come before it.
   - Merged work: close out as that skill directs. Discard with no pull request: set Cancelled.
   - A pull request whose title carries `[ID]` owns the state.
2. **Remove the worktree**, from outside it.
   - Read which checkout this is: compare `git rev-parse --show-toplevel` with the path on the first `worktree` line of `git worktree list --porcelain` (the main checkout is listed first). If they match, this is the main checkout: never remove it. If `git status --porcelain` prints anything, stop and ask. Otherwise run `git switch <base-branch>` and go to step 3. If they differ, this is a linked worktree, and the next two bullets apply.
   - If `orca worktree current` finds this worktree, run `orca worktree rm --worktree path:<worktree-path>`. Add `--delete-branch` for merged work. For a discard, add `--force` instead, since a discard also drops uncommitted changes.
   - Otherwise run `git worktree remove <worktree-path>`, and only in the session that created the worktree. For a discard, use `git worktree remove --force <worktree-path>`.
3. **Delete the branch**, if it still exists, from outside the worktree.
   - Merged work: if `git show-ref --verify --quiet refs/heads/<branch>` finds nothing, Orca already deleted it via `--delete-branch`, so this step is done. Otherwise run `git merge-base --is-ancestor <branch> origin/<base-branch>`. Non-zero exit: stop and ask. Then run `git branch -d <branch>`.
   - Discarded work: `git branch -D <branch>`.

Never remove a worktree or branch that another session owns.

## Red Flags

**Never:**
- Proceed with failing tests
- Merge locally, or merge a pull request from this skill
- Merge with `--squash` or `--rebase`
- Delete work without typed `discard` confirmation
- Force-push without explicit request
- Run cleanup after Option 2, or after Option 1 without a merged pull request
- Remove a worktree or branch that another session owns
- Remove the main checkout
- Reopen a closed pull request
- Assume the base branch is `main`
- Ask an open-ended "what next?" instead of the 3 options
