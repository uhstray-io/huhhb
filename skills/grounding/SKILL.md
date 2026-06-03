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

A periodic, opt-in checkpoint that keeps a long session grounded — four goals: keep track of in-flight
work, keep changes aligned to the repo's documented principles, improve code quality, and re-confirm
goals/outcomes. Enable via the huhhb hook (`~/.claude/grounding.on`) or run `/grounding`. The hook only
*nudges* (best-effort, never forced) — treat a nudge as standing intent and checkpoint at the next pause.
Mechanics, report template, rationalization table, and red-flags live in **`reference.md`**.

## Order of operations

1. **First run** — if `~/.claude/grounding.on` has no `interval_min`, ask the preferred interval
   (**default 2h**) and persist it. Skip once configured; manual runs proceed regardless.
2. **Don't hijack** — if the user has a pending request (bug, incident, question), handle it first and
   offer the checkpoint at the next pause.
3. **Read state, skip no-ops** — gather the work since `last_ground` (uncommitted changes **plus**
   commits since that epoch; see `reference.md` for the exact range). Nothing meaningful changed? say
   "still grounded — nothing to do" and stop. Never invent findings.
4. **Offer the menu** — list the six checks; the user picks (**default all**, a subset, or "skip"). Run
   **only** what they pick; name any skipped — never a silent omission or a fabricated result.

## The checks (run the selected, in order)

1. **Work snapshot** — `git status` + `git diff --stat`; surface uncommitted/unpushed work and suggest
   logical-chunk commits. Never commit yourself.
2. **Code review** — actually run `/simplify` then `/security-review` and report *their* output, not an
   eyeballed verdict. Didn't/can't invoke it? say "manual review — command not invoked"; never relabel
   your own analysis as the tool's output.
3. **Test/build/lint** — detect and run the project's test/lint command (`package.json`/`pyproject`/
   `Makefile`/…), or offer to; report the real result. Never claim "tests pass" unrun.
4. **Repo conformance** — read CLAUDE.md / AGENT.md / CONTEXT.md / CONTRIBUTING / docs and check the work
   against **each** documented rule, not just the salient one. No docs? say so; don't invent rules.
5. **Goal/scope** — compare the work to the session's stated objective; flag drift.
6. **Gaps & next steps** — what's missing or assumed; re-confirm the next steps.

## Report, recommend, close

Render the report (`reference.md` template) for the checks that ran, naming any skipped. Synthesize the
findings into a short **prioritized "Recommended actions" list** — concrete, ranked (blockers/security
first), each tied to its finding — and **offer to carry them out (confirm-first)**. Recommend only what a
real finding supports; a clean checkpoint recommends nothing — never invent work. Propose any edits as a
confirm-first diff; never write or commit unprompted. Ask ≤3 questions. When the checkpoint genuinely
completes, stamp `last_ground` to the state-file path the hook named (only you know it finished). "stop
grounding" disables, "not now" snoozes, "skip" skips once.
