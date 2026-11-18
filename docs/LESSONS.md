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
