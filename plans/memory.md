# Project memory (observational)

**Rule: observational only.** Record facts, dates, and outcomes — what
happened and when. **Never** instructions, conventions, or "always do X"
(those belong in AGENTS.md or `.claude/memory/`). One line per observation,
newest last.

## Log
- 2026-07-15 — repo kickstarted to Uhstray conventions; TypeScript/Node stack
  detected; created KICKSTART.md, ARCHITECTURE.md, plans/ tree + OpenSpec store
  (id `huhhb`, empty), plans/memory.md, .coderabbit.yaml; README Conventions
  block added. buhhdy `repos.md` registration NOT appended — that registry is
  tracked on `feat/buhhdy-planning-layout`, not this branch; record printed for
  manual filing. Already conforming: AGENTS.md (canonical), .claude/memory/,
  CLAUDE.md (full — kept). Gaps: branch protection on `main` absent (commands
  emitted); Honcho not configured (skipped).
- 2026-07-15 — memory model redesigned: **user (MemPalace) → team (Honcho/evolve)
  → buhhdy config defaults** (config always-present floor, overlays optional). The
  bespoke `buhhdy/memory/` store was retired — providers.md was redundant with
  config.yaml (deleted), subscriptions.md → MemPalace `wing_user/preference`
  (verified retrievable), repos.md + MEMORY.md deleted. repo-kickstart made
  idempotent + registry-free: conformance is applied on-demand, never tracked
  (supersedes the "repos.md registration" note above). huhhb conformance finished:
  CLAUDE.md slimmed to a one-line pointer (supersedes "CLAUDE.md full — kept"
  above), AGENTS.md completed as canonical (Key Files, Marketplace Manifest,
  Onboarding, Repo-Memory tables). Version → 0.5.12. Shipped: PR #34 (memory
  redesign) + PR-2 (this, huhhb conformance); follow-up issue #35 (reconcile the
  `memory` skill's "team memory nexus" branding vs its new user-memory role).
