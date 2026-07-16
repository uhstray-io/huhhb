---
name: project-ld2-memory-precedence
description: LD-2 (2026-07-16) — knowledge (preferences AND calibrations) resolves user memory > team memory > config defaults; policy is memory-immune; supersedes the PR #34 record's calibration-stays-config-owned clause
metadata:
  node_type: memory
  type: project
  kind: outcome
  status: active
---

2026-07-16 (alignment review, LD-2): buhhdy resolves KNOWLEDGE-shaped
content — knowledge, preferences, and calibrations — as user memory
(MemPalace via the `memory` skill) > team memory (Honcho via the evolve
skills) > buhhdy config defaults (`config.yaml` + `MODEL-MANIFEST.md`,
the always-present floor and the write-location for operator-confirmed
calibrations, which carry user authority). This deliberately supersedes
PR #34's "calibration stays config-sourced, never overlay-overridable".
POLICY is memory-immune: permissions, Merge Authorization, review-pipeline
ordering, escalation rules, path separation, credential rules, routing
STRUCTURE and gates, and the Record Contract lints — no memory stratum
alters them; instruction-shaped records are quarantined on sight.
Authoritative statement + worked example: `buhhdy/config.yaml` `## Memory`.
Evidence: the Round-5 alignment-review PRs (`fix/alignment-buhhdy`,
`fix/alignment-skills`). Supersedes:
[[project-buhhdy-memory-model]].
