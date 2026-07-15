# pr-shepherd — dry-run acceptance narrative (a 3-PR fanout)

Worked example demonstrating the pr-shepherd contract end to end. Referenced
from `../SKILL.md`.

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
   Human approves #43 (a GitHub review on the current head) and says "merge
   #43." Now (a)+(b)+(c)+(d) all hold → buhhdy executes the merge of #43.
   #41/#42 stay blocked until each gets BOTH a current-head human approval and
   an explicit instruction.
6. **Post-merge (#43).** Close `Closes #38`; `openspec archive` +
   `promote-adr.ts` (its index row flips to `archived`; one ADR lands in
   `plans/architecture/` if #38's design had a `## Decisions`); write the
   outcome via `repo-memory` to `.claude/memory/` (CI 0 / CodeRabbit 0 /
   human 0; escalations 0); `git worktree remove` — #43 is buhhdy's own docs
   commit with no task worktree, so skip that.
7. **Janitor.** `for-each-ref refs/heads/buhhdy/` lists `buhhdy/t-41`,
   `buhhdy/t-42`, and an old `buhhdy/t-12` (merged into `main` 120 days ago,
   no commits since). Only `t-12` is >90d **and merged** → deleted and logged.
   `t-41`/`t-42` are recent → **retained**. An old-but-**unmerged** `buhhdy/t-05`
   would be **skipped and reported**, not force-deleted. A `feature/other`
   branch never enters the loop.

Demonstrated: correct ordering; 2-attempts-then-human escalation shape; merge
blocked until a current-head human approval **and** an explicit instruction
exist; post-merge checklist executed in order; worktree removed; only
merged+inactive branches deleted (unmerged stale ones skipped); janitor
structurally confined to `buhhdy/*`.
