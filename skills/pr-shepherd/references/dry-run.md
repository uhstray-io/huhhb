# pr-shepherd — dry-run acceptance narrative (a 3-PR fanout)

Worked example demonstrating the pr-shepherd contract end to end. Referenced
from `../SKILL.md`.

An orchestrating session left three PRs open into an integration branch:
**#41, #42** (implementer PRs on `agent/t-41`, `agent/t-42`, worktrees
`.worktrees/t-41`, `.worktrees/t-42`) and **#43** (the orchestrator's own docs PR).

1. **Preflight.** `main`'s ruleset has a `pull_request` rule → passes.
   `.coderabbit.yaml` present; GitHub auto-delete-head-branches is OFF.
   Shepherd all three concurrently.
2. **Monitor.** Set timers; end the turn. Wakes: #41 CI red (1 test);
   CodeRabbit leaves 2 findings on #42; #43 clean, CodeRabbit asked for no changes.
3. **#41 — fix attempt 1.** Re-dispatch the original implementer (same
   worktree and PR) to fix the failing test. It pushes; CI still red. **Attempt
   2** (same implementer): CI green. The new head gets a new CodeRabbit round →
   no changes asked.
4. **#42 — fixes.** Both CodeRabbit findings go to #42's original
   implementer; it pushes and answers both threads. CI green.
5. **Merge gate.**
   - #43: checks green, no unanswered thread, one round on the current head
     that asked for no changes, docs only so no bump →
     `gh pr merge 43 --merge --match-head-commit <head sha>`.
   - #41: (a)–(e) hold on its current head → merged the same way.
   - #42: green, threads answered, but its only round is on the commit before
     the fix → **merge blocked** until a new round on the current head asks
     for no changes; then merged the same way.
6. **Post-merge (#43).** Close `Closes #38`; close out the Plane item with
   `plane-work-tracking`; write the outcome as close-out step 3 says (CI 0 /
   CodeRabbit 0; escalations 0). No `git worktree remove` is needed — #43 is
   the orchestrator's own docs commit with no task worktree.
7. **Janitor.** `for-each-ref refs/heads/agent/` lists `agent/t-41`,
   `agent/t-42`, and an old `agent/t-12` (merged into `main` 120 days ago,
   no commits since). Only `t-12` is >90d **and merged** → deleted and logged.
   `t-41`/`t-42` are recent → **retained**. An old-but-**unmerged** `agent/t-05`
   would be **skipped and reported**, not force-deleted. A `feature/other`
   branch never enters the loop.

Demonstrated: correct ordering; 2-attempts-then-human escalation shape; merge
blocked until a review round on the current head asks for no changes; merge
commits only; post-merge checklist executed in order; worktree removed; only
merged+inactive branches deleted (unmerged stale ones skipped); janitor
structurally confined to `agent/*`.
