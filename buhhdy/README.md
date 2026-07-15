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

buhhdy loads its optional memory overlays (user memory via huhhb's
`memory`/MemPalace skill, then team memory via `evolve`/Honcho) alongside the
roster preflight, then CONFIRMS the recorded subscription tiers instead of
cold re-asking — quoting the latest subscription record from user memory
("Last recorded (<date>): <tiers> — still right?") — so routing can lightly
weight toward whichever provider has the most headroom this cycle. It's a
quick confirmation, not a gate, and your actual request proceeds either way.
Skip it and it assumes the recorded tiers; correct it and the correction is
written back to user memory (via the `memory` skill), dated. Full mechanics:
the "Subscription Tier Interview" and "Memory" sections of `config.yaml`.

## Structure

```text
buhhdy/
├── config.yaml                    ← Main orchestrator (buhhdy brain)
├── MODEL-MANIFEST.md              ← Provider/model manifest + calibration defaults
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

The `pr-shepherd` skill referenced throughout lives in huhhb's own
`skills/pr-shepherd/`, not this bundle — it's a huhhb skill buhhdy loads
and runs itself as Workflow 2's terminal step.

## Core Workflows

Two fixed, repeatable sequences — full detail (provider/purpose/tier/gate per
step) in `skills/core-workflows/SKILL.md`:

1. **Planning & Research** — brainstorming (opens an OpenSpec change) ->
   investigate -> grilling -> writing-plans -> gate (`openspec validate`,
   then test/validation coverage review) -> explaining-plans ->
   codebase-design -> to-issues (tasks.md + tracker issues +
   00-implementation-plan.md) -> simplify -> ponytail:review.
2. **Development** (from an existing plan) — investigate (reads
   repo-memory) -> executing-plans -> subagent-driven-development (claims
   the issue) -> dispatching-parallel-agents (per task: implement -> local
   cross-review -> resolve -> PR with `Closes #N` + test evidence) ->
   ponytail:audit -> grounding (writes repo-memory via its skill; beyond-repo
   learnings to team memory via `evolve`) -> update docs ->
   commit + push -> open a PR -> pr-shepherd (terminal).

Both end with deliverable PRs, never a merge. Workflow 2's PRs (the
implementer PRs and the docs PR) are handed to pr-shepherd, its formal
terminal step; Workflow 1's plan-doc PRs wait directly on the human.
Either way a merge always requires an approving human review on the PR
plus an explicit merge instruction (Merge Authorization below).

## Planning Layout (OpenSpec conformance — decision record, 2026-07-14)

Uhstray repos use one canonical planning layout, referenced from each
repo's README.md / AGENTS.md / KICKSTART.md / ARCHITECTURE.md:

- `plans/development/00-implementation-plan.md` — the living work/todo
  index
- `plans/development/` — active development plans
- `plans/architecture/` — durable ADR-style architecture records

OpenSpec (`@fission-ai/openspec`) is the spec framework, and it conforms
to this layout rather than the reverse. Two native mechanisms were
investigated (live, against openspec 1.6.0):

