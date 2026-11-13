# Grounding — reference (mechanics · report template · rationalizations)

Heavy detail for the `grounding` skill, kept out of `SKILL.md` to keep it lean.

## State, baseline, threshold (mechanics)

- **Opt-in.** The hook is active when the marker file `~/.claude/grounding.on` exists, or when the env var
  `HUHHB_GROUNDING` is `1`, `true`, `on`, or `yes`. Otherwise it does nothing.
- **Threshold.** The hook nudges a checkpoint once the changed lines reach the threshold. Precedence, high
  to low: env `HUHHB_GROUNDING_LINES`, then a `lines=<n>` line in the marker file, then the default **2500**.
  The first-run menu offers **1000 / 2500 (default) / 5000 / 10000 / custom number** and writes the choice to
  the marker as `lines=<n>`. A legacy `interval_min=` line is ignored without error.
- **Idle return.** The hook also nudges when the user returns after `HUHHB_GROUNDING_IDLE_MIN` minutes away
  (default 30). After any nudge, the hook stays quiet for `HUHHB_GROUNDING_COOLDOWN_MIN` minutes (default 15).
- **Per-session state.** The hook keeps `${TMPDIR:-/tmp}/huhhb-grounding-<session_id>` with these keys, and
  passes this exact path in its nudge:
  - `last_prompt` — the time of the last prompt, in Unix seconds, used by the idle check.
  - `last_nudge` — the time of the last nudge, in Unix seconds, used by the cooldown.
  - `base_repo` — top-level path of the repo the baseline belongs to.
  - `base_commit` — `HEAD` when the baseline was taken.
  - `base_lines` — changed lines already present when the baseline was taken.
- **What is counted.** On every prompt, the hook counts changed lines in the repo that holds the payload's
  `cwd` (falling back to `$PWD`):

  ```
  changed lines = added + deleted lines of `git diff <base_commit>` (to the working tree)
                + lines in untracked, non-ignored text files
                − base_lines
  ```

  Diffing the working tree against a fixed commit means a change counts once whether it is staged,
  committed, or neither, so committing does not change the count. Subtracting `base_lines` keeps uncommitted
  work that already existed at the baseline from counting. Lockfiles (`package-lock.json`, `yarn.lock`,
  `pnpm-lock.yaml`, `bun.lock`, `bun.lockb`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `go.sum`,
  `composer.lock`, `Gemfile.lock`) are excluded, and binary files do not count. Outside a git repo, or in a
  repo with no commits, the line trigger is skipped and only the idle check runs.
- **Re-baseline.** The hook sets `base_commit` to the current `HEAD` and `base_lines` to the current count,
  with no line nudge, when:
  - there is no baseline yet (first prompt of the session);
  - the state file contains `reset=1`;
  - `cwd` resolves to a different repo than `base_repo`;
  - `base_commit` is missing or is no longer an ancestor of `HEAD` (branch switch, rebase, amend).

  The last case re-baselines instead of diffing from the merge-base. After a rebase onto `main` or a switch
  to a sibling branch, a merge-base diff would include commits that are not this session's work and could
  fire a false checkpoint. Under-counting once is the cheaper error.
- **Reset is the skill's job.** The hook cannot know that a checkpoint actually finished, so the skill
  does it. When a checkpoint genuinely completes, append a `reset=1` line to the state-file path the hook
  named:

  ```bash
  printf 'reset=1\n' >> "<state-file path from the nudge>"
  ```

  The hook re-baselines on the next prompt and drops the line when it rewrites the file. Never append it on
  a no-op skip ("still grounded — nothing to do") or on a checkpoint you did not finish.
- **Review scope.** The review scope is the range the count uses: `git diff <base_commit>` in the repo the
  nudge names. That covers committed and uncommitted work since the baseline, plus untracked files. A manual
  run with no nudge has no `base_commit`, so fall back to uncommitted work plus recent commits on the branch
  (SKILL.md step 3).

## Check menu (offer every checkpoint; default = all)

Present numbered; user replies "all" / a subset / "skip":

1. Work snapshot · 2. Code review (`/simplify` + `/security-review`) · 3. Test/build/lint health ·
4. Repo conformance · 5. Goal/scope · 6. Gaps & next steps.

Run only the selected; the report names any the user skipped.

## Report template (render for the checks that ran)

```
Grounding checkpoint — <branch> · <N files / +X−Y> since last checkpoint
(ran: 1,2,4 · skipped by you: 3,5,6)

1. Work        — uncommitted/unpushed summary; commit suggestion if piling up
2. Reviews     — real /simplify + /security-review output  (or "‹cmd› unavailable")
3. Tests/build — real result of the test/lint command       (or "not run — untested: …")
4. Conformance — documented rules checked + drift found      (or "no documented conventions")
5. Goal/scope  — still aligned with "<objective>"? drift flagged
6. Gaps/next   — what's missing/assumed; next steps re-confirmed

Recommended actions (ranked; from real findings only — none if the checkpoint is clean):
  P1 <action> — from <check>: <finding>
  P2 <action> — from <check>: <finding>
  -> want me to do any of these? (confirm-first)

Proposed edits (confirm-first): <diffs, if any> — nothing applied yet.
Questions (≤3): …
```

## Rationalization table (STOP if you catch yourself here)

| Excuse | Reality |
| --- | --- |
| "We're in a hurry, skip the review" | A full threshold of unreviewed change IS the risk. |
| "I can eyeball the security" | Eyeballing IS the failure mode; the verdict comes from `/security-review`, not vibes. |
| "The tests surely pass" | Assuming green is the failure; run the command or flag "not run." |
| "The conventions are obvious" | They're *documented*; read CLAUDE/AGENT/CONTEXT and check the diff against EACH rule — you miss the non-salient ones otherwise. |
| "Docs are obviously fine" | Diff them against what actually changed this session. |
| "Nothing changed, but I should list something" | A no-op checkpoint is a success — say "still grounded." |
| "The edits are obvious, I'll just apply them" | Propose-only. Never write/commit without confirm. |
| "The user picked 2 checks but I'll run them all" | Honor the selection; run what they chose, name what they skipped. |
| "I reviewed it myself, I'll call it the /security-review output" | If you didn't invoke the command, it's *manual review* — label it so; never relabel your own analysis as the tool's output. |
| "A checkpoint should end with something actionable" | Recommend only actions a real finding supports; a clean checkpoint recommends nothing — don't invent work to look useful. |

## Red flags — STOP and correct

- A security/quality verdict you did not get from the actual tool.
- Presenting your own analysis under the name of `/simplify` or `/security-review` without having invoked it.
- "Tests pass" without running them.
- Editing/committing README/CLAUDE.md without explicit approval.
- Running the full checkpoint when the user asked for something else first, or running checks they deselected.
- Inventing a finding to make a no-op (or a deselected check) look productive.
- Checking only the convention you happened to remember.
- Appending `reset=1` on a checkpoint you didn't actually complete.
- Recommending an action that no finding supports (inventing work to look useful).
