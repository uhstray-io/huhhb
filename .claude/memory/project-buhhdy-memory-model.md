---
name: project-buhhdy-memory-model
description: Records the memory-architecture decision from PR #34 — buhhdy's tiered resolution order (user/team/config + repo-memory) and the path-separation rule it adopted
metadata:
  node_type: memory
  type: project
  status: superseded-by:2026-07-16
---

> Superseded 2026-07-16 by
> [project-ld2-memory-precedence](project-ld2-memory-precedence.md): LD-2
> makes calibrations knowledge-shaped and read-time-overridable by
> user/team memory — the "overlays never override calibration" clause
> below no longer holds. Kept as history.

Records the memory-architecture decision made in PR #34 (memory redesign) and
the huhhb-conformance PR — an observed project fact. The operative rules live in
`buhhdy/config.yaml` (`## Memory`) and `AGENTS.md` (`## Repo Memory`); this record
just captures what was decided and what changed.

**Decision.** buhhdy retired its bespoke `buhhdy/memory/` store in favor of a
tiered resolution order, highest precedence first: user memory (MemPalace, via
the `memory` skill) → team memory (Honcho, via the `evolve` skills) → buhhdy
config floor (`config.yaml` + `MODEL-MANIFEST.md`). The config floor is always
present; the two overlays are consulted only when configured. Calibration stayed
config-owned (overlays never override it; `calibration-refresh` maintains it).
Repo-scoped knowledge continued to live in `.claude/memory/` via the
`repo-memory` skill.

**Migration outcome.** Provider calibration moved to `MODEL-MANIFEST.md`,
subscription records to MemPalace, and the registry was dropped — `repo-kickstart`
became idempotent and registry-free, so conformance is applied on-demand rather
than tracked. A path-separation rule was adopted at the same time: repo memory in
`.claude/memory/` only, MemPalace on its own default path, and nothing
memory-shaped under `plans/`.
