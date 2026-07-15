---
name: project-buhhdy-memory-model
description: buhhdy's memory hierarchy and where each kind of knowledge lives (user/team/config + repo-memory), and the path-separation rule
metadata:
  node_type: memory
  type: project
---

buhhdy resolves any preference/config value through a three-tier hierarchy,
highest precedence first — config always present, the overlays consulted only
if configured:

1. **user memory** — MemPalace, via the `memory` skill (subscription tiers, per-operator preferences).
2. **team memory** — the team Honcho instance, via the `evolve` skills (team-wide preferences; written at Workflow 2's `grounding` step, and session end).
3. **buhhdy config defaults (floor)** — `config.yaml` + `MODEL-MANIFEST.md`: the provider-mapping standard and calibration notes. Calibration is config-owned — memory overlays never override it. The `calibration-refresh` skill maintains these notes.

Separately, **repo-memory** is `.claude/memory/` (per-project, via the `repo-memory` skill).

**Path separation (hard rule):** repo memory lives in `.claude/memory/` ONLY; MemPalace uses its own default path; `plans/` holds planning/architecture/development/specification documents — no memory of any kind is ever written under `plans/`.

The bespoke `buhhdy/memory/` store was retired (providers → MODEL-MANIFEST, subscriptions → MemPalace, registry dropped). `repo-kickstart` is idempotent and registry-free — conformance is applied on-demand, never tracked. Established in PR #34 (memory redesign) and the huhhb-conformance PR.
