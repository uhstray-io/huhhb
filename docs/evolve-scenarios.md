# evolve scenario catalog — S01–S27

Twenty-seven behavior scenarios that define what "the evolve suite works" means,
runnable any time with zero infrastructure. Runner:
`scripts/evolve/evals.py` — each scenario builds an isolated sandbox and
drives the **real pipeline** (hooks → digest → flush → injection → CLIs),
asserting on artifacts, never on vibes.

```bash
python3 scripts/evolve/evals.py --list             # this catalog, live
python3 scripts/evolve/evals.py                    # all offline scenarios (local mode, free)
python3 scripts/evolve/evals.py --only s07 --runs 3
python3 scripts/evolve/evals.py --with-claude      # + live claude -p scenarios (costs tokens)
python3 scripts/evolve/evals.py --mode honcho      # same catalog against a Honcho instance
EVOLVE_EVAL_KEEP=1 ... # keep sandboxes for post-mortem
```

## The catalog

Provenance matters: a scenario earns its place by descending from a real
failure ("wild"), a doctrine rule ("law"), or a reviewer finding ("review").

| ID | Proves | Mode | Provenance |
|---|---|---|---|
| S01 | preference in session A is injected into session B before any turn | offline | plan §7 E1 |
| S02 | correction after skill use → `partial` outcome → review proposes overlay patch, never a hub edit | offline + live half | plan §7 E2 |
| S03 | fixed failures are remembered as their fix; no negative-capability claims survive | offline | plan §7 E3, law: never persist a grudge |
| S04 | project decisions route to repo-memory, not overlays/conclusions | offline + live half | plan §7 E4; wild: routed-by-capture-type miss (v0.5.0) |
| S05 | e-dropping gerunds ("stop using") detected; outcome cascades to `partial` | offline | wild: missed live on v0.5.0 |
| S06 | pasted documents quoting example phrases capture nothing | offline | wild: build plan journaled its own examples (v0.5.0) |
| S07 | harness blocks are never user speech, including `ci-monitor-event` | offline | wild: task-notification captured as correction (v0.5.0); ci-monitor-event: journal idx 14, 2026-07-05, fixed same day |
| S08 | markers embedded in genuine text strip their block; user's words survive | offline | review: CodeRabbit PR#18 |
| S09 | secrets redacted in every artifact (journal + injection), incl. install commands | offline | wild: MEDIUM security finding (v0.5.0 review) |
| S10 | benign phrasing near detector vocabulary captures nothing | offline | law: capture purity beats volume |
| S11 | repeated Stop firings are idempotent (byte-offset cursor) | offline | law: zero-cost hooks; efficiency review finding |
| S12 | repeated preferences: journal keeps every witness, injection dedups | offline | law: ≥2-session evidence needs witnesses |
| S13 | a session with no durable signal creates no injection cache | offline | law: injection has a token budget |
| S14 | local recall ladder: rep = conclusions + prefs, search = journal, chat refuses loudly | offline | local-mode design (approach 3) |
| S15 | explicit `observe` write is instantly recallable | offline | evolve skill write path |
| S16 | overlay lifecycle: `-local` suffix, semver + provenance, earned confidence (10/10→1.0), pinned protection, archive-never-delete | offline | doctrine §5.6–5.8, D7/D14 |
| S17 | headless writes confined to `pending/`; repo-memory proposals refuse CLI apply | offline | D10; security doctrine |
| S18 | `status` tells the truth in every state (inert/local/spooled), always prints the state dir | offline | wild: hardcoded-path bug (E2/E4 post-mortem) |
| S19 | hooks: inert unconfigured, <1s always, valid SessionStart JSON, pending nudge counts | offline | §9 hard rules; C-01/C-09/C-11 |
| S20 | live `/evolve-skills` pass emits the `verdicts:` tally and edits no hub skill | **live** | skill close-out contract (PR#18) |
| S21 | GR1: every observation carries a trust tier (explicit/stated/inferred) | offline | anti-poisoning ([guardrails](evolve-guardrails.md)) |
| S22 | GR2: a bulk batch is quarantined from injection/recall; the journal keeps it | offline | wild: pasted-doc + eval-env contamination (v0.5.x) |
| S23 | GR4: skill bodies with agent-hijacking instructions are refused at write time | offline | wild: SkillSpector P1 flag; anti-poisoning |
| S24 | GR3: a leaked eval/sandbox state dir warns loudly in `status` | offline | wild: eval-env contamination, 2026-07-05 |
| S25 | retrospective backfill mines historical transcripts through the capture guardrails (dry-run, quarantine, idempotent) | offline | adopted from claude-autoskill ([comparison](evolve-vs-autoskill.md)) |
| S26 | workflow distillation stays gated — create refused without a bundled eval and without ≥2-session evidence; candidate surfacing needs 2 sessions | offline | `/evolve-distill`; autoskill adaptation behind evolve's gates |
| S27 | cross-tier skill inventory + overlap detection (repo/user/plugin) and the user→repo promotion gate (body + rationale + eval required) | offline | `/evolve-map`; skill ecosystem understanding + tier delineation |

## Conventions (the improvement loop)

- **Hard assertion** — must pass every run.
- **`:phrasing`** — content-sensitive; one miss allowed across runs.
- **`:xfail`** — a **documented known gap**: the assertion is expected to
  fail until the underlying fix ships. When the runner prints **XPASS**, the
  gap has closed — promote the assertion to hard (drop the suffix) and move
  the provenance note to "fixed". Never delete an xfail silently.

### Adding a scenario

1. Reproduce the behavior in a `Sandbox` (helpers: `capture_session`,
   `injected_context`, `journal`, `query`, `hook`, `run`).
2. Assert on **artifacts** — journal entries, cache contents, exit codes,
   file state — never on response wording (use `:phrasing` when unavoidable).
3. Record provenance in the table above: wild bug (with date), law, or
   review finding. A scenario without provenance is speculation.
4. Register it in `SCENARIOS`; live-only scenarios go in `LIVE_ONLY`.

### Current known gaps

| Gap | Scenario | Since | Fix tracked |
|---|---|---|---|
| _none currently_ | | | |

Closed gaps (kept for provenance):

| Gap | Scenario | Since | Fixed |
|---|---|---|---|
| `<ci-monitor-event>` blocks not in digest's harness strip list — captured as a false `[correction]` in live state | S07 `ci_monitor_event_blocked` (promoted from `:xfail`) | 2026-07-05 (journal idx 14) | 2026-07-05, evolve-skills pass R2 |

### Caveats

- `--with-claude` scenarios exercise the **installed plugin's** skills, not
  this working tree — release + reinstall before using them to verify
  skill-prose changes. Script changes are exercised directly.
- Offline scenarios are deterministic (default 1 run); `--mode honcho` runs
  default to 3 per plan §7 (deriver nondeterminism), with the same
  artifact-3/3, phrasing-2/3 bar.
- Related layers: `tests/test_evolve.py` (unit/component, in-process),
  `tests/bench/*.json` (G1 quality gates, real sessions, costs tokens),
  `docs/evolve-testing.md` (criteria matrix C-01..C-25),
  `docs/evolve-guardrails.md` (the anti-poisoning defense S21–S24 verify).