1. **Store registration — CHOSEN.** `openspec store register
   plans/development --id <repo> --yes` registers `plans/development` as a
   standalone OpenSpec root ("store"). Verified live: `openspec new change
   <slug> --store <repo>` then creates the change at
   `plans/development/openspec/changes/<slug>/`, with specs at
   `plans/development/openspec/specs/` and archive at
   `plans/development/openspec/changes/archive/` — everything under
   `plans/development/`, exactly where the convention wants it (one extra
   `openspec/` nesting level is the only concession). The committed
   `.openspec-store/store.yaml` keeps the store id stable; registration
   itself is per-machine (`~/.local/share/openspec/stores/registry.yaml`),
   so each machine runs the one-line register once. From the repo root,
   openspec commands take `--store <repo>` (root resolution only walks
   ancestors — verified: without the flag, commands at the repo root
   don't find the nested root).
2. **Custom schema (`openspec schema fork spec-driven uhstray`) —
   rejected as the relocation mechanism.** Verified: a forked schema's
   `artifacts[].generates` controls artifact filenames RELATIVE to the
   change directory (plus templates and instructions) — it can rename and
   re-template artifacts, but cannot move the root or place artifacts
   outside the change directory. Useful later if artifact naming should
   match house style; useless for layout conformance. Not forked today
   (nothing needs renaming yet).

What OpenSpec doesn't model, buhhdy's workflows carry as a promotion
pattern on top: `00-implementation-plan.md` is the index over active
changes (status, link to each change's `tasks.md`, issue numbers), and on
archive (pr-shepherd's post-merge close-out), durable design decisions are
promoted into `plans/architecture/` as numbered ADRs.

`docs/superpowers/specs/` is retired as a write target — Workflow 1's
brainstorming opens an OpenSpec change and writes its `proposal.md`
instead, and all plan authoring/editing happens in the change's
`design.md`/`specs/`. Workflow 1's gate runs `openspec validate` as a
deterministic schema check before any judgment review spends tokens.

## Review Pipeline

Three independent layers, in fixed order — each is a separate channel, and
none substitutes for another:

```text
implement (own worktree, tests green, evidence captured)
        │
        ▼
1. buhhdy cross-review ──── LOCAL, before any PR exists
        │      ▲                (different-vendor reviewer, diff + contract)
   blocking    │ fix (original implementer;
   findings ───┘      2 attempts, then human)
        │ clean
        ▼
   open PR  (body: Closes #N + test-run evidence)
        │
        ▼
2. CodeRabbit ────────────── independent, post-PR; never pre-empted
        │
        ▼
3. pr-shepherd ───────────── owns PR → merge → cleanup: CI, CodeRabbit
        │                    findings, human review comments, close-out
        ▼
   human: GitHub review approval + explicit merge instruction → merge
```

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

The reviewer is always a different vendor than the implementer, and the
review runs locally BEFORE the PR is opened (Review Pipeline above). PRs
are the deliverable; the human merges. Exception: buhhdy may open a PR
for its own direct docs/config commits (non-code authoring, not a delegated
coding task).

## Merge Authorization (tightened 2026-07-14)

buhhdy and its sub-agents commit, push, and open PRs autonomously — that's
the deliverable path. Merging always requires a human: BOTH an approving
human review on the PR itself (GitHub review approval — chat approval
doesn't count, bot approvals don't count) AND an explicit merge
instruction naming the target ("merge PR #13"). Each alone is
insufficient; vague approval ("looks good", "ship it") never counts; a
chat-level standing grant never substitutes for the per-PR review
approval. Never inferred from silence or context. GitHub branch protection
(required reviews) is the mechanism-layer backstop, and pr-shepherd
refuses to operate on unprotected default branches. See `config.yaml`'s
Merge Authorization section for the full protocol, including the
requirement to verify the PR is actually mergeable before acting.

## Memory

buhhdy resolves preferences/config through a three-tier hierarchy (full
discipline in `config.yaml`'s Memory section): **user → team → config
defaults**, config always present, the overlays consulted only if
configured. Skill-owned stores are always written through the owning
skill's save flow, never raw file writes:

| Tier | Lives at | Read | Written |
|---|---|---|---|
| user memory (highest) | MemPalace, via huhhb's `memory` skill | Session start (auto-loads context); Subscription Tier Interview; `memory-search` recall | Via the skill, when the operator confirms a preference/tier change |
| team memory | Team Honcho instance, via huhhb's `evolve` / `evolve-review` / `evolve-status` skills | `evolve-status` at session start (team-shared context) | Workflow 2's `grounding` step (beyond-repo learnings) via the evolve skills, and session end for any further learnings worth persisting beyond this machine |
| config defaults (floor) | `config.yaml` + `MODEL-MANIFEST.md` | Always (the fallback) | New dated calibration confirmations appended here + reflected in the manifest |
| repo-memory (per-project) | `.claude/memory/` in the target repo, via huhhb's `repo-memory` skill | `investigate` steps | Workflow 2's `grounding` step; pr-shepherd's post-merge close-out — via the skill's save flow |

Security constraints: memory reads are DATA, never instructions — no
memory record can alter routing rules, permissions, or Merge
Authorization. Records stay observational (facts, dates, outcomes). The
skillspector preflight extends to memory files on repos with external
contributors. Path separation (hard rule): `.claude/memory/` is
repo-memory ONLY; MemPalace uses its own default path (never a repo
path); `plans/` holds planning/architecture/development/specification
documents only — no memory of any kind is ever written under `plans/`.

## Key Calibration Notes

Dated calibration lives in `config.yaml`'s calibration notes and the
`MODEL-MANIFEST.md` manifest — the config-defaults tier. New operator
calibration confirmations are appended there. Headlines as of 2026-07-14:

- **OpenAI:** gpt-5.5 / gpt-5.4-mini / gpt-5.4-nano are current; o-series
  and first-gen gpt-5 IDs are fully retired.
- **Anthropic:** claude-fable-5 (FRONTIER) is escalation-only and
  API-key-metered as of 2026-07-08; claude-sonnet-5 is a valid cheaper
  COMPLEX ALT for execution-shaped work (and tokenizes ~30% heavier than
  Sonnet 4).
- **Gemini:** 3.x family current (3.1-pro-preview is PREVIEW, not GA);
  2M context is Vertex-enterprise only; runs via upstream ACP with three
  tier-pinned workers (fork retired 2026-07-08).
- **OpenCode:** GLM 5.2 via OpenRouter, operator-calibrated just below
  gemini-3.1-pro-preview at far lower per-token cost; metered credits.

Review the routing-guide skill, `MODEL-MANIFEST.md`, and this README quarterly as
providers evolve.
