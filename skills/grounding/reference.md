# Grounding — reference (mechanics · report template · rationalizations)

Heavy detail for the `grounding` skill, kept out of `SKILL.md` to keep it lean.

## State, clock, interval (mechanics)

- **Opt-in marker** `~/.claude/grounding.on`: its existence = enabled. It may contain `interval_min=<n>`
  (set at onboarding; default 120). `HUHHB_GROUNDING_INTERVAL_MIN` env overrides.
- **Per-session clock** `${TMPDIR:-/tmp}/huhhb-grounding-<session_id>`: holds `last_ground=<epoch>` and
  `last_prompt=<epoch>`. The hook reads/writes the timestamps and **passes the exact path in its nudge**.
- **Clock reset is the skill's job.** The hook cannot know the checkpoint actually finished, so the
  SKILL stamps `last_ground` at the end of a genuinely completed checkpoint — write a temp file then
  `mv` it over the path the hook named (atomic). Only stamp on a real checkpoint, never on a no-op skip.

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

Proposed edits (confirm-first): <diffs, if any> — nothing applied yet.
Questions (≤3): …
```

## Rationalization table (STOP if you catch yourself here)

| Excuse | Reality |
| --- | --- |
| "We're in a hurry, skip the review" | A full interval of unreviewed change IS the risk. |
| "I can eyeball the security" | Eyeballing IS the failure mode; the verdict comes from `/security-review`, not vibes. |
| "The tests surely pass" | Assuming green is the failure; run the command or flag "not run." |
| "The conventions are obvious" | They're *documented*; read CLAUDE/AGENT/CONTEXT and check the diff against EACH rule — you miss the non-salient ones otherwise. |
| "Docs are obviously fine" | Diff them against what actually changed this session. |
| "Nothing changed, but I should list something" | A no-op checkpoint is a success — say "still grounded." |
| "The edits are obvious, I'll just apply them" | Propose-only. Never write/commit without confirm. |
| "The user picked 2 checks but I'll run them all" | Honor the selection; run what they chose, name what they skipped. |

## Red flags — STOP and correct

- A security/quality verdict you did not get from the actual tool.
- "Tests pass" without running them.
- Editing/committing README/CLAUDE.md without explicit approval.
- Running the full checkpoint when the user asked for something else first, or running checks they deselected.
- Inventing a finding to make a no-op (or a deselected check) look productive.
- Checking only the convention you happened to remember.
- Stamping `last_ground` on a checkpoint you didn't actually complete.
