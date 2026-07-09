---
name: routing-guide
description: Reference skill for buhhdy's provider routing logic — the decision tree, model tier table, per-provider strengths, skill-to-provider affinity, and cross-review pairings. Load when reasoning about which provider to use and why, or when a task doesn't clearly match the main routing tree.
---

# routing-guide

Reference skill for buhhdy's provider routing logic. Load this when you
need to reason about which provider to use and why, or when a task doesn't
clearly match the main routing tree.

## Quick Reference: Routing Decision Tree

Apply in order; stop at first match. Before applying rule 1, 6, or 8 (which
route to gemini), check gemini's availability (Provider Strengths below) —
if unavailable, use claude_code or codex instead.

| # | Condition | Provider | Tier |
|---|-----------|----------|------|
| 1 | Native video/audio/PDF/multimodal | gemini-complex | COMPLEX |
| 2 | Native OpenAI tool (voice, image-gen, Assistants) | codex | COMPLEX |
| 3 | Complex coding: multi-file refactor, deep debugging, long agentic execution | claude_code | COMPLEX |
| 4 | Strict JSON/schema output, automation-grade instructions | codex | STANDARD |
| 5 | User-facing prose or plans under a format contract | claude_code (codex ALT) | STANDARD |
| 6 | Bulk classification/extraction/fanout (cost-dominant) | gemini-lite (claude_code fallback if unavailable/quota-low) | LIGHTWEIGHT |
| 7 | Context >200K tokens, code reasoning | claude_code or codex | COMPLEX |
| 8 | Context >200K tokens, raw documents/media/search | gemini-complex | COMPLEX |
| 9 | Default lightweight (no rule matched) | claude_code (cheapest available if unavailable) | LIGHTWEIGHT |

Rules 5, 6 (fallback only), and 9 carry a slight quota-driven claude_code
preference (we pay for Claude Max but only Pro-tier Codex/Gemini) — see
`config.yaml`'s Subscription Tier Interview and Provider Routing Decision
Tree for the full mechanics, including how a reported subscription tier can
reorder this per session. Rule 6's gemini primary is capability/cost-based,
not quota-based, and is never demoted by that reordering.

## Gemini Worker Naming (ACP migration, 2026-07-08)

buhhdy runs on stock upstream omnigent, which drives Gemini through its
generic ACP harness. ACP cannot switch gemini models per-dispatch, so each
tier is its own worker with the model baked into its ACP command:

| Worker | Model | Tier |
|---|---|---|
| gemini-complex | gemini-3.1-pro-preview | COMPLEX |
| gemini-standard | gemini-3.5-flash | STANDARD |
| gemini-lite | gemini-3.1-flash-lite | LIGHTWEIGHT |

Anywhere this guide (or any other skill) names "gemini" plus a tier or a
model, dispatch the matching gemini-* worker and OMIT args.model — it is
silently ignored for these workers. All three are ONE vendor sharing one
binary and one auth: an availability failure applies to all three at once,
and a gemini-* implementer can never be cross-reviewed by another gemini-*
worker.

## Model Tier Table (verified 2026-06-30; FRONTIER row added 2026-07-01;
opencode column added 2026-07-07)

| Tier        | claude_code      | codex          | gemini                 | opencode                |
|-------------|------------------|----------------|------------------------|-------------------------|
| FRONTIER    | claude-fable-5   | —              | —                      | —                       |
| COMPLEX     | claude-opus-4-8  | gpt-5.5        | gemini-3.1-pro-preview | openrouter/z-ai/glm-5.2 |
| STANDARD    | claude-sonnet-5  | gpt-5.4-mini   | gemini-3.5-flash       | —                       |
| LIGHTWEIGHT | claude-haiku-4-5 | gpt-5.4-nano   | gemini-3.1-flash-lite  | —                       |

## Provider Strengths Summary

