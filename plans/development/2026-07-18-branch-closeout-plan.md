# Branch Close-Out Plan (2026-07-18)

**Goal:** delete every local/remote branch, worktree, and stash whose work is
fully merged into `origin/main` — and nothing else. Derived from the
2026-07-18 stranded-work audit (this session); the champion/challenger
recovery (PR #47) removed the last stranded commit blocking cleanup.

**Safety protocol (per `skills/pr-shepherd/references/janitor.md` conventions):**

1. `git fetch origin` first; fail closed if `origin/main` is unresolvable.
2. A branch is deletable only if EITHER `git merge-base --is-ancestor <b> origin/main`
   OR (tip not ancestor but) `git diff origin/main <b> -- $(git log origin/main..<b>
   --name-only --format= | sort -u)` is EMPTY (content-equivalent; how
   `refactor/buhhdy-memory-hierarchy` was cleared in the audit).
3. Delete atomically with the audited tip:
   `oid=$(git rev-parse refs/heads/<b>) && git update-ref -d refs/heads/<b> "$oid"`
   (compare-and-delete: aborts if the branch moved since the audit).
4. Remove a worktree BEFORE deleting its checked-out branch; never
   `--force` a worktree with uncommitted files (audit showed all clean).
5. Anything failing a check is SKIPPED and reported, never forced.

## Inventory and verdicts (audited 2026-07-18)

### Delete — merged, zero novel content

| Branch | Evidence | Remote? |
|---|---|---|
| `feat/buhhdy-skills` | 0 novel patches; PR #29 merged | yes — delete remote too |
| `feat/evolve-scenarios` | 0 novel patches; PRs #19/#21 merged | yes |
| `feat/evolve-field-pass` | 0 novel patches (dupe of evolve-scenarios tip) | no |
| `docs/huhhb-conformance` | content-equivalent (empty file-diff vs main); PR #36 | yes |
| `refactor/buhhdy-memory-hierarchy` | content-equivalent; PR #34 merged | yes |
| `feat/repo-memory-hooks` | PR #43 merged, tip caught (3179c56) | yes |
| `feat/shepherd-general-rename` | PR #42 merged, tip caught | yes |
| `buhhdy/upstream-acp-compat` | in `--merged origin/main` set | check `ls-remote` |
| `feat/buhhdy-opencode-worker` | in `--merged origin/main` set | check `ls-remote` |
| plus the older `--merged` set: `chore/add-mit-license`, `docs/buhhdy-fable-5`, `docs/buhhdy-skill-verification`, `docs/polly-tri-config`, `docs/readme-grounding`, `feat/calibration-refresh`, `feat/evolve-backfill`, `feat/evolve-roadmap-r-batch`, `feat/evolve-suite`, `feat/memory-onboarding`, `feat/skills`, `fix/alignment-buhhdy`, `fix/alignment-skills`, `fix/skill-graph-source-noise` | each: re-verify is-ancestor at execution time | check each |

### Delete after their PRs merge — NOT before

| Branch | Blocker |
|---|---|
| `feat/evolve-r8-device` | delete once PR #47 (its recovered commit) merges; deleting earlier orphans nothing (commit is cherry-picked) but keep until #47 lands as provenance |
| `feat/evolve-r3-champion` (+ worktree `.worktrees/r3cc`) | PR #47 open |
| `feat/discovering-context-skill` | PR #44 merged — verify tip caught, then delete |
| `docs/conformance-to-main` | merged, but it is the MAIN CHECKOUT's current branch — switch the main checkout to `main` first |

### Keep — active work

| Item | Why |
|---|---|
| `fix/repo-memory-hook-hotpath` (+ worktree `.worktrees/rml`) | 6 unpushed local commits (grounding fixes + two plans) awaiting batch instruction |
| `main` | — |

### Worktrees to remove (after their branch verdicts)

`.worktrees/rmh` (feat/repo-memory-hooks), `.worktrees/sgr`
(feat/shepherd-general-rename), `.worktrees/buhhdy-acp`,
`.worktrees/buhhdy-opencode`; later `.worktrees/r3cc` (post-#47).
`git worktree remove <abs-path>` then `git worktree prune`.

### Stashes

- `stash@{0}` "node_modules gitignore fix (preserve)" — NOT cleanup: convert
  to a commit on a fix branch + its own small PR (it is the known .gitignore
  bug fix), THEN drop the stash.
- `stash@{1}` GitHub Desktop autostash (`.gemini/settings.json`, `uv.lock`) —
  confirm with Joe, then `git stash drop stash@{1}`.

### Remote-side sweep

After local deletions: `git ls-remote --heads origin` and delete each remote
branch whose local twin was deleted (`git push origin --delete <b>`), then
`git remote prune origin`. Skip any remote branch with an OPEN PR.

## Execution order

1. Convert `stash@{0}` to its fix branch/PR (protects it from later stash churn).
2. Sweep the "Delete" table: per branch, re-run check #2, then compare-and-delete
   local; collect the remote-deletion list.
3. Remove the four merged worktrees; `git worktree prune`.
4. Remote deletions + `git remote prune origin`.
5. Report: deleted / skipped-with-reason / kept.
6. Post-#47 follow-up: r3cc worktree, `feat/evolve-r3-champion`,
   `feat/evolve-r8-device`, and (after switching the main checkout to `main`)
   `docs/conformance-to-main`.

**Not in scope:** `.worktrees` directory itself, reflog expiry, remote tags,
anything in other repos. No `git gc --prune` — reflog keeps deleted tips
recoverable for 90 days, which is the safety net this plan relies on.
