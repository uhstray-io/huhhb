# buhhdy

A three-provider Polly orchestration config that routes tasks across
**Claude (Anthropic)**, **OpenAI (ChatGPT/Codex)**, and **Google Gemini**
based on task complexity, context requirements, and provider strengths.

Built through a three-round collaborative design process: each provider's
research agent proposed its own model tier strategy, challenged the other
two proposals, and converged on the routing rules in this config.

## Structure

```text
buhhdy/
├── config.yaml                    ← Main orchestrator (buhhdy brain)
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

Both end with a deliverable PR, not a merge — see Merge Authorization below
for the only conditions under which buhhdy merges one itself.

## Provider Routing at a Glance

| Task Type | Provider | Model |
|-----------|----------|-------|
| Complex multi-file coding, agentic runs | Claude | claude-opus-4-8 |
| Strict JSON/schema, format contracts | OpenAI | gpt-5.4-mini |
| User-facing prose, explanations | OpenAI | gpt-5.4-mini |
| Multimodal, video/audio/PDF | Gemini | gemini-3.1-pro-preview |
| Bulk classification, high-volume fanout | Gemini | gemini-3.1-flash-lite |
| Standard implementation | Claude | claude-sonnet-5 |
| Standard structured tasks | OpenAI | gpt-5.4-mini |
| Lightweight default | cheapest tier | see routing-guide |

## Skills Bundled

Native buhhdy skills (in `skills/`):
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

### First run: subscription tier interview

On your first message in a new buhhdy session, it will ask which subscription
tier you currently have for each provider (Claude, Codex/ChatGPT, Gemini —
free / standard paid / top-tier paid / pay-as-you-go API is a fine answer).
It's a quick question, not a gate — buhhdy proceeds with your actual request
either way. Your answer ranks the three providers by usage headroom and
lightly biases routing toward whichever has the most room before hitting its
cap this cycle (see the Provider Routing Decision Tree's quota tie-break in
`config.yaml` for exactly which rules this affects — it never overrides a
rule that's about provider capability, not cost). Skip the question and it
defaults to our actual current plans: Claude Max, Codex Pro, Gemini Pro. This
isn't persisted across sessions — expect the question again next time.

> **Gemini is available.** An earlier headless-OAuth failure (the gemini harness's
> OAuth-personal auth, exit code 42) was resolved upstream as of 2026-06-30 —
> confirmed via a successful live dispatch. buhhdy now routes across all
> three providers; see Failure Recovery in `config.yaml` if it regresses.

### Deploy

**Verified 2026-07-01 against the real `omnigent` CLI** — there is no
`agent register` subcommand (an earlier draft of this doc claimed one that
never existed). The real command is `run`, which accepts an agent directory
or YAML file directly:

```bash
# From wherever buhhdy/ lives on disk — launches a session immediately
omnigent run buhhdy

# Or point at the config file explicitly
omnigent run buhhdy/config.yaml

# To register it as a durable, reusable agent (not just a one-off local
# launch), use the Omnigent MCP tool sys_session_create with
# config_path: buhhdy — this is what produced the registered
# agent_id this repo's PR history references. `omnigent run --server`
# uploads the YAML too, but its own --help documents that upload as
# "ephemeral" rather than a persistent registration.

# Copying into the omnigent examples directory also still works, if you'd
# rather colocate it there:
cp -r /path/to/buhhdy examples/buhhdy
```

## Cross-Review Pairings

| Implementer | Valid reviewers |
|-------------|----------------|
| claude_code | codex, gemini |
| codex | claude_code, gemini |
| gemini | claude_code, codex |

The reviewer is always a different vendor than the implementer. PRs are the
deliverable; the human merges by default. Exception: buhhdy may open a PR
for its own direct docs/config commits (non-code authoring, not a delegated
coding task).

## Merge Authorization

Default: buhhdy never merges. This flips ONLY on an explicit grant from
the human in the conversation — either a specific request ("merge PR #13")
or a standing permission grant, scoped to exactly what was said. Vague
approval ("looks good", "ship it") never counts. Never inferred from
silence or context. See `config.yaml`'s Merge Authorization section for the
full protocol, including the requirement to verify the PR is actually
mergeable before acting on a grant.

## Key Calibration Notes (2026-06-30)

- **gpt-5.5/gpt-5.4-mini/gpt-5.4-nano supersede gpt-5/gpt-5-mini/gpt-4.1-nano**
  (verified 2026-06-30, cross-vendor checked against OpenAI's own GPT-5.4
  mini/nano announcement). o3/o4-mini are fully retired.
- **claude-sonnet-5 tokenizer** — ~30% heavier than Sonnet 4; account for
  cost and context-fit when sizing tasks.
- **Gemini 2M context** — Vertex AI enterprise only; standard API caps at 1M.
  Do not route standard API tasks expecting 2M context.
- **Gemini bumped to the 3.x family** (verified 2026-06-30, cross-vendor:
  codex + gemini itself, both citing Google's own docs) —
  gemini-2.5-pro/flash/flash-lite superseded by
  gemini-3.1-pro-preview/gemini-3.5-flash/gemini-3.1-flash-lite. 2.5-pro/flash
  have a confirmed shutdown no earlier than 2026-10-16; flash-lite's exact
  status is disputed between sources. gemini-3.1-pro-preview is PREVIEW, not
  GA. gemini-2.0-flash-lite was fully shut down 2026-06-01.
- **claude-fable-5 is not generally available right now** (direct operator
  correction, 2026-06-30) — do not route to it regardless of any model-docs
  citation claiming otherwise. claude-opus-4-8 is the top (COMPLEX) GA tier.
- **claude-sonnet-5 added as a COMPLEX-tier ALT** for coding/agentic-shaped
  tasks — near-Opus quality per Anthropic's own docs, cheaper than
  claude-opus-4-8. Reserve Opus for planning/architecture judgment.
- **Gemini is available again (2026-06-30)** — the earlier headless-OAuth
  failure (exit code 42) was resolved upstream, confirmed via a successful
  live dispatch. buhhdy routes across all three providers again.

Review the routing-guide skill and this README quarterly as providers evolve.