**Claude (claude_code)**
- Best: multi-file refactoring, long agentic runs, subtle code logic, self-verification
- Best: writing, planning, brainstorming, explaining (prose depth)
- Weakness: native voice/image-gen, extreme-scale cheap classification, video/audio
- Note: claude-sonnet-5 (STANDARD) rivals claude-opus-4-8 on coding/agentic
  work per Anthropic's own docs — a valid cheaper COMPLEX-tier ALT for
  execution-shaped tasks, driven by model choice alone (this dispatch
  contract has no separate effort knob). Keep Opus for planning/architecture judgment
  (writing-plans, domain-modeling) where the bottleneck is judgment, not coding.
- Note: claude-fable-5 (FRONTIER) is ESCALATION-ONLY (operator directives
  2026-07-08, tightened later same day): never development dispatches —
  implementation, review, and exploration always run COMPLEX or lower —
  and NOT the default for planning/orchestration either. Routine planning
  and decomposition run claude-opus-4-8 (or claude-sonnet-5 when stakes
  are modest); Fable is reserved for the most complex work only — large
  multi-workstream decomposition, novel/hard-to-reverse architecture, or
  the heaviest cross-agent orchestration — with a stated one-line reason
  why Opus is insufficient. Metered per-token ($10/$50 per MTok, separate
  API key) as of 2026-07-08 — every dispatch is a real cost decision.

**OpenAI (codex)**
- Best: strict structured output, JSON schemas, tool routing, format contracts
- Best: narrow well-scoped changes, strict-simplify passes, automation pipelines
- Weakness: broad multi-file refactoring (route to Claude), massive long-context (route to Gemini)
- Note: o3/o4-mini fully retired; gpt-5/gpt-5-mini/gpt-4.1-nano superseded by
  gpt-5.5/gpt-5.4-mini/gpt-5.4-nano (verified 2026-06-30, cross-vendor checked).
  claude-sonnet-5 tokenizes ~30% heavier.

**Gemini (gemini)** — available again as of 2026-06-30 (an earlier headless-
OAuth failure, exit code 41 `FatalAuthenticationError`, was resolved
upstream; confirmed via a successful live dispatch).
- Best: bulk cheap ingestion, multimodal, Google Search grounding, high-volume fanout
- Best: large document corpus analysis (1M context at low cost per token)
- Weakness: subtle code logic vs Claude, nuanced long-form writing vs Claude/OpenAI
- Note: 2M context = Vertex enterprise only; standard API caps at 1M.
  gemini-2.5-pro/flash/flash-lite superseded by gemini-3.1-pro-preview/
  gemini-3.5-flash/gemini-3.1-flash-lite (verified 2026-06-30, cross-vendor).
  2.5-pro/flash confirmed shutdown no earlier than 2026-10-16; flash-lite's
  status is disputed between sources. gemini-3.1-pro-preview is PREVIEW, not GA.

