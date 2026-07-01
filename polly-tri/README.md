# polly-tri

A three-provider Polly orchestration config that routes tasks across
**Claude (Anthropic)**, **OpenAI (ChatGPT/Codex)**, and **Google Gemini**
based on task complexity, context requirements, and provider strengths.

Built through a three-round collaborative design process: each provider's
research agent proposed its own model tier strategy, challenged the other
two proposals, and converged on the routing rules in this config.

## Structure

```
polly-tri/
├── config.yaml                    ← Main orchestrator (polly-tri brain)
├── agents/
│   ├── claude_code/config.yaml    ← Anthropic Claude sub-agent
│   ├── codex/config.yaml          ← OpenAI Codex sub-agent
│   └── gemini/config.yaml         ← Google Gemini sub-agent
├── skills/
│   ├── routing-guide/SKILL.md    ← Provider routing reference (load on demand)
│   └── core-workflows/SKILL.md   ← The two standard planning/dev workflows
└── README.md                      ← This file
```

## Core Workflows

Two fixed, repeatable sequences — full detail (provider/purpose/tier/gate per
step) in `skills/core-workflows/SKILL.md`:

1. **Planning & Research** — brainstorming -> investigate -> grilling ->
   writing-plans -> gate (test/validation coverage) -> explaining-plans ->
   codebase-design -> to-issues -> simplify -> ponytail:review.
2. **Development** (from an existing plan) — investigate -> executing-plans ->
   subagent-driven-development -> dispatching-parallel-agents ->
   ponytail:audit -> grounding -> update docs -> commit + push -> open a PR.

Both end with polly-tri never merging — every PR they produce waits for the
human.

## Provider Routing at a Glance

| Task Type | Provider | Model |
|-----------|----------|-------|
| Complex multi-file coding, agentic runs | Claude | claude-opus-4-8 |
| Strict JSON/schema, format contracts | OpenAI | gpt-5.4-mini |
| User-facing prose, explanations | OpenAI | gpt-5.4-mini |
| Multimodal, video/audio/PDF | Gemini | gemini-2.5-pro |
| Bulk classification, high-volume fanout | Gemini | gemini-2.5-flash-lite |
| Standard implementation | Claude | claude-sonnet-5 |
| Standard structured tasks | OpenAI | gpt-5.4-mini |
| Lightweight default | cheapest tier | see routing-guide |

## Skills Bundled

Native polly-tri skills (in `skills/`):
- **routing-guide** — full routing decision tree, tier table, skill affinity map
- **core-workflows** — the two standard planning/development sequences above

External skills (referenced, not bundled — must be installed separately):
- [ponytail](https://github.com/DietrichGebert/ponytail) — lazy-dev style (YAGNI, smallest diff)
- [improve](https://github.com/shadcn/improve) — planning advisor before fanout
- [skillspector](https://github.com/nvidia/skillspector) — security scanner for skills
- [huhhb](https://github.com/uhstray-io/huhhb) — writing-plans, brainstorming, grounding, etc.
- [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) — UI design guidance
- [mattpocock/skills](https://github.com/mattpocock/skills) — grill-me, grilling,
  handoff, codebase-design, domain-modeling, improve-codebase-architecture,
  to-issues, to-prd, triage, loop-me, writing-shape. Routed entirely between
  claude_code and codex — see routing-guide's "mattpocock/skills Routing"
  table. Live-interview skills (grill-me, grilling, loop-me, writing-shape)
  use a persistent-session relay so they stay genuinely subagent-driven.

Polly-native skills (from omnigent):
- investigate, fanout, cross-review

## Setup

### Requirements

```bash
# All three CLIs must be on PATH
command -v claude codex gemini
```

> **Gemini is available.** An earlier headless-OAuth failure (gemini-native's
> OAuth-personal auth, exit code 42) was resolved upstream as of 2026-06-30 —
> confirmed via a successful live dispatch. polly-tri now routes across all
> three providers; see Failure Recovery in `config.yaml` if it regresses.

### Deploy

Copy `polly-tri/` into the omnigent examples directory or register it directly:

```bash
# From your omnigent repo root
cp -r /path/to/polly-tri examples/polly-tri

# Or register from any path
omnigent agent register ./polly-tri/config.yaml
```

## Cross-Review Pairings

| Implementer | Valid reviewers |
|-------------|----------------|
| claude_code | codex, gemini |
| codex | claude_code, gemini |
| gemini | claude_code, codex |

The reviewer is always a different vendor than the implementer. polly-tri
never merges — PRs are the deliverable; the human merges. Exception: polly-tri
may open a PR for its own direct docs/config commits (non-code authoring,
not a delegated coding task).

## Key Calibration Notes (2026-06-30)

- **gpt-5.5/gpt-5.4-mini/gpt-5.4-nano supersede gpt-5/gpt-5-mini/gpt-4.1-nano**
  (verified 2026-06-30, cross-vendor checked against OpenAI's own GPT-5.4
  mini/nano announcement). o3/o4-mini are fully retired.
- **claude-sonnet-5 tokenizer** — ~30% heavier than Sonnet 4; account for
  cost and context-fit when sizing tasks.
- **Gemini 2M context** — Vertex AI enterprise only; standard API caps at 1M.
  Do not route standard API tasks expecting 2M context.
- **gemini-2.0-flash-lite deprecated** — use gemini-2.5-flash-lite.
- **claude-fable-5 is not generally available right now** (direct operator
  correction, 2026-06-30) — do not route to it regardless of any model-docs
  citation claiming otherwise. claude-opus-4-8 is the top (COMPLEX) GA tier.
- **claude-sonnet-5 added as a COMPLEX-tier ALT** (effort=xhigh) for
  coding/agentic-shaped tasks — near-Opus quality per Anthropic's own docs,
  cheaper than claude-opus-4-8. Reserve Opus for planning/architecture judgment.
- **Gemini is available again (2026-06-30)** — the earlier headless-OAuth
  failure (exit code 42) was resolved upstream, confirmed via a successful
  live dispatch. polly-tri routes across all three providers again.

Review the routing-guide skill and this README quarterly as providers evolve.
