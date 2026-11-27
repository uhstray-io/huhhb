# ARCHITECTURE.md

Current-state architecture of **huhhb**, Uhstray.io's Claude Code skills
marketplace. Proposals and decision deltas live in
**[plans/architecture/](plans/architecture/)**.

## Overview

huhhb is a **content repo, not an application** — its product is a curated set
of skills that Claude Code loads. There is no server and no build.

```
skills/<name>/SKILL.md   ── the skills themselves (flat, one dir each)
marketplace.json         ── manifest Claude Code reads to list/install skills
.claude-plugin/          ── plugin.json (version → update detection, hooks;
                            registers no MCP servers — see AGENTS.md § Memory)
hooks/                   ── SessionStart / PreToolUse / PostToolUse / Stop / UserPromptSubmit scripts (registered in .claude-plugin/plugin.json)
onboarding/              ── first-run tour (welcome.md) and skill list (skills-list.md); nothing runs them automatically
scripts/                 ── quality gates + tooling (TypeScript, run via node)
  ├─ skill-lint.ts       ── G0: frontmatter/link/manifest checks
  ├─ skill-bench.ts      ── G1: real `claude -p` scenario runs
  └─ evolve/             ── the self-learning suite (MIT; imports only)
tests/                   ── offline test suite + bench/ scenarios
plans/                   ── dated development plans + architecture ADRs
docs/evolve-plan.md      ── evolve living plan, guardrails, roadmap
```

**Data flow:** Claude Code reads `marketplace.json` → installs/loads skills →
`hooks/` fire on lifecycle events. The evolve suite adds a learning loop: a Stop
hook digests each session into typed observations, a Honcho-backed deriver turns
them into conclusions, and a SessionStart hook injects what was learned into the
next session. evolve is **inert until Honcho is configured** (env-only creds).

## Key decisions

- **TypeScript infra, no build step** — first-party infrastructure (scripts,
  tests, hooks, evolve) is TypeScript on Node ≥ 22.18 native type stripping;
  stdlib only, zero runtime deps. Skills may ship payload scripts in any
  language that fits (e.g. Python via `uv`); see AGENTS.md.
- **AGENTS.md is canonical**; `CLAUDE.md` mirrors it for Claude Code. Two files,
  one source of truth — they must stay consistent.
- **MCP servers are external packages, never vendored** — the opt-in MemPalace
  server runs from PyPI via `uvx`, and the plugin registers no MCP server; our code is MIT and only *imports* installed packages.
- **Three quality gates** — G0 lint (free, every PR), G1 bench (tokens, on
  change), G2 field promotion (evolve telemetry). Detail in `docs/evolve-plan.md`.
- **Planning in dated Markdown** — plans are `plans/development/YYYY-MM-DD-<slug>.md`;
  decisions are ADRs in `plans/architecture/`, and work is tracked in Plane (ADR-0007).
