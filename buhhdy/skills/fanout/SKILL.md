---
name: fanout
description: Run independent subtasks in parallel — one git worktree and one implementation sub-agent per task, each cross-reviewed LOCALLY before it opens its own PR. buhhdy never merges; the human does.
---

# fanout — safe parallel execution

Use ONLY for subtasks that are parallel-safe (no shared files, no ordering
dependency).

Size the wave before dispatching: 2–3 agents for less complex work, 5–7
for more complex (the spawn_bounds cap is 7/turn — a ceiling, not a
target). If the task set exceeds one wave, batch by dependency order up
front rather than discovering the cap mid-fanout.

## Procedure
1. Per task, create an isolated worktree:
   `sys_os_shell("git worktree add .worktrees/<task_id> -b buhhdy/<task_id>")`.
   Record the worktree path + branch in the registry
   (`.buhhdy/registry.json`).
2. Dispatch one implementation sub-agent per task, scoped to its worktree:
   `sys_session_send(agent="claude_code"|"codex", title="<task_slug>",
   args={purpose: "implement", input: "<task + acceptance contract +
   worktree path>"})`. Use a short task-based title such as `auth-refactor` or
   `fix-sse-error`, never the raw vendor name. State the scope and that it must
   work only inside `.worktrees/<task_id>`. The worker drives the task to
   green, running the tests and capturing the evidence (commands run +
   results), and COMMITS all of its work on the branch — cross-review
   refuses a dirty worktree (anything staged, unstaged, or untracked) —
   but it does NOT open a PR yet; the PR comes after local
   cross-review passes (step 4). Do not add any co-author/attribution
   trailer naming an AI tool or platform to its commits or PR description —
   normal commit messages only.
   Record each handle's `conversation_id`
   in the registry. Emit the worktree + `sys_session_send` tool calls in THIS
   turn — never end a turn having only said you will dispatch; the dispatch
   calls and their announcement go in the same turn. Dispatch the whole
   parallel-safe set, THEN (and only then) END YOUR TURN. Do not poll.
3. Each sub-agent runs autonomously and notifies you through the inbox when it
   finishes. Collect its structured result (including the test-run evidence)
   with `sys_read_inbox`. If the inbox result is empty/unclear, inspect that
   worker conversation with `sys_session_get_history` before deciding what to do
   next.
4. Send each finished task's worktree diff through `cross-review` — LOCAL,
   before any PR exists. When it passes, the implementer opens its PR:
   body carrying `Closes #N` for its tracker issue and the captured
   test-run evidence. VERIFY both are present before counting the PR as
   deliverable — a PR missing either goes back to its implementer. Record
   the PR URL in the registry and update the issue's status.
5. buhhdy does NOT merge — the PR is the deliverable. Once open, the PR
   belongs to pr-shepherd (CI, CodeRabbit findings, human review, merge
   lifecycle); CodeRabbit reviews it independently — don't pre-empt or
   duplicate it. Never run `git merge` / `gh pr merge` here.
6. Worktree removal is pr-shepherd's post-merge close-out, not fanout's —
   don't remove a worktree that still has open fix-tasks or an unmerged PR.

## Notes
- Respect the per-turn dispatch cap (enforced by policy). More tasks than the
  cap → dispatch in waves (let the running batch finish before dispatching more).
- The human can open any sub-agent in the UI's Subagents panel and read its
  conversation while it runs.
- If a running worker is wrong, runaway, superseded, or no longer useful, call
  `sys_cancel_task` with `task_id` set to the recorded `conversation_id` before
  dispatching a replacement. `claude_code` is hard-stopped; `codex` cancellation
  is best-effort until its runner-side hard-stop exists.
- A sub-agent that returns a dark or failing result: don't re-prompt it in a
  loop — re-dispatch a fresh implementation sub-agent in a clean worktree, or
  escalate to the user.
- Because buhhdy never merges, cross-PR conflicts surface when the human merges,
  not here. Keeping each parallel task's file scope disjoint is what keeps that
  rare — honor it.