**OpenCode (opencode)** — added 2026-07-07 (harness `opencode-native`,
auth = user's OpenRouter credentials, verified via live boot + dispatch).
- Best: cross-review diversity — GLM is a fourth model family, distinct from
  Anthropic/OpenAI/Google, so it's the strongest independence pick when
  reviewing any of the other three.
- Best: cost-effective COMPLEX ALT on routing rule 3 (complex coding) —
  operator-calibrated (2026-07-08) just below gemini-3.1-pro-preview at a
  far lower per-token price; route real work there when Claude quota is
  tight or metered cost dominates.
- Weakness: still thinly benchmarked in this stack — the calibration is
  operator-reported, not yet backed by observed dispatch history; treat its
  output with the same cross-review rigor as any other worker's.
- Note: one wired model, openrouter/z-ai/glm-5.2 (COMPLEX). The ID is
  OpenCode's provider/model string, partitioned on the FIRST slash into
  providerID/modelID — pass verbatim as args.model. Billing is metered
  OpenRouter credits (pay-as-you-go, no flat subscription): the standing
  quota tie-break never applies; every dispatch is a real per-token cost.

## Skill → Provider Affinity

| Skill                       | Primary      | Reviewer     | Rationale |
|-----------------------------|--------------|--------------|-----------|
| writing-skills              | claude_code  | codex        | Prose depth |
| writing-plans               | claude_code  | codex        | Long-horizon planning |
| brainstorming               | claude_code  | codex        | Exploratory depth |
| executing-plans             | claude_code  | codex        | Agentic execution |
| grounding                   | buhhdy-level | —            | buhhdy runs its own checkpoint on itself — not dispatched |
| subagent-driven-development | buhhdy-level | —            | Describes buhhdy's own fanout behavior — not dispatched |
| dispatching-parallel-agents | buhhdy-level | —            | Describes buhhdy's own parallel-dispatch behavior — not dispatched |
| explaining-plans            | codex        | claude_code  | Format-contract prose |
| requesting-code-review      | claude_code  | codex        | Code context retention |
| receiving-code-review       | claude_code  | codex        | Self-verification depth |
| strict-simplify             | codex        | claude_code  | Constraint-following diffs |
| strict-refactor             | claude_code  | codex        | Multi-file refactor strength |
| frontend-design             | claude_code  | gemini       | Aesthetic judgment |
| investigate                 | claude_code  | —            | Exploration depth (gemini runs a cheap breadth pre-pass first on large/unfamiliar codebases — see Gemini Wiring below) |
| fanout                      | claude_code  | gemini       | Parallel orchestration |
| cross-review                | opposite vendor | —         | Always cross-vendor |

## mattpocock/skills Routing

Imported from github.com/mattpocock/skills. Tiers chosen per skill, not per
provider — see the live-interview and chain notes below for dispatch mechanics.

| Skill | Tier | Purpose | Primary | Reviewer | Rationale |
|-------|------|---------|---------|----------|-----------|
| grill-me | STANDARD | explore | claude_code | codex | Thin wrapper around grilling; interview pattern, not codegen |
| grilling | STANDARD | explore | claude_code | codex | Iterative interview + light codebase reads; Claude's prose/dialogue strength |
| handoff | COMPLEX | explore | claude_code | codex + gemini (both, not alternate) | Trust-boundary redaction — a missed secret is a real leak, redundancy justified (claude_code's proposal). Writes to the OS temp dir, never the repo, so purpose is explore (no PR), not implement |
| codebase-design | STANDARD | explore | claude_code | codex (gemini alternate for large-corpus variants) | Pattern-matching critique against a fixed vocabulary; not always judging an existing diff, so review's strict definition doesn't fit |
| domain-modeling | COMPLEX | implement | claude_code | codex | Hard-to-reverse glossary/ADR decisions; commits CONTEXT.md/ADRs — a real PR |
| improve-codebase-architecture | COMPLEX | explore | claude_code | codex | Broadest-context audit; chains codebase-design + grilling + domain-modeling on ONE dispatch (never split). gemini runs a cheap breadth pre-pass first (claude_code's own proposal), feeding the chain's judgment step |
| to-issues | STANDARD | implement | codex | claude_code | Template-driven vertical-slice decomposition; OpenAI's structured-output strength. Publishes to the issue tracker — "implement" success is correct labels applied, not necessarily a PR |
| to-prd | STANDARD | implement | codex | claude_code | Synthesis from existing context against a fixed template; same tracker-publish caveat as to-issues |
| triage (discovery) | LIGHTWEIGHT | search | gemini | — | Bulk/cheap classification at volume is squarely gemini's strength (both codex and gemini proposed this independently); codex only for edge-case escalation |
| triage (deep) | COMPLEX | explore | codex | claude_code | Reproduce bugs, verify diffs, redundancy search, write agent briefs — execution-grounded debug-loop work, Codex's conceded strength. gemini runs a cheap wide-ingestion pre-pass first (codex's own proposal) — an input to the judgment call, not a replacement for it |
| loop-me | STANDARD | explore | claude_code | codex | Grilling-shaped interview for workflow specs; flagged upstream as in-progress/experimental — don't over-invest |
| writing-shape | STANDARD | implement | claude_code | codex | Long multi-turn drafting session, taste-work like grilling/loop-me — COMPLEX overrates the reasoning depth needed and multiplies cost per turn |

## Verified Availability (live-tested 2026-07-01, re-verified same day
after the two missing skills were installed)

Live dispatch tests against this machine's actual claude_code/codex
environments — not assumed from the mattpocock/skills repo alone:

- **Confirmed installed & working via natural-language dispatch:** grilling,
  codebase-design, domain-modeling, writing-shape, to-issues, to-prd,
  triage.
- **Confirmed installed, but slash-only:** grill-me, handoff,
  improve-codebase-architecture, loop-me ship with `disable-model-invocation`
  in their frontmatter, so claude_code's own Skill tool refuses to
  self-trigger any of them no matter how the dispatch instruction is worded
  (verified: identical error on retry; for loop-me specifically, the
  Skill-tool call returns the literal error "Skill loop-me cannot be used
  with Skill tool due to disable-model-invocation", which also confirms it's
  installed rather than missing). They DO work, but only when `args.input`
  literally STARTS WITH the slash command itself (e.g. `/grill-me <subject>`,
  `/loop-me <workflow>`) — that's parsed by the CLI's input layer before the
  model's turn starts, not something reachable via any tool call once the
  turn has already begun. Any dispatcher (buhhdy itself, or a human driving
  claude_code directly) MUST lead with the literal `/skill-name` text for
  these 4, not a description of the task.
- **`triage` has ONE entrypoint, not two commands:** unlike the discovery/
  deep split in buhhdy's routing table above, there is no
  `/triage-discovery` or `/triage-deep` slash command — both return "Unknown
  slash command". The single `/triage` skill (also triggers via natural
  language; no `disable-model-invocation` flag) handles both modes
  internally based on how the request is framed. buhhdy's discovery-vs-deep
  routing split is therefore a DISPATCH-FRAMING decision, not a different
  command: word `args.input` as bulk/cheap classification for gemini
  (discovery), or as reproduce/verify/redundancy-check for codex (deep).
