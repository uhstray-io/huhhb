---
name: grounding
description: >
  Use when a long working session should pause for a grounding checkpoint — fired by the huhhb
  grounding hook after the configured interval (default 2h) or on returning from a long break, or
  run manually to re-engage with in-flight work before it drifts. Triggers on "grounding",
  "/grounding", "grounding checkpoint", "ground the session", "are we still on track", "checkpoint
  the session". Opt-in via huhhb; off by default.
---

# Grounding

A periodic checkpoint that keeps a long session grounded. Off by default — opt in via the huhhb
grounding hook (`~/.claude/grounding.on`) or run `/grounding`. The hook nudges on a cadence (default
2h); it can only nudge, not force — treat a nudge as standing intent and checkpoint at the next pause.

Four goals: keep track of in-flight work · keep changes aligned to the repo's documented principles ·
improve code quality · keep alignment on goals/outcomes.

## First run (one-time setup)

If `~/.claude/grounding.on` is missing or has no `interval_min`, offer to enable grounding: ask the
preferred checkpoint interval and write `interval_min=<minutes>` to that marker — **default 2h (120)**
if no answer is given. Then continue. Skip this once configured; manual `/grounding` runs proceed
regardless.

## First: don't hijack

If the user has a pending request, handle it first — a bug, incident, or direct question outranks the
nudge. Offer the checkpoint at the next natural pause.

## Then: read state, skip a no-op

Read `git status`, `git diff --stat`, and the diff since `last_ground`. If nothing meaningful changed,
say "still grounded — nothing to do" and stop. Never invent findings to look useful.

## Offer the menu, then run the selected checks

List these checks (numbered) and ask which to run — **default: all**; the user replies "all" (or just
confirms), a subset (e.g. "2, 4"), or "skip". Run **only** what they pick, in order; name any they
skipped in the report (their choice — never a silent omission).

1. **Work snapshot** — `git status` + `git diff --stat`; surface uncommitted/unpushed work, suggest
   logical-chunk commits. Never commit yourself.
2. **Code review** — actually invoke `/simplify`, then `/security-review`; report *their* output. Don't
   substitute an eyeballed verdict for the tool. If you did **not** literally invoke the command this
   turn (not installed, or you only read the code yourself), label it **"manual review — command not
   invoked"** — never present your own analysis as `/simplify` or `/security-review` output.
3. **Test/build/lint health** — detect and run the project's test/lint command (from `package.json`,
   `pyproject.toml`, `Makefile`, …), or offer to; report the real result. Never claim "tests pass"
   unrun; flag untested changes.
4. **Repo conformance** — read CLAUDE.md, AGENT.md, CONTEXT.md, CONTRIBUTING, docs/ and check the diff
   against **each** documented rule, methodically — not just the one that springs to mind. No such docs?
   say so; don't invent rules.
5. **Goal/scope** — compare the work to the session's stated objective; flag drift.
6. **Gaps & next steps** — what's missing/assumed; re-confirm the expected next steps.

## Report, propose, close

Render the report (template in `reference.md`) for the checks that ran, naming any skipped. Propose any
doc/conformance edits as a **confirm-first diff** — never write or commit unprompted. Ask ≤3 clarifying
questions. When the checkpoint genuinely completes, record `last_ground` by writing to the state-file
path the hook named in its nudge (only you know it actually finished). "stop grounding" disables for the
session, "not now" snoozes, "skip" skips once.

**Honest limitation:** the hook nudges, it doesn't force; the cadence is best-effort. Full report
template, rationalization table, and red-flags: `reference.md`.
