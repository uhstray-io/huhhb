# LESSONS.md — constraints learned from accepted work

Author: Joseph A. Wisneski IV

One continuous, append-only record of what merged work taught, so the next plan starts where the
last one ended. Failures and the rules they earned live in `docs/MISTAKES.md`; this file holds
constraints learned from work that was accepted. Entry format: `~/.claude/docs/lessons-format.md`.
A session that plans work reads this file and the `docs/MISTAKES.md` Index before cutting it.

### L-001 · 2026-11-17 · hooks

- **ACCEPTED:** PR #64, grounding nudges only on typed prompts (HUHHB-161).
- **DERIVED:** `UserPromptSubmit` fires on turns Claude Code starts by itself, not only on what a
  person types. A background-task turn arrives with a `prompt` that begins with
  `<task-notification>` (observed in the hook payload of a live headless session, 2026-11-17).
  Session transcripts record cross-session messages and CI monitor events as prompts with their
  own leading tags (`<cross-session-message …>`, `<ci-monitor-event>`). A hook that means "the
  person did something" must check the prompt's leading tag; the event alone does not say a
  person is present, and the time since the previous prompt does not say they came back.
- **APPLIES TO:** any `UserPromptSubmit` hook under `hooks/`, and any rule keyed to prompt
  timing or prompt count.

### L-002 · 2026-11-20 · skill bench

- **ACCEPTED:** PR #65, the `prune-tests` skill, forked from `caldoai/skills`, with its bench
  scenarios (HUHHB-167).
- **DERIVED:** Write a bench scenario only for a rule the model does not already follow, and find
  that out before writing the rest. Run each candidate prompt once with the skill unreachable (an
  empty working directory, the skill not installed) and keep the ones that fail. For
  `prune-tests`, the clean baseline on `claude-opus-5-5` passed both prompts that only asked for
  tests to be classified (a duplicate, a guard on removed code, a mocked unit, a derived expected
  value, a private-state assert). On the two prompts that also need production code removed
  because it existed only for a pruned test, the baseline passed 3 of 6 runs over two bench runs
  (`9dca0501`, `55f605c2`) and the skill arm 12 of 12; one unchanged prompt's baseline went from
  0 of 2 to 2 of 2.
- **APPLIES TO:** `tests/bench/<skill>.json` for any new or imported skill, and any plan that
  estimates what a skill adds.
