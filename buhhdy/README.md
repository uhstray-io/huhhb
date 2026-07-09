# buhhdy

A four-provider Polly orchestration config that routes tasks across
**Claude (Anthropic)**, **OpenAI (ChatGPT/Codex)**, **Google Gemini**, and
**OpenCode (Zhipu GLM via OpenRouter)** based on task complexity, context
requirements, and provider strengths.

Built through a three-round collaborative design process: each provider's
research agent proposed its own model tier strategy, challenged the other
two proposals, and converged on the routing rules in this config.

## Getting Started

New here? Follow this in order — it's a one-time setup per machine.

### 1. Install the omnigent runtime (stock upstream)

buhhdy runs on the public **`omnigent-ai/omnigent`** runtime. The old
`uhstray-io/omnigent` fork — which existed to carry a custom `gemini`
harness — is retired as of 2026-07-08: upstream's generic ACP harness
replaced it (see "Gemini via ACP" below). If you still have the fork
installed, reinstall from upstream.

```bash
# Recommended: uv tool install, straight from upstream
uv tool install git+https://github.com/omnigent-ai/omnigent.git
```

### 2. Install and sign in to each CLI

buhhdy dispatches real work to four separate coding CLIs. Install and
authenticate each one before your first run — a one-time step per machine.

| Provider | Install | Docs |
|---|---|---|
| **Claude Code** (Anthropic) | `curl -fsSL https://claude.ai/install.sh \| bash` (macOS/Linux/WSL) — or `npm install -g @anthropic-ai/claude-code` | [Setup](https://code.claude.com/docs/en/setup) · [Auth](https://code.claude.com/docs/en/authentication) |
| **Codex CLI** (OpenAI) | `npm install -g @openai/codex` (must be the `@openai/codex` scope — an unscoped `codex` package is an unrelated, unmaintained package) — or `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` | [CLI](https://developers.openai.com/codex/cli) · [Auth](https://developers.openai.com/codex/auth) |
| **Gemini CLI** (Google) | `npm install -g @google/gemini-cli` — or `npx @google/gemini-cli` (no install) | [Repo](https://github.com/google-gemini/gemini-cli) · [Auth](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.mdx) |

Then sign in to each:

- **Claude Code** — run `claude`; it opens a browser to log in with your
  Claude.ai account (Pro/Max/Team/Enterprise), or choose Claude Console for
  API-billed usage instead. An `ANTHROPIC_API_KEY` env var, if set, takes
  precedence over subscription login.
- **Codex** — run `codex login`; opens a browser to sign in with your
  ChatGPT account (Plus/Pro/Business/Edu/Enterprise plan credits). For
  OpenAI-Platform API-key billing instead of plan credits:
  `codex login --with-api-key`.
- **Gemini CLI** — run `gemini`; the picker offers **"Sign in with Google"**
  (free personal Google account, browser OAuth — this is the default,
  no-cost path) or **"Use Gemini API key"** (`GEMINI_API_KEY` env var from
  [Google AI Studio](https://aistudio.google.com/apikey), pay-as-you-go) or
  **Vertex AI**. Google auth flows are the part most likely to drift over
  time — if "Sign in with Google" ever stops working for your account tier,
  fall back to the API key. **Tier callout:** mid-2026 reports describe
  Google restricting legacy `gemini` CLI access for consumer tiers
  (free/Pro/Ultra), with team/business (Workspace/Code Assist) licenses and
  paid API keys as the carve-outs. This deployment runs a team/business
  Google subscription and was live-verified working 2026-07-09
  (`gemini -m gemini-3.1-flash-lite -p` round-trip) — re-verify after any
  Google plan change; a tier/auth failure downs all three `gemini-*`
  workers at once. (An earlier headless-OAuth failure — token
  refresh needs a browser — was resolved as of 2026-06-30. If Gemini auth
  fails headlessly again, all three gemini-* workers are down together; see
  Failure Recovery in `config.yaml`.)

**OpenCode** — the fourth worker (`opencode`, Zhipu GLM 5.2 via
OpenRouter) needs the `opencode` CLI on PATH with your OpenRouter
credentials configured — see `agents/opencode/config.yaml` for the wiring;
billing is metered OpenRouter credits, not a subscription.

### Gemini via ACP (one-time machine config)

Upstream omnigent drives Gemini through its generic ACP harness: it spawns
`gemini --acp` as a subprocess and bridges tool calls over the ACP
protocol. ACP cannot switch models per-dispatch, so buhhdy ships three
tier-pinned gemini workers (`gemini-complex` / `gemini-standard` /
`gemini-lite`), each pointing at its own `acp:` entry with the model baked
into the command. Add this block to `~/.omnigent/config.yaml`:

```yaml
acp:
  agents:
    - {name: Gemini Complex, command: "gemini --acp -m gemini-3.1-pro-preview"}
    - {name: Gemini Standard, command: "gemini --acp -m gemini-3.5-flash"}
    - {name: Gemini Lite, command: "gemini --acp -m gemini-3.1-flash-lite"}
```

Entry names slugify to `gemini-complex` / `gemini-standard` / `gemini-lite`
— these must match the `harness: acp:<slug>` lines in
`agents/gemini-*/config.yaml`. (Upstream docs may still show the deprecated
`--experimental-acp` spelling; `--acp` is current.) Never pass `args.model`
to a `gemini-*` worker — it is silently ignored; the worker IS the tier.

The generic ACP harness landed upstream on 2026-07-08
([omnigent-ai/omnigent#2152](https://github.com/omnigent-ai/omnigent/pull/2152),
verified merged) — install/update the omnigent runtime from upstream main at
or after that date, or `harness: acp:<slug>` will fail to resolve for all
three `gemini-*` workers.

Verify all four are on PATH:

```bash
command -v claude codex gemini opencode
```

### 3. Run buhhdy

```bash
# One-off local launch
omnigent run buhhdy

# Or point at the config file directly
omnigent run buhhdy/config.yaml
```

To register buhhdy as a durable, reusable agent instead of a one-off local
launch, use the runtime's `sys_session_create` tool with
`config_path: buhhdy` (this is how the registered `agent_id` referenced in
this repo's PR history was produced). `omnigent run --server` also uploads
the YAML, but its own `--help` documents that upload as ephemeral, not a
persistent registration. Copying into the runtime's own examples directory
also still works, if you'd rather colocate it there:
`cp -r /path/to/buhhdy examples/buhhdy`.

### 4. What happens on your first message

buhhdy asks which subscription tier you have for each provider (Claude /
Codex / Gemini) so it can lightly weight routing toward whichever has the
most headroom before hitting its usage cap this cycle — it's a quick
question, not a gate, and your actual request proceeds either way. Skip it
and it defaults to Claude Max / Codex Pro / Gemini Pro. Not persisted —
expect the question again next session. Full mechanics: the "Subscription
Tier Interview" and "Provider Routing Decision Tree" sections of
`config.yaml`.

## Structure

```text
buhhdy/
├── config.yaml                    ← Main orchestrator (buhhdy brain)
├── agents/
│   ├── claude_code/config.yaml      ← Anthropic Claude sub-agent
│   ├── codex/config.yaml            ← OpenAI Codex sub-agent
│   ├── gemini-complex/config.yaml   ← Gemini COMPLEX (gemini-3.1-pro-preview, ACP)
│   ├── gemini-standard/config.yaml  ← Gemini STANDARD (gemini-3.5-flash, ACP)
│   ├── gemini-lite/config.yaml      ← Gemini LIGHTWEIGHT (gemini-3.1-flash-lite, ACP)
│   └── opencode/config.yaml         ← OpenCode GLM 5.2 sub-agent (OpenRouter)
├── skills/
│   ├── routing-guide/SKILL.md    ← Provider routing reference (load on demand)
│   ├── core-workflows/SKILL.md   ← The two standard planning/dev workflows
│   ├── investigate/SKILL.md      ← Vendored from omnigent's examples/polly bundle
│   ├── fanout/SKILL.md           ← Vendored, adapted for buhhdy's 4-provider roster
│   └── cross-review/SKILL.md     ← Vendored, adapted for buhhdy's 4-provider roster
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
| Multimodal, video/audio/PDF | Gemini (`gemini-complex`) | gemini-3.1-pro-preview |
| Bulk classification, high-volume fanout | Gemini (`gemini-lite`) | gemini-3.1-flash-lite |
| Standard implementation | Claude | claude-sonnet-5 |
| Standard structured tasks | OpenAI | gpt-5.4-mini |
| Lightweight default | cheapest tier | see routing-guide |

## Skills Bundled

All of these live in `skills/` and load via the Skill tool (or, in an
interactive REPL session, the matching `/skill-name` slash command):

Authored for buhhdy specifically:
- **routing-guide** — full routing decision tree, tier table, skill affinity map
- **core-workflows** — the two standard planning/development sequences above

Vendored from omnigent's own `examples/polly` bundle, then adapted (renamed
self-references from `polly` to `buhhdy`; dropped the AI-attribution commit
trailer to match buhhdy's own convention). **This copy is manual and doesn't
auto-update** — an omnigent agent bundle only discovers skills placed in its
own `skills/` directory, never another bundle's (confirmed against the
installed runtime's skill-discovery source); if these ever silently stop
working (e.g. `/investigate` → "Unknown command"), re-diff against the
installed package's `examples/polly/skills/` for upstream changes:
- **investigate** — delegate read-only investigation/debugging/audit to sub-agents
- **fanout** — parallel-safe tasks, each in its own worktree + sub-agent + PR
- **cross-review** — verify a PR's diff with a different-vendor sub-agent

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
  **Verified 2026-07-01, re-verified same day after the two missing skills
  were installed:** all 11 are now installed. 7 of 11 trigger normally via
  natural language (grilling, codebase-design, domain-modeling,
  writing-shape, to-issues, to-prd, triage); grill-me/handoff/
  improve-codebase-architecture/loop-me need a literal slash command as the
  dispatch input (`disable-model-invocation` blocks natural-language
  triggering). `triage` has a single `/triage` entrypoint — no separate
  discovery/deep commands; buhhdy distinguishes the two by how it words the
  dispatch, not by a different command. Full detail: routing-guide's
  "Verified Availability" section.

## Cross-Review Pairings

| Implementer | Valid reviewers |
|-------------|----------------|
| claude_code | codex, gemini-*, opencode |
| codex | claude_code, gemini-*, opencode |
| gemini-* | claude_code, codex, opencode |
| opencode | claude_code, codex, gemini-* |

The three gemini-* workers are one vendor — they never review each other.

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
- **claude-fable-5 is now GA** (direct operator confirmation, 2026-07-01,
  corroborated by Anthropic's own model catalog) — added as a new FRONTIER
  tier, claude_code only, an escalation from COMPLEX for the hardest
  reasoning/long-horizon agentic tasks, not a routing default. **Access is
  time-bound:** usable via the existing Claude Max subscription only through
  2026-07-07; from 2026-07-08 it requires a separate API key and per-token
  billing ($10/$50 per MTok), so it falls outside the quota tie-break's
  subscription-cost assumption after that date. **Tightened 2026-07-08:**
  escalation-only even for planning/orchestration — routine planning runs
  Opus 4.8 or lower; Fable is reserved for the most complex
  decomposition/architecture/cross-agent orchestration, with a stated
  reason per dispatch.
- **claude-sonnet-5 added as a COMPLEX-tier ALT** for coding/agentic-shaped
  tasks — near-Opus quality per Anthropic's own docs, cheaper than
  claude-opus-4-8. Reserve Opus for planning/architecture judgment.
- **Gemini is available again (2026-06-30)** — the earlier headless-OAuth
  failure (exit code 41) was resolved upstream, confirmed via a successful
  live dispatch. buhhdy routes across all three providers again.
- **Gemini migrated to upstream ACP (2026-07-08)** — the uhstray-io/omnigent
  fork and its custom gemini harness are retired; buhhdy targets stock
  upstream omnigent. One tier-pinned worker per gemini model (ACP can't
  switch models per-dispatch); requires the `acp:` block above. Fork-era
  exit-code semantics (41/42) no longer apply.

Review the routing-guide skill and this README quarterly as providers evolve.
