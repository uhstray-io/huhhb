# routing-guide

Reference skill for polly-tri's provider routing logic. Load this when you
need to reason about which provider to use and why, or when a task doesn't
clearly match the main routing tree.

## Quick Reference: Routing Decision Tree

Apply in order; stop at first match. Before applying rule 1, 6, or 8 (which
route to gemini), check gemini's availability (Provider Strengths below) —
if unavailable, use claude_code or codex instead.

| # | Condition | Provider | Tier |
|---|-----------|----------|------|
| 1 | Native video/audio/PDF/multimodal | gemini | COMPLEX |
| 2 | Native OpenAI tool (voice, image-gen, Assistants) | codex | COMPLEX |
| 3 | Complex coding: multi-file refactor, deep debugging, long agentic execution | claude_code | COMPLEX |
| 4 | Strict JSON/schema output, automation-grade instructions | codex | STANDARD |
| 5 | User-facing prose or plans under a format contract | codex | STANDARD |
| 6 | Bulk classification/extraction/fanout (cost-dominant) | gemini | LIGHTWEIGHT |
| 7 | Context >200K tokens, code reasoning | claude_code or codex | varies |
| 8 | Context >200K tokens, raw documents/media/search | gemini | COMPLEX |
| 9 | Default lightweight (no rule matched) | cheapest available | LIGHTWEIGHT |

## Model Tier Table (verified 2026-06-30)

| Tier        | claude_code      | codex          | gemini                |
|-------------|------------------|----------------|-----------------------|
| COMPLEX     | claude-opus-4-8  | gpt-5.5        | gemini-2.5-pro        |
| STANDARD    | claude-sonnet-5  | gpt-5.4-mini   | gemini-2.5-flash      |
| LIGHTWEIGHT | claude-haiku-4-5 | gpt-5.4-nano   | gemini-2.5-flash-lite |

## Provider Strengths Summary

**Claude (claude_code)**
- Best: multi-file refactoring, long agentic runs, subtle code logic, self-verification
- Best: writing, planning, brainstorming, explaining (prose depth)
- Weakness: native voice/image-gen, extreme-scale cheap classification, video/audio
- Note: claude-sonnet-5 (STANDARD) at effort=xhigh rivals claude-opus-4-8 on
  coding/agentic work per Anthropic's own docs — a valid cheaper COMPLEX-tier
  ALT for execution-shaped tasks. Keep Opus for planning/architecture judgment
  (writing-plans, domain-modeling) where the bottleneck is judgment, not coding.

**OpenAI (codex)**
- Best: strict structured output, JSON schemas, tool routing, format contracts
- Best: narrow well-scoped changes, strict-simplify passes, automation pipelines
- Weakness: broad multi-file refactoring (route to Claude), massive long-context (route to Gemini)
- Note: o3/o4-mini fully retired; gpt-5/gpt-5-mini/gpt-4.1-nano superseded by
  gpt-5.5/gpt-5.4-mini/gpt-5.4-nano (verified 2026-06-30, cross-vendor checked).
  claude-sonnet-5 tokenizes ~30% heavier.

**Gemini (gemini)** — available again as of 2026-06-30 (an earlier headless-
OAuth failure, exit code 42, was resolved upstream; confirmed via a
successful live dispatch).
- Best: bulk cheap ingestion, multimodal, Google Search grounding, high-volume fanout
- Best: large document corpus analysis (1M context at low cost per token)
- Weakness: subtle code logic vs Claude, nuanced long-form writing vs Claude/OpenAI
- Note: 2M context = Vertex enterprise only; standard API caps at 1M.
  gemini-2.0-flash-lite deprecated → use gemini-2.5-flash-lite.

## Skill → Provider Affinity

| Skill                       | Primary      | Reviewer     | Rationale |
|-----------------------------|--------------|--------------|-----------|
| writing-skills              | claude_code  | codex        | Prose depth |
| writing-plans               | claude_code  | codex        | Long-horizon planning |
| brainstorming               | claude_code  | codex        | Exploratory depth |
| executing-plans             | claude_code  | codex        | Agentic execution |
| grounding                   | polly-level  | —            | Polly runs its own checkpoint on itself — not dispatched |
| subagent-driven-development | polly-level  | —            | Describes polly's own fanout behavior — not dispatched |
| dispatching-parallel-agents | polly-level  | —            | Describes polly's own parallel-dispatch behavior — not dispatched |
| explaining-plans            | codex        | claude_code  | Format-contract prose |
| requesting-code-review      | claude_code  | codex        | Code context retention |
| receiving-code-review       | claude_code  | codex        | Self-verification depth |
| strict-simplify             | codex        | claude_code  | Constraint-following diffs |
| strict-refactor             | claude_code  | codex        | Multi-file refactor strength |
| frontend-design             | claude_code  | gemini       | Aesthetic judgment |
| investigate                 | claude_code  | —            | Exploration depth |
| fanout                      | claude_code  | gemini       | Parallel orchestration |
| cross-review                | opposite vendor | —         | Always cross-vendor |

