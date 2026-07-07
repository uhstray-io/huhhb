---
name: evolve-skills
description: Use when reviewing the skill library as a whole and driving the skill lifecycle — auditing every hub skill and overlay against usage telemetry, bench history, and lint debt to decide refine/merge/prune/create ("review the skill library", "skill lifecycle pass", "which skills need work", "audit our skills"), or when distilling a new skill from sessions that solved a task class without one ("distill a skill from this", "turn this workflow into a skill"). For session-centric learning (corrections, preferences), use evolve-review instead.
---

# evolve-skills — the library lifecycle pass

Where `/evolve-review` learns from *sessions*, this pass manages the *library*:
every skill is a long-lived asset moving through a lifecycle —
`create → evaluate → register → reuse → remember → refine/merge/prune` —
and this skill is the driver that walks the library and issues verdicts.
Design and evidence: `docs/evolve-plan.md` (adapted from MUSE-Autoskill,
arXiv:2605.27366 — trajectory-distilled, eval-gated skills beat human-authored
ones and pay for themselves after ~3 reuses).

Paths: `EVOLVE=${CLAUDE_PLUGIN_ROOT}/scripts/evolve`; resolve local state with
`node $EVOLVE/honcho_client.ts status` (honors `XDG_DATA_HOME` — never
assume the default). Same two modes as evolve-review: interactive shows diffs
and applies on approval; headless stages everything via `overlay.ts propose`
into `pending/` and applies nothing.

## 1. Inventory — evidence before opinions

Gather, in one pass (all read-only, no LLM calls):

```bash
node scripts/skill-lint.ts                  # G0 debt: oversized bodies, weak descriptions
node scripts/skill-trends.ts ledger          # bench history: did versions move the numbers?
node scripts/skill-trends.ts regressions     # skills that got worse
node $EVOLVE/overlay.ts report --json       # overlay confidence / last_used / last_error
node $EVOLVE/g2.ts report                   # G2 field verdicts: promote/improve/demote per skill
```

plus the journal (`journal.jsonl` in the state dir): `[skill-usage]` outcomes
and `[correction]` entries within a skill's blast radius are the field truth
that bench numbers can't see.

## 2. Per-skill lifecycle verdict

Every skill in `marketplace.json` and every overlay resolves to exactly one:

| Verdict | Evidence that earns it | Action |
|---|---|---|
| `healthy` | used, no correction pressure, bench stable, lint clean | nothing — most skills, most passes |
| `refine` | recurring corrections after use, bench regression, grandfathered lint debt, stale upstream sync | patch proposal with the signal quoted; hub skills → PR, overlays → `overlay.ts patch` |
| `merge` | overlapping descriptions (lint S5 near-misses) or the same task class split across skills | judge on four axes (R2): job-to-be-done, deliverable type, hard constraints, tools/workflow — merge only when the same capability remains after removing instance details; **an unsafe merge degrades to keeping both skills separate** (`healthy`, no merge), and low-confidence judgment falls back to the structural overlap score. One general variant absorbs; others → archive proposal |
| `prune` | ~60 days unused AND confidence < 0.3, or consistently failing | archive proposal (never delete; pinned exempt) |
| `create` | see creation protocol below | scaffold + eval + register |

Verdicts route through the existing machinery: interactive = show the exact
diff, apply on approval; headless = `propose` only. Hub-skill changes are
**always** a PR a human merges, whatever the mode.

## 3. Creation — hand off to /evolve-distill

This pass only *identifies* a `create` candidate (a gap nothing covers). The
operational flow — read the evidence, distill class-level, bundle the eval,
stage the proposal — is **`/evolve-distill`**, and its gates are enforced in
one place (`overlay.ts propose`): ≥2-session evidence (or an explicit ask), a
bundled eval (no eval, no registration), and the GR4 poisoning scan on the
body. Don't restate the bar here — route to `/evolve-distill` so the contract
lives once. Cross-skill relationships and gap-finding are `/evolve-map`.

## 4. Remember — close the loop

After verdicts, write what the pass learned back where the next pass will
see it: per-skill lessons worth keeping → the skill's own memory (overlay
`references/` today; `.memory.md` when phase 2 of the design lands), and
`[skill-usage]`/`[strategic]` observations via `honcho_client.ts observe` so
the field record stays continuous. A verdict without recorded evidence is a
vibe — the next pass must be able to check whether the refine actually
helped (`skill-trends.ts ledger` before/after is the receipt).

## Close out

End every pass with a one-line machine-readable tally, then the human
summary — the bench asserts on it and the next pass diffs against it:

```text
verdicts: healthy=<n> refine=<n> merge=<n> prune=<n> create=<n>
```

## Hard rules

- Hub skills are read-only on-device; every hub change is a PR (consequence
  radius gates promotion — device: automatic, overlay: user approval, hub:
  human merge + CI evals).
- Archive, never delete. Pinned skills are exempt from merge/prune, never
  from refinement.
- Upstream-synced skills (caveman family, mempalace) are refined **upstream**
  — propose an issue/PR against the source repo, never a local divergence.
- Verdicts need evidence you can quote (journal line, bench row, lint code).
  A library pass that "finds" work without receipts is inventing it —
  `healthy` across the board is a legitimate outcome.
- Respect budgets: this pass is read-heavy and LLM-light; it needs zero
  dialectic calls and zero bench runs. Proposing a bench run is fine;
  running one is the user's spend decision.
