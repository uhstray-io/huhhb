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
| Exclusions | Built-in lockfile list: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`, `bun.lockb`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `go.sum`, `composer.lock`, `Gemfile.lock`. Files marked `-diff` in `.gitattributes` report as binary and are skipped by the same rule. |
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
