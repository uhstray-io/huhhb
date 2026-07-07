# huhhb skill quality bar

The bar a skill must clear to enter the marketplace, stay in it, and get
promoted. Three gates, ordered by cost — cheap deterministic checks run on
every commit; expensive model-driven benchmarks run when a skill changes;
field data accumulates continuously and drives improvement.

```
G0 static lint (free, every PR)      scripts/skill-lint.py
   └─► G1 merge bench (paid, on change)   scripts/skill-bench.py
          └─► G2 field promotion (continuous)   evolve loop telemetry
                 └─► improvement queue ─► patch ─► re-run G1 ─► PR
```

## Criteria

### G0 — static lint (hard gate: FAIL blocks merge)

| # | Criterion | Threshold |
|---|---|---|
| S1 | Skill file exists at its `marketplace.json` path | required |
| S2 | Frontmatter is exactly `name` + `description` (no `triggers` — unsupported by VS Code agents) | required for SKILL.md |
| S3 | `name` matches its directory | required |
| S4 | Description non-empty, 30–500 chars, embeds trigger phrasing ("use when/to", quoted trigger phrases) | length required; phrasing WARN |
| S5 | No two skills share a name or an identical description | required |
| S6 | Body context footprint ≤ ~1500 tokens (≈6000 chars); beyond that use progressive disclosure (`references/`, `scripts/`) | WARN >1500, FAIL >3000 |
| S7 | Relative markdown links resolve; `${CLAUDE_PLUGIN_ROOT}` paths exist in repo | required |
| S8 | Versions: `marketplace.json` == `plugin.json`; every skill entry carries `version` | required |

### G1 — merge bench (per changed skill; 3 runs; medians)

Scenarios live in `tests/bench/<skill>.json`; the runner drives `claude -p`
and reads its JSON metrics. Every scenario also runs a **baseline** (same
prompt, Skill tool disallowed) — a skill must *earn its tokens* against doing
nothing.

| # | Criterion | Measured from | Gate |
|---|---|---|---|
| B1 | Task completion | scenario `assert` command exit 0 | strict asserts 3/3; phrasing-sensitive 2/3 |
| B2 | Accuracy | asserts check *artifacts* (files, exit codes, exact strings), not vibes | same as B1 |
| B3 | Response quality | LLM-judge rubric (clarity, follows repo conventions, no filler) when a `judge` prompt is provided | median ≥ 4/5 |
| B4 | Tokens used | `usage` (input+output) from `claude -p --output-format json` | ≤ 1.5× baseline, or per-skill budget |
| B5 | Cost | `total_cost_usd` | per-skill budget |
| B6 | Time to generate | `duration_ms` wall clock | ≤ 2× baseline |
| B7 | Time to reason input | `duration_api_ms` and turns-to-first-action from stream events | advisory (trend, no hard gate) |
| B8 | Tool-call efficiency | `num_turns` / tool-use count vs baseline | ≤ 1.5× baseline |
| B9 | Trigger recall | % of on-topic prompts where the skill auto-invokes (stream-json shows the Skill call) | ≥ 80% |
| B10 | Trigger precision | % of off-topic prompts where it correctly does NOT invoke | ≥ 90% |
| B11 | Variance | strict-assert outcomes must not flip across the 3 runs | no flip-flop |

Rationale for the baseline comparison: a skill whose benched runs cost more
tokens and time than the no-skill baseline *and* don't improve completion or
quality is negative-value — the marketplace equivalent of dead code.

### G2 — field promotion (continuous, via the evolve loop)

Runner: `python3 scripts/evolve/g2.py report [--json]` — computes F1–F3 from
the **screened** journal (GR2: a quarantined batch never earns confidence)
plus the bench ledger, and emits per-skill verdicts
(`promote / improve / demote / keep / no-data`). Read-only: featured/pinned
changes still ship as PRs. F2 approximates "within 3 turns" as
same-session-at-or-after-use — the journal stores no turn indices by design.

| # | Criterion | Source | Bar |
|---|---|---|---|
| F1 | Earned confidence `min(runs/10,1) × success_rate` | `[skill-usage]` outcomes / overlay `record` | ≥ 0.7 for featured/pinned status |
| F2 | Correction pressure | `[correction]` observations within 3 turns of the skill | 0 unresolved recurring corrections |
| F3 | Freshness | last G1 pass date; upstream drift for synced skills (caveman, mempalace) | re-bench after 90 days or upstream sync |
| F4 | Cross-model robustness | G1 re-run with a cheaper model tier | advisory until Phase 5 |

## Gating decisions

- **Merge**: G0 pass + G1 pass on at least one real scenario (the historical
  "test against one real use case" rule, now measured instead of asserted).
- **Keep**: G2 correction pressure clean; a skill accumulating recurring
  corrections enters the improvement queue.
- **Promote** (featured in README / pinned): F1 ≥ 0.7 and F2 clean.
- **Demote/archive**: fails G1 after an improvement attempt, or 60+ days
  unused with confidence < 0.3 → archive proposal (never delete). Pinned
  skills are exempt from demotion, never from patching.

## Improvement loop

Failing soft criteria doesn't evict a skill — it queues it:

1. Signal arrives (G1 regression, G2 correction pressure, upstream drift).
2. `/evolve-review` (device) or the Phase-5 curator (fleet) drafts a patch,
   quoting the evidence (session IDs, benchmark deltas).
3. Patch re-runs G1; the PR shows before/after metrics side by side.
4. Human merges. Confidence resets to earned-from-zero for major rewrites.

## History & trends

Every live G1 run appends one row per scenario to `tests/bench/history.jsonl`
(skill, version, git commit, timestamp, medians for tokens/cost/latency/turns,
baseline comparisons, judge score, verdicts). Disable with `--no-record`.

Storage is deliberately **git-tracked append-only JSONL, not a database
file**: rows are human-diffable in the PR that changed the skill, CodeRabbit
reviews them, and git is the audit trail — the same doctrine as the rest of
this repo. A `.duckdb`/`.sqlite` binary in git would be unreviewable and
merge-conflict-prone.

DuckDB is the *query layer*, never a deployment — it reads JSONL natively,
and `scripts/skill-trends.py` carries its own dependency via PEP 723 inline
metadata, so `uv` (already a huhhb prerequisite) provisions everything on
first run. Nothing is installed into the repo; no `.duckdb` file ever exists.

```bash
uv run scripts/skill-trends.py trend --skill evolve-status   # scores over time
uv run scripts/skill-trends.py regressions   # latest run worse than previous
uv run scripts/skill-trends.py ledger        # per-version: did the patch help?
uv run scripts/skill-trends.py sql "SELECT ... FROM history" # ad hoc
```

(Note: `uvx duckdb` does NOT work — the PyPI package ships the Python module
only, no CLI executable. Either use the script above or
`uv run --with duckdb python -c "import duckdb; ..."`.)

## Running the gates

```bash
python3 scripts/skill-lint.py                  # G0 — free, run always
python3 scripts/skill-bench.py evolve-status   # G1 — spawns claude -p, costs tokens
python3 scripts/skill-bench.py evolve-status --baseline-only   # just the A/B baseline
```

G1 requires the plugin installed from the branch under test
(`claude plugin marketplace add <repo-path>`), otherwise you're benching the
released version against edited scenarios.
