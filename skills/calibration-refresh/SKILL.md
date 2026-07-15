---
name: calibration-refresh
description: Use when buhhdy's provider/model/auth facts need re-verifying — the operator says "run calibration refresh", the monthly refresh is due, a dispatch just failed on a bad or retired model ID, or a provider announced a model change. Covers model-ID drift, deprecation/shutdown dates, per-token pricing, auth/tier/billing status, and CLI/harness behavior claims going stale in buhhdy's `config.yaml` and `MODEL-MANIFEST.md`.
---

# calibration-refresh

Keeps buhhdy's provider/model/auth facts current, maintained in the
config-defaults tier — the dated calibration notes in `config.yaml` and the
manifest in `MODEL-MANIFEST.md`. buhhdy has no separate memory store for
these; the user/team memory overlays only ever hold preferences, never
calibration. This skill is the named maintenance owner of those notes: it
re-verifies them on cadence and keeps them accurate.

Refreshing is **buhhdy-level orchestration** — the ledger, memory
records, config diffs, and report are permitted non-code authoring; only
verification probes are dispatched. The whole run is executable from the
single instruction **"run calibration refresh"**: no interactive setup,
no tier interview, no menu. The human is consulted for exactly two
things — source contradictions and routing-change proposals.

## Preconditions

- `buhhdy/config.yaml` and `buhhdy/MODEL-MANIFEST.md` hold the current
  calibration notes (dated, observational: facts/dates/outcomes,
  supersede-not-delete).
- Web verification is reachable for deprecation/pricing claims. If it
  isn't, run the offline subset and mark everything else
  `stale — not re-verified this run` in the ledger and report. **Never
  stamp a fresher verified-date on a claim that wasn't actually
  re-checked this run.**

## The run, in order

| # | Step | Kind | Worker / tier | Output |
|---|------|------|---------------|--------|
| 1 | **Inventory → claims ledger** | buhhdy-level | — | Sweep `buhhdy/config.yaml` AND every `buhhdy/skills/*/SKILL.md` for dated operator notes and factual claims: model IDs and tier slots, deprecation/shutdown dates, per-token pricing, auth/tier/billing shape, and CLI/harness behavior claims (e.g. the ACP model-pinning constraint, flag spellings, minimum runtime versions). Cross-reference each against the calibration notes in `config.yaml` and `MODEL-MANIFEST.md`. Ledger row: `claim / where stated / last verified / verification method / age`. The ledger MUST cover at minimum: the model tier table, the Fable escalation-gate cost basis, the Gemini ACP/auth notes, and the opencode OpenRouter billing note — a run whose ledger misses one of these is incomplete, not done |
| 2a | **Verify: CLI / harness behaviors** | buhhdy-level shell | — | Cheapest check runs FIRST — free and local: CLI `--version`/`--help`, `opencode models`, the installed omnigent runtime source. Never verify a harness claim from docs alone when the binary is right there; a claim disproven here never spends a dispatch |
| 2b | **Verify: availability + auth** | Dispatched | one LIGHTWEIGHT dispatch per provider (gemini-lite for gemini), fanned out across all providers in ONE parallel wave | `sys_list_models` plus one live round-trip per provider — the round-trip doubles as the auth check. A failed ID here is a finding, not an error |
| 2c | **Verify: deprecations / pricing / releases** | Dispatched | gemini-standard or codex (STANDARD), fanned out across claims in one parallel wave; the SECOND, different-vendor dispatch is spent only when the lead source surfaces a would-flip discrepancy | Web verification against provider primary docs. A consequential claim (anything a routing rule, tier slot, or cost basis rests on) still flips ONLY on cross-vendor confirmation: two independent sources, or two different-vendor agents each citing primary docs. One source is a lead, not a flip — and an unchanged lead needs no second vendor |
| 3 | **Update the notes** | buhhdy-level | — | For every claim that CHANGED or is newly discovered, update the dated calibration notes in `config.yaml` and `MODEL-MANIFEST.md` — append a fresh dated line and mark the superseded one rather than deleting it. Claims verified UNCHANGED are recorded in the ledger and report only — never as new note lines; freshness lives in the report, and the notes stay compact. Contradictions BETWEEN sources are never resolved silently: record both sources verbatim, mark the claim `disputed`, and escalate (house style: config's gemini-2.5-flash-lite disputed-retirement note — state both positions, name both sources, pick the migration-safe action only if one exists) |
| 4 | **Config PR** | buhhdy-level, cross-reviewed | opposite-vendor local review before the PR | Propose the `config.yaml` + `MODEL-MANIFEST.md` diffs that update the dated calibration notes in place. NEVER rewrite a routing rule, the tier table, a gate, or Merge Authorization autonomously — if verification implies a routing change (a model retired out of a tier slot, a repricing that breaks a cost-basis assumption), it goes in the PR under a clearly flagged **`## ROUTING CHANGES — HUMAN JUDGMENT REQUIRED`** section as a proposal with the evidence, never as an applied edit. Low confidence → escalate instead of proposing. One PR per refresh run, standard pipeline: local cross-review → PR → CodeRabbit → pr-shepherd |
| 5 | **Report** | buhhdy-level | — | Delta summary: **verified unchanged** (count + ledger refs) / **updated** (old → new, record written) / **contradicted → escalated** (both sources) / **newly discovered** (e.g. a new model or tier worth evaluating — surfaced, not wired). End with the next recommended refresh date (default: +1 month) |

**Dry-run semantics.** If invoked as a read-only/dry run, or web access
is unavailable or forbidden this run: execute the inventory and whatever
verification the mode allows, and produce the full ledger + delta report
— but apply NO side effects. No memory records are written, no config PR
is opened; step 3 and step 4 outputs are reported as
proposed-and-unapplied text instead. Existing verified-dates are
preserved and every web-dependent claim is marked
`stale — not re-verified this run`. Normal (non-dry) runs are unchanged.

## Cadence and triggers

- **Default: monthly.** Also run immediately when a provider announces a
  model change, or when buhhdy trips over a failed model ID mid-session —
  a failed ID is a refresh trigger, not just a dispatch failure.
- v1 trigger is MANUAL: the operator asks buhhdy to "run calibration
  refresh". Keep the run single-instruction-executable so a scheduled
  trigger (omnigent timer or n8n webhook opening a session with that
  instruction) can drive it later with zero changes. Anything that would
  require interactive setup at run start is a bug in this skill.

## Hard rules — STOP if you're about to break one

- **No autonomous routing changes.** Routing rules, tier-table slots,
  gates, and Merge Authorization change only through the flagged
  human-judgment PR section. "The model is retired, so swapping the slot
  is obviously right" still goes through the human.
- **No freshness inflation.** A claim keeps its old verified-date unless
  this run actually re-verified it by the stated method.
- **No silent contradiction winners.** Two sources disagree → both go to
  the human, verbatim.
- **No sweep-marker note lines.** New calibration lines are for changes and
  discoveries; unchanged-claim freshness lives in the report.
- **No interactive prerequisites.** If the run stalls on a question that
  isn't a contradiction or a routing proposal, the skill is being
  violated.
- Calibration notes stay observational (facts/dates/outcomes, dated,
  supersede-not-delete) — the same discipline as any memory record.
