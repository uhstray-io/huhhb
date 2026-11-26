---
name: finishing-a-development-branch
description: Use when implementation is complete and the branch needs finishing, such as "finish this branch" or "done implementing". Verifies tests and reads the pull request state before any push, then opens or updates a pull request, keeps the branch, or discards it. After a merge it hands off to the pr-shepherd post-merge close-out.
---

# Finishing a Development Branch

**Core principle:** verify tests, read the real state, then act. Never push, remove or delete anything before reading what is there.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

Run every read below inside the checkout being finished.

## Step 1: Verify Tests

**Before anything else, verify the test suite passes.** Run the project's test command, for example `npm test`, `cargo test`, `pytest`, or `go test ./...`.

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed until tests pass.
```

Stop. Don't proceed to Step 2.

## Step 2: Read the Pull Request State

```bash
gh pr view <branch> --json number,url,state,baseRefName
```

Name the branch: it still finds a merged pull request after GitHub deleted the remote branch. No pull request is a valid answer: it prints `no pull requests found for branch "<branch>"` and exits 1. The base branch is the pull request's `baseRefName`. With no pull request, ask the user which branch the work was cut from. Never assume `main`.

- `MERGED`: do not push. Run `git fetch origin`, then `git merge-base --is-ancestor HEAD origin/<base-branch>`.
  - Exit 0: the work is merged. Hand off to the post-merge close-out in `pr-shepherd` (Plane close-out, worktree removal, branch cleanup) and stop.
  - Non-zero: commits came after the merge. Report them (`git log --oneline origin/<base-branch>..HEAD`) and ask the user before doing anything else.
- `CLOSED`: do not push. Report its URL and ask the user what to do. Never reopen it; it may have been closed on purpose.
- `OPEN`, or no pull request: go to Step 3.

## Step 3: Present Options

```
Implementation complete. What would you like to do?

1. Open or update a pull request
2. Keep the branch as-is
3. Discard this work

Which option?
```

## Step 4: Execute Choice

### Option 1: Open or Update a Pull Request

1. **Read the upstream:** `git rev-parse --abbrev-ref @{u}`.
   - Prints `origin/<branch>`: run `git push origin <branch>`.
   - Fails (no upstream): run `git push -u origin <branch>`, then read it again. It must print `origin/<branch>`; otherwise stop and report it.
   - Prints anything else, including `origin/main`: stop and report it. Do not push.
2. **Pull request open:** the push updated it. Report its URL.
3. **No pull request:** create one against the base branch from Step 2:

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

After the merge, run this skill again; Step 2 hands off to `pr-shepherd`.

### Option 2: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>." Then stop.

### Option 3: Discard

1. **Read what is there.** This checkout: `git rev-parse --show-toplevel`. The main checkout: the first `worktree` line of `git worktree list --porcelain` (it is listed first). Orca: `orca worktree current`. Remote branch: `git ls-remote --branches origin <branch>`. Pull request: Step 2. Commits not in the base: `git log --oneline origin/<base-branch>..<branch>`. Files: `git status --porcelain --ignored` in the worktree (modified, staged, untracked and ignored). If this checkout is the main checkout, remove nothing: report that the branch is checked out there, ask the user to move it, and stop.
2. **Show everything that would be lost and wait for the word `discard`:**
```
This will permanently delete:
- Local branch <name> and its commits: <commit-list>
- Worktree at <path>, with these files: <git status --porcelain --ignored output>
  (Orca manages it: removed with the branch. Otherwise: you remove it.)
It will not close pull request <url> or delete origin/<name> unless you ask.

Type 'discard' to confirm.
```
   Anything else cancels. If a pull request is open or a remote branch exists, ask separately whether to close the pull request (`gh pr close <n>`) or delete the remote branch (`git push origin --delete <branch>`). Do only what the user says yes to.
3. **Close out the Plane item** with the `plane-work-tracking` skill (no pull request: Cancelled). `git branch -D` deletes the branch's `planeItem` and `planeItemStart` git config, so this comes first.
4. **Remove the linked worktree, then the branch:**
   - Orca manages it: from outside it, run `orca worktree rm --worktree path:<worktree-path> --force`. Use `--force` only when the file list in step 2 was shown and confirmed; if the files changed since, show the list again first.
   - Orca does not manage it: do not remove it. Report its path, ask the user to remove it, and wait for them to confirm.
   - Then, in the main checkout read in step 1, run `git -C <main-checkout> show-ref --verify --quiet refs/heads/<branch>`. Exit 0: run `git -C <main-checkout> branch -D <branch>`. Exit 1: the branch is already gone. Any other exit is an error: report it and stop; never read it as "branch not found".

## Merge Rule

This skill never merges. Its owner or `pr-shepherd` merges a pull request once review rounds are done, every finding is fixed or answered and required checks are green: `gh pr merge <n> --merge`, never `--squash` or `--rebase`.

## Red Flags

**Never:**
- Proceed with failing tests
- Push before reading the pull request state, or push for a `MERGED` or `CLOSED` pull request
- Push when `@{u}` is set to anything but `origin/<branch>` (no upstream: only `git push -u origin <branch>`)
- Merge locally or from this skill
- Delete work without typed `discard` confirmation against the full list of what would be lost
- Remove the main checkout, or run `git switch` in any checkout
- Clean up after a merge yourself; that is the `pr-shepherd` post-merge close-out
- Assume the base branch is `main`