- **History:** `triage` and `loop-me` were both reported missing on
  2026-07-01's first pass (codex returned "Unknown slash command" for every
  triage variant tried; a full repo search found no skill-definition file
  for either). The user installed both locally the same day; the re-test
  above reflects the current, working state — no `investigate`/`grilling`
  fallback substitution needed going forward.

**Live-interview mechanism** (grill-me, grilling, loop-me, writing-shape): one
persistent sub-agent session per task (fixed sys_session_send agent+title).
The sub-agent ends its turn by writing its next question in its output — no
special tool assumed. buhhdy relays that question to the human and continues
the SAME session with the answer as the next dispatch's args.input. Context and prior
codebase reads survive each relay — cost is the Q&A pair, not a re-dispatch.
If the sub-agent's harness exposes a native interactive-question tool (e.g.
Claude Code's AskUserQuestion), prefer that; otherwise this text relay works
universally.

## Gemini Wiring (added 2026-06-30)

Gemini was under-wired: only `frontend-design` and `fanout` used it (both as
reviewer), and neither core workflow routed to it by default — both were
designed while its auth was broken. Once fixed, all three providers proposed
independently where it genuinely fits, then were reconciled:

- **New primary:** `triage` (discovery) — both codex and gemini itself
  proposed this; bulk/cheap classification at volume is gemini's strength.
- **Breadth pre-pass (input, not replacement):** `investigate`,
  `improve-codebase-architecture`, `triage` (deep), `ponytail:audit` (W2) —
  gemini does a cheap wide-context sweep first; the existing primary's
  judgment dispatch consumes gemini's findings and still makes the call.
  Model: `gemini-3.5-flash` (STANDARD) for most of these — stable/GA beats
  the cheapest tier when the sweep needs to cover real breadth; use
  `gemini-3.1-flash-lite` (LIGHTWEIGHT) specifically for `ponytail:audit`'s
  diff-set sweep, per gemini's own proposal (pure bucket/pattern matching,
  no synthesis needed).