## mattpocock/skills Routing

Imported from github.com/mattpocock/skills. Tiers chosen per skill, not per
provider — see the live-interview and chain notes below for dispatch mechanics.

| Skill | Tier | Purpose | Primary | Reviewer | Rationale |
|-------|------|---------|---------|----------|-----------|
| grill-me | STANDARD | explore | claude_code | codex | Thin wrapper around grilling; interview pattern, not codegen |
| grilling | STANDARD | explore | claude_code | codex | Iterative interview + light codebase reads; Claude's prose/dialogue strength |
| handoff | COMPLEX | explore | claude_code | codex | Trust-boundary redaction — a missed secret is a real leak. Writes to the OS temp dir, never the repo, so purpose is explore (no PR), not implement |
| codebase-design | STANDARD | explore | claude_code | codex | Pattern-matching critique against a fixed vocabulary; not always judging an existing diff, so review's strict definition doesn't fit |
| domain-modeling | COMPLEX | implement | claude_code | codex | Hard-to-reverse glossary/ADR decisions; commits CONTEXT.md/ADRs — a real PR |
| improve-codebase-architecture | COMPLEX | explore | claude_code | codex | Broadest-context audit; chains codebase-design + grilling + domain-modeling on ONE dispatch (never split) |
| to-issues | STANDARD | implement | codex | claude_code | Template-driven vertical-slice decomposition; OpenAI's structured-output strength. Publishes to the issue tracker — "implement" success is correct labels applied, not necessarily a PR |
| to-prd | STANDARD | implement | codex | claude_code | Synthesis from existing context against a fixed template; same tracker-publish caveat as to-issues |
| triage (discovery) | LIGHTWEIGHT | search | codex | — | Cheap bucket/list retrieval at volume; too cheap to be worth a review pass |
| triage (deep) | COMPLEX | explore | codex | claude_code | Reproduce bugs, verify diffs, redundancy search, write agent briefs — execution-grounded debug-loop work, Codex's conceded strength |
| loop-me | STANDARD | explore | claude_code | codex | Grilling-shaped interview for workflow specs; flagged upstream as in-progress/experimental — don't over-invest |
| writing-shape | STANDARD | implement | claude_code | codex | Long multi-turn drafting session, taste-work like grilling/loop-me — COMPLEX overrates the reasoning depth needed and multiplies cost per turn |

**Live-interview mechanism** (grill-me, grilling, loop-me, writing-shape): one
persistent sub-agent session per task (fixed sys_session_send agent+title).
The sub-agent ends its turn by writing its next question in its output — no
special tool assumed. Polly relays that question to the human and continues
the SAME session with the answer as the next dispatch's args.input. Context and prior
codebase reads survive each relay — cost is the Q&A pair, not a re-dispatch.
If the sub-agent's harness exposes a native interactive-question tool (e.g.
Claude Code's AskUserQuestion), prefer that; otherwise this text relay works
universally.

## External Plugins Reference

| Plugin | Source | When to use |
|--------|--------|-------------|
| ponytail | DietrichGebert/ponytail | All implementation tasks (YAGNI, smallest diff) |
| improve | shadcn/improve | Before fanout when spec is ambiguous — writes plans/ |
| skillspector | nvidia/skillspector | Preflight before importing any third-party skill |
| frontend-design | anthropics/skills | Any user-facing component implementation |
| huhhb/* | uhstray-io/huhhb | See skill dispatch table above |
| mattpocock/skills | mattpocock/skills | grill-me, grilling, handoff, codebase-design, domain-modeling, improve-codebase-architecture, to-issues, to-prd, triage, loop-me, writing-shape — see mattpocock/skills Routing above |

## Cross-Review Pairings

| Implementer | Valid reviewers |
|-------------|----------------|
| claude_code | codex, gemini |
| codex | claude_code, gemini |
| gemini | claude_code, codex |

Always prefer the reviewer whose model family differs from the implementer's.
A same-harness-different-model review is weaker than a true cross-vendor review.

## Calibration Notes

Review and update this table quarterly or when a provider announces model changes:
- OpenAI: o3/o4-mini fully retired; gpt-5/gpt-5-mini/gpt-4.1-nano superseded
  by gpt-5.5/gpt-5.4-mini/gpt-5.4-nano as of 2026-06-30 (cross-vendor verified
  — OpenAI's own GPT-5.4 mini/nano announcement, independently corroborated)
- Anthropic Sonnet 5 tokenizer: ~30% heavier than Sonnet 4 — account for cost/context
- Gemini 3.x models: gemini-3.5-flash and gemini-3.1-pro-preview exist; evaluate
  for COMPLEX/STANDARD tiers when Gemini 2.5 approaches deprecation
- claude-fable-5 is NOT generally available right now (direct operator
  correction, 2026-06-30) — do not route to it regardless of any model-docs
  citation claiming otherwise. claude-opus-4-8 is the top GA Claude tier.
