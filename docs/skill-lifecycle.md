# The huhhb skill lifecycle — skills as long-lived, evolving assets

Source: **MUSE-Autoskill** (Lin et al., ByteDance/RIT, [arXiv:2605.27366](https://arxiv.org/abs/2605.27366))
— one of the five systems the evolve build plan distilled. evolve shipped the
*user-centric* loop (personalization); this document adopts the paper's
*skill-centric* core: skills transition from one-off authored artifacts to
assets managed under a unified lifecycle, so the library itself improves with
use.

## What the paper establishes (and its evidence)

MUSE-Autoskill's thesis: existing approaches treat skills as isolated and
static; managing **creation, memory, management, evaluation, and refinement**
as one lifecycle makes agents compound. Key results on SkillsBench (51 tasks,
5 runs each):

- Skills work: +15.2pp with human-authored skills (53.2% → 68.4%).
- **Generated skills beat human skills where they exist**: on the 35/51 tasks
  where trajectory-distilled skills were produced, 87.9% vs the 68.4%
  human-skill ceiling — and Pareto-dominant (higher reward, −273s latency,
  −85K tokens). Generation pays for itself after ~3 reuses.
- **Skills are externalized knowledge, not agent-specific**: a different
  agent (Hermes) using MUSE's generated skills gained +10.5pp, closing 79%
  of its gap to human skills.
- The bottleneck is **Phase-1 coverage** (solving the task once without a
  skill), not distillation quality.
- Their headline failure mode is ours too: skills distilled from a single
  trajectory encode run-specific assumptions (paths, calibrations) that
  don't survive distribution shift.

Mechanisms worth quoting exactly:

1. **Creation** = Phase 1 (solve without skill, keep best trajectory) →
   distill into SKILL.md + scripts + **bundled tests** → Phase 2 (re-verify).
2. **Evaluation gate**: a skill is registered into the Skill Bank *only if
   its bundled tests pass* in a sandbox; failures go to a Refiner that
   patches and re-tests.
3. **Skill-level memory**: a sibling `.memory.md` per skill accumulates
   lessons and failure modes across uses.
4. **Management**: catalog (names+descriptions) injected cheaply; full body
   loaded on demand; maintenance = refine / merge overlapping / prune
   failing-or-unused.

## Mapping onto huhhb — most of the substrate exists

| MUSE component | huhhb equivalent | Status |
|---|---|---|
| Skill Bank | `skills/` + `marketplace.json` (hub) and `~/.claude/skills/*-local/` (personal) | ✓ two-tier |
| Catalog injection / progressive disclosure | Claude Code natively injects descriptions; `Skill` tool loads bodies on demand | ✓ native — do not rebuild |
| Skill format | Anthropic Agent Skills format | ✓ identical (the paper adopted it) |
| Evaluation gate (bundled tests, sandbox) | **G1 bench**: `tests/bench/<skill>.json` scenarios via real `claude -p`, artifact asserts + judge + budgets + baseline A/B | ✓ stronger (measures cost/latency/triggering too) |
| Refinement on failure | evolve-review update ladder, pending proposals, `overlay.py patch` + provenance | ✓ |
| Merge / prune | archive-never-delete, dedupe signals from lint (S5) and telemetry | ✓ partial |
| Usage telemetry | `[skill-usage]`/`[correction]` journal + `history.jsonl` + earned confidence | ✓ |
| **Creation from successful trajectories** | — (evolve creates only from corrections/preferences) | **GAP 1** |
| **Skill-level memory (`.memory.md`)** | partial: journal entries + overlay meta; nothing loaded WITH a skill at invocation | **GAP 2** |
| **Unified lifecycle driver** (one pass that walks the library and issues verdicts) | — (evolve-review is session-centric, not library-centric) | **GAP 3** — closed by `/evolve-skills` |
| Evaluator/Refiner auto-loop | bench exists; refine loop is human-mediated | GAP 4 (by policy: human merges hub changes) |
| DAG context compression | rejected in the original plan (session `context` suffices) | deliberate non-goal |

## The unified lifecycle (huhhb form)

```text
        ┌────────────── CREATE ──────────────┐
        │ evidence: ≥2 successful same-class │
        │ trajectories, or explicit ask      │
        │ distill → SKILL.md (+scripts)      │
        ▼                                    │
   EVALUATE (G0 lint + G1 bench scenario — REQUIRED; no eval, no registration)
        │ pass                               ▲
        ▼                                    │ patch (Refiner = evolve-review /
   REGISTER (overlay scaffold w/ provenance, │          evolve-skills proposal)
   or hub PR — human merges)                 │
        ▼                                    │
   REUSE (native catalog; recall surfaces earned confidence)
        ▼                                    │
   REMEMBER (telemetry: [skill-usage]/[correction] journal,
   bench history rows, overlay runs/successes)
        ▼                                    │
   REVIEW (/evolve-skills walks the library) ┤
        ├─ refine ───────────────────────────┘
        ├─ merge  (overlapping skills → one general variant, others archived)
        └─ prune  (unused ~60d + confidence <0.3 → archive proposal; pinned exempt)
```

State machine per skill (unifies overlay `meta.json` status with the gates):
`candidate → new (registered, G1-passed) → validated (first field success) →
active (confidence ≥0.5) → deprecated (proposed) → archived (never deleted)`.

## Adopted / adapted / rejected

- **Adopted verbatim**: the evaluation-gated registration rule ("no bundled
  eval, no registration" — MUSE's test gate, already our quality-bar rule for
  hub skills, now extended to *created* overlays); merge/prune as first-class
  verdicts; distill-from-success (symmetric mining, Law 9, finally gets its
  create path).
- **Adapted**: Phase 1→Phase 2 becomes *cross-session* evidence — we don't
  re-run tasks 5× on demand; the journal witnessing the same class of success
  in ≥2 sessions is our Phase 1, and the G1 scenario the creator must write
  is our Phase 2. Their single-trajectory-overfit failure mode is mitigated
  by the two-session evidence bar plus the anti-capture doctrine.
- **Rejected**: DAG context compression (out of scope, unchanged); embedding
  retrieval (they don't use it either); auto-merge without human approval
  (hub changes stay PR-gated — consequence radius, Law 5).

## Build phases

1. **`/evolve-skills`** (this change) — the lifecycle driver: library-wide
   review pass issuing per-skill verdicts from telemetry + bench history +
   lint, staging refine/merge/prune/create proposals through the existing
   pending/ flow. Prompt + existing CLIs only; no new runtime.
2. **Skill-level memory** — per-skill `.memory.md` (overlays) and
   `$XDG_DATA_HOME/huhhb/evolve/skill-memory/<name>.md` (hub, read-only
   tree); flusher includes recent lessons for recently-used skills in the
   injected context; `/evolve-skills` writes distilled lessons there.
3. **Distillation tooling** — digest gains success-trajectory mining
   (currently only friction is first-class); a `distill` helper drafts the
   SKILL.md + bench scenario pair from journal-referenced sessions.
   `digest.py --backfill` (shipped, see `docs/evolve-vs-autoskill.md`) already
   mines historical transcripts into observations — the remaining work is the
   *distillation* step: threshold-triggered `claude -p` over those sessions to
   draft a workflow-skill proposal (claude-autoskill's `autoskill.py`
   extraction prompt is the reference), kept behind evolve's gates (propose to
   `pending/`, ≥2-session evidence, bundled eval, human approval) rather than
   auto-written to disk.
4. **Refine loop automation** — headless `/evolve-skills` on a cadence;
   bench-regression → auto-staged refine proposal with before/after numbers
   in the PR body (the improvement queue, mechanized).
5. **Fleet parity (SkillHub analogue)** — the existing Phase-5 sketch:
   fleet telemetry feeding curator PRs; per-skill eval sets in CI are
   already the merge gate.

## Open questions

- Creation evidence bar for *hub* candidates: 2 sessions on one device is
  weak evidence for shipping to everyone — require fleet confirmation or
  maintainer judgment? (Current answer: hub creation is always a PR, human
  decides.)
- Merge detection: lint S5 catches identical descriptions; semantic overlap
  needs judgment — keep it in the review pass, not code.
- When Phase-2-style re-verification is affordable: bench runs cost real
  tokens; the cached-baseline mechanism helps, but created-skill G1 runs are
  unavoidable spend (MUSE's break-even argument: ~3 reuses pay for it).