- **Added as reviewer (parallel or additional, not instead-of):** Workflow
  1's test/validation gate (parallel with codex, codex adjudicates on
  disagreement), `ponytail:review` (W1, alternate rotation with codex),
  `handoff` (additional alongside codex — redundancy justified for a
  security-sensitive skill), `codebase-design` (alternate, large-corpus
  variants only).
- **Fanout (W2 step 4):** actively consider gemini for docs/ingestion/
  test-data/UI-media sub-tasks whenever the routing tree matches it — it
  needs a real proposal to get picked, not just theoretical eligibility.
- **Deliberately NOT reassigned:** `executing-plans`, `writing-plans`,
  `brainstorming`, `strict-refactor`, `domain-modeling`,
  `grill-me`/`grilling`/`loop-me`/`writing-shape`, and `to-issues`/`to-prd`
  primary all stay claude_code/codex — all three providers agreed gemini is
  a genuinely worse choice here (subtle code logic, nuanced long-form prose).

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
| claude_code | codex, gemini, opencode |
| codex | claude_code, gemini, opencode |
| gemini | claude_code, codex, opencode |
| opencode | claude_code, codex, gemini |

Always prefer the reviewer whose model family differs from the implementer's.
A same-harness-different-model review is weaker than a true cross-vendor review.
opencode (GLM) differs from all three incumbent families at once — the
maximal-diversity reviewer pick, at metered OpenRouter cost.

## Calibration Notes

Review and update this table quarterly or when a provider announces model changes:
- OpenAI: o3/o4-mini fully retired; gpt-5/gpt-5-mini/gpt-4.1-nano superseded
  by gpt-5.5/gpt-5.4-mini/gpt-5.4-nano as of 2026-06-30 (cross-vendor verified
  — OpenAI's own GPT-5.4 mini/nano announcement, independently corroborated)
- Anthropic Sonnet 5 tokenizer: ~30% heavier than Sonnet 4 — account for cost/context
- Gemini 3.x adopted 2026-06-30: gemini-3.1-pro-preview (COMPLEX, still
  PREVIEW), gemini-3.5-flash (STANDARD, GA), gemini-3.1-flash-lite
  (LIGHTWEIGHT, GA). Re-check gemini-3.1-pro-preview for GA promotion
  quarterly — preview models can change without the same notice period.
- claude-fable-5: FRONTIER tier, claude_code only, GA. ESCALATION-ONLY per
  operator directives 2026-07-08 (tightened later same day) — never
  implementation/review/explore dispatches (those run COMPLEX or lower),
  and not the planning default either: routine planning/decomposition runs
  claude-opus-4-8 or lower. Reserve Fable for the most complex work only
  (large multi-workstream decomposition, novel/hard-to-reverse
  architecture, heaviest cross-agent orchestration), each dispatch with a
  one-line reason why Opus is insufficient. The Claude Max flat-subscription
  window ended 2026-07-07; from 2026-07-08 it requires a separate
  ANTHROPIC_API_KEY and per-token billing ($10/$50 per MTok) — every
  dispatch is a metered cost decision.
- opencode/GLM added 2026-07-07: openrouter/z-ai/glm-5.2 confirmed present
  in `opencode models` (opencode v1.17.15, openrouter auth). Operator
  calibration 2026-07-08: performance just below gemini-3.1-pro-preview,
  very cheap per token — promoted to cost-effective COMPLEX ALT on rule 3.
  Only GLM 5.2 is wired — openrouter also lists glm-5, glm-5-turbo, glm-5.1
  etc.; add tiers only when a real routing need appears. Re-check quarterly
  like the rest.
