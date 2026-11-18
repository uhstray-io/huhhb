---
author: Joseph A. Wisneski IV
date: 2026-11-12
status: approved
---

# Grounding: fire on volume of work, not elapsed time

## Problem

The grounding hook nudges a checkpoint after a fixed wall-clock interval (default 120 min). Time is a
poor proxy for risk: two hours of reading changes nothing, while twenty minutes of agent-driven edits
can rewrite a subsystem. The checkpoint should fire after a chosen **volume of changed lines**.

## Decisions

| Question | Decision |
| --- | --- |
| Replace or combine with the timer? | **Replace.** The elapsed-interval trigger is removed. The idle-return nudge (user came back after ≥ 30 min) stays — it is about re-engagement, not work volume. |
| What counts as a changed line? | **Added + deleted** lines from `git diff --numstat` against the baseline, plus lines in new untracked (non-ignored) files. Binary files are skipped. |
| Exclusions | Built-in lockfile list: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`, `bun.lockb`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `go.sum`, `composer.lock`, `Gemfile.lock`. Tracked files marked `-diff` in `.gitattributes` report as binary and are skipped by the same rule; untracked ones are dropped with the `:(exclude,attr:-diff)` pathspec. |
| Selectable scale | First-run menu: **1000 / 2500 / 5000 / 10000 / custom**. |
| Default | **2500** lines. |

## Mechanics

**Config** (precedence high → low): env `HUHHB_GROUNDING_LINES` > `lines=<n>` in
`~/.claude/grounding.on` > `2500`. A legacy `interval_min=` line is ignored without error.

**State** — per-session file `${TMPDIR:-/tmp}/huhhb-grounding-<session_id>`:

```
last_prompt=<epoch>   # idle-return check
last_nudge=<epoch>    # anti-nag cooldown
base_repo=<toplevel>  # repo the baseline belongs to
base_commit=<sha>     # HEAD when the baseline was taken
base_lines=<n>        # line count already present when the baseline was taken
```

**Count** on every prompt, in the payload's `cwd` (fallback `$PWD`):

```
lines = numstat(base_commit → working tree) + untracked lines − base_lines
```

Diffing the working tree against a fixed commit makes the count invariant to committing: a change
counts once whether it is staged, committed, or neither. Subtracting `base_lines` stops uncommitted
work that already existed at session start from counting toward the first threshold.

**Re-baseline** (`base_commit = HEAD`, `base_lines = current count`, no nudge) when:

- there is no baseline yet (first prompt of the session),
- the skill requested it (a `reset=1` line appended to the state file at checkpoint completion),
- `cwd` resolves to a different repo than `base_repo`,
- `base_commit` is missing or is no longer an ancestor of `HEAD` (branch switch, rebase, amend).

The last case deliberately re-baselines instead of diffing from `git merge-base`: after a rebase onto
`main` or a switch to a sibling branch, the merge-base diff includes commits that are not this session's
work and would fire a false checkpoint. Under-counting once is the cheaper error.

Known limits, accepted because the nudge is advisory: a `git pull` or `git merge` of others' commits keeps
the baseline an ancestor, so those lines count; detecting merge commits would still miss fast-forwards.
An amend or rebase on every step re-baselines every time, so the line trigger may never fire in that
workflow (the idle check still runs).

Outside a git repo (or in a repo with no commits) the line trigger is skipped; only the idle check runs.

**Nudge** when `lines ≥ threshold`, or on idle return, subject to the existing 15-min cooldown. The
nudge names the count, the threshold, the baseline commit (the review scope is `git diff <base_commit>`),
and the state-file path.

## Skill changes

- `SKILL.md` first run: offer the scale menu when `lines=` is unset; persist the choice.
- Review scope becomes `git diff <base_commit>` (named in the nudge), replacing the
  `git log --since=@<epoch>` workaround.
- Stamping: on genuine completion, append `reset=1` to the state file. Never on a no-op skip.
- Description, README, `marketplace.json`, and `onboarding/skills-list.md` drop "default 2h" for
  "default 2500 changed lines". Trigger phrases are unchanged.

## Testing

`tests/test_grounding_hook.test.ts` (`node --test`) builds a temp git repo per case, runs
`hooks/grounding-check.sh` with a fake payload and an isolated `HOME`/`TMPDIR`, and asserts:

- under threshold → no nudge; over threshold → nudge naming the count
- lockfile churn → no nudge
- committing the changes → count unchanged
- pre-existing uncommitted work at session start → not counted
- non-git `cwd` → no nudge
- `reset=1` → count restarts from the new baseline
- branch switch to a non-descendant commit → re-baseline, no nudge

`hooks/grounding-check.ps1` mirrors the shell logic; `pwsh` is not installed on the authoring machine,
so it is reviewed, not executed, by these tests.

## Revision 2026-11-17 — own-commit count, no idle rule, once per crossing

Decided by Joseph A. Wisneski IV on 2026-11-16, after an audit of the 1,870 nudges the hook fired between
2026-06-25 and 2026-11-17 (UTC). The audit report, `grounding-trigger-audit-2026-11-17.md`, is kept in the
handoffs folder outside this repository. The audit found the following.

- **The count included other branches' work.** The one line-threshold nudge reported 17,456 changed lines. The
  session had written 103 of them. A `merge dev` brought in the other 17,353.
- **The idle-return rule fired on machine prompts.** 41 of the 84 idle nudges arrived on machine prompts, such as
  a finished background task, with no person returning to the session.
- **Most nudges arrived on machine prompts.** About 74% did. They arrived on `<task-notification>`,
  `<cross-session-message`, `<ci-monitor-event>` and similar tags.
- **Most nudges came from the old timer.** 1,785 of the 1,870 (95%) came from the elapsed-time trigger, which
  huhhb 0.8.27 retired.
- **A pending checkpoint kept re-firing.** The 15-minute cooldown let a pending nudge repeat on every prompt once
  it expired, until a checkpoint was recorded as complete. Only 45 grounding skill runs appear across all
  transcripts, against 1,870 nudges.

### Decisions

1. **Count only this session's own commits.** The count is the added and deleted lines of this session's own
   non-merge commits since `base_commit`, plus uncommitted changes against `HEAD`, plus lines in untracked text
   files, minus `base_lines`. A commit is this session's own when no other local or remote branch reaches it.
   Commits that another branch reaches do not count, including those a merge or pull brings in from it.
   Committing a change does not change the count, except when a line was staged, edited again, and only the
   staged part committed: commits count every line they change, so that line then counts twice. The lockfile, binary and `-diff` exclusions are unchanged. The command
   and formula are in [skills/grounding/reference.md](../../../skills/grounding/reference.md). Own commits stop
   counting once another branch reaches them, for example after a PR merges to `dev` and `dev` is merged back.
   That limit is accepted because the nudge is advisory.
2. **Remove the idle-return rule.** The hook is no longer registered on `SessionStart`, and
   `HUHHB_GROUNDING_IDLE_MIN` is gone. Outside a git repository, or in a repository with no commits, the hook
   does nothing.
3. **Remove the cooldown and nudge once per crossing.** `HUHHB_GROUNDING_COOLDOWN_MIN` is gone. The hook nudges
   when the count reaches `nudged_lines` plus the threshold, then waits for another full threshold of lines. If
   the count falls below `nudged_lines`, `nudged_lines` drops to that count. A re-baseline or a `reset=1` line
   sets `nudged_lines` to `0`.
4. **Nudge on typed prompts only.** A prompt that starts with `<task-notification>`, `<cross-session-message` or
   `<ci-monitor-event>`, and an empty prompt, never nudges. The count still updates on those prompts, so the next
   typed prompt can nudge.
5. **Trim the state keys.** The state file keeps `base_repo`, `base_commit`, `base_lines` and `nudged_lines`, plus
   a pending `reset=1` line when a checkpoint completes. `last_prompt`, `last_nudge` and `fresh` are gone.

### Supersedes

This revision replaces the following parts of the decisions above. The rest of the spec stands.

- The idle-return half of the timer decision on line 19.
- The `last_prompt` and `last_nudge` keys on lines 33 and 34.
- The count formula on line 43.
- The known limit on lines 61 and 62 about a `git pull` or `git merge` of others' commits.
- The sentence on line 66 that says only the idle check runs outside a git repository.
- The cooldown on line 68.
- The review scope `git diff <base_commit>` on lines 69 and 70 and on lines 75 and 76.

The Testing section above is not revised here. It does not list cases for the own-commit count, the typed-prompt
gate or the once-per-crossing rule.
