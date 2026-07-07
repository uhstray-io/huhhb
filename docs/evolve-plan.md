# evolve — the living plan

The single source of truth for the evolve self-learning suite: architecture,
doctrine, guardrails, quality gates, scenario catalog, and the development
roadmap. **Every update or change to evolve is recorded here** (see
[Change log](#change-log)) — this file supersedes the former
`evolve.md`, `evolve-guardrails.md`, `evolve-testing.md`,
`evolve-scenarios.md`, `skill-quality-bar.md`, `skill-lifecycle.md`, and
`evolve-vs-autoskill.md`.

## Mission

evolve makes huhhb sessions compound: what you correct once, the agent knows
next session. It is **off until configured** — on a machine with no
configuration, huhhb behaves exactly as if evolve were not installed.

Principles that outrank features:

1. **Capture purity beats volume.** A missed preference costs one session; a
   poisoned observation is injected into every future session until caught.
2. **Never persist a grudge.** Failures are remembered as their *fix*, never
   as a capability claim ("X is broken") — a persisted grudge becomes a
   refusal cited for months.
3. **Consequence radius gates promotion.** Device-local changes are cheap;
   personal overlays need user approval; hub changes are always a
   human-merged PR.
4. **Nothing deletes evidence.** Guardrails filter the *view* and refuse
   unsafe *writes*; the journal keeps everything as the audit trail.
5. **The agent extracts; it never writes a skill.** Creation is a gated
   proposal a human approves.

## Architecture

```text
your session ──Stop hook──► digest (local) ──► spool ──► flusher ──► journal / Honcho
                                                              │
next session ◄──SessionStart hook◄── injection.md (cache) ◄───┘
```

Five stages: **capture** (`digest.ts` — typed observations: preferences,
corrections, skill usage, environment fixes) → **deliver** (`flush.ts` —
spool drain, GR2 screening) → **inject** (`evolve-inject.sh` — cached
context, before the first user turn) → **adapt** (`/evolve-review` — triage
into overlays / repo-memory / conclusions) → **promote** (quality gates
G0–G2 below).

### Modes

**Local (default — no server):** observations land in `journal.jsonl`; the
review pass is the deriver and maintains `conclusions.md` (superseding, not
accumulating; ~60-line cap because injection has a token budget). No
background derivation, no semantic search, single-machine memory.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/evolve/honcho_client.ts init --local
```

**Self-hosted [Honcho](https://honcho.dev)** (privacy at full capability):
run the server and deriver worker with your own LLM keys (see honcho.dev
docs), then `init --url http://your-host:8000` and `smoke`.

**Managed** ([api.honcho.dev](https://honcho.dev)): `init --api-key <key>`.
What the managed service means for your data (verified 2026-07-06 against
honcho.dev, the privacy policy eff. 2025-04-24, and the ToS — re-verify
before relying on it):

- **Cost**: one-time $100 signup credit (no perpetual free tier), then
  usage-based — $2.00/1M tokens ingested; storage/retrieval free; chat
  reasoning $0.001–$0.50 per query. No published spend caps.
- **Data use**: no training of *public* models on your content without
  opt-in, but non-public fine-tuning on de-identified data is permitted by
  default. The managed deriver runs on *their* models/keys; content transits
  their inference subprocessors and LLM-observability tooling.
- **Protections**: TLS + AES-256, 90-day configurable retention, hard-delete
  on workspace purge, logical workspace isolation. **Not** SOC 2 / HIPAA
  certified; US-hosted only; no default SLA.
- **Fully local** = local mode or self-hosting with your own keys. Treat
  managed as fine for low-sensitivity telemetry, not regulated content.
- Licensing boundary: the SDK we import is Apache-2.0; the server is
  AGPL-3.0 and is **never vendored** into this tree.

**Skip**: do nothing. Every hook exits instantly; nothing is stored.

Config precedence: `HONCHO_URL`/`HONCHO_API_KEY`/`HONCHO_WORKSPACE` env >
`~/.config/huhhb/evolve.json` > unconfigured.

### Bootstrap from history (backfill)

A fresh install learns only going-forward; backfill seeds it from existing
session transcripts **through the same capture pipeline** — redaction,
harness stripping, anti-capture, trust tagging, and volume quarantine all
apply, so a bulk/poisoned historical session is held, never blindly trusted.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/evolve/digest.ts --backfill --dry-run   # preview, writes nothing
node ${CLAUDE_PLUGIN_ROOT}/scripts/evolve/digest.ts --backfill             # mine ~/.claude/projects/*/*.jsonl
node ${CLAUDE_PLUGIN_ROOT}/scripts/evolve/digest.ts --backfill --limit=50  # bound to the 50 most-recent
```

Idempotent via per-session byte cursors. First real run on this machine
(2026-07-06): 420 transcripts → 209 observations from 149 sessions, 6
quarantined by GR2 unaided — and it caught a live capture bug (compaction
summaries quoting old corrections re-captured as new; now S07's third probe).

### Where data lives · purge

| What | Where |
|---|---|
| observations + conclusions | Honcho workspace you chose; local mode: `journal.jsonl` + `conclusions.md` under `~/.local/share/huhhb/evolve/` |
| spool/cache/state | `~/.local/share/huhhb/evolve/` |
| learned overlays | `~/.claude/skills/*-local/` (archived to `_archive/`, never deleted) |
| config | `~/.config/huhhb/evolve.json` |

Pseudonymous (random profile id); nothing is shared with uhstray.io. Purge:
remove the Honcho workspace (if any), `rm -rf ~/.local/share/huhhb/evolve
~/.config/huhhb/evolve.json`, optionally `~/.claude/skills/*-local`.

## What it learns — and refuses to learn

Captured: durable preferences, corrections of agent behavior, skill usage and
outcomes, environment problems *and their fixes*, recurring techniques.

Refused (the anti-capture list): failures without fixes, negative-capability
claims, transient errors that resolved, one-off task narratives, quoted
example phrases inside pasted documents, harness-injected scaffolding
(command wrappers, notifications, CI events, compaction summaries). Secrets
are redacted before anything is stored.

## Anti-poisoning guardrails (GR1–GR5)

Poisoning is the loop's costliest failure: a bad observation is injected into
every future session until someone catches it. Pattern-matching alone is
always one vector behind (novel harness blocks and eval-environment
contamination both poisoned real memory before patterns existed for them), so
the defense is layered: pattern gates at capture, a **behavioral** net at
delivery, write-time refusal for the one artifact that can hijack future
agents.

**Invariant: nothing deletes evidence.** Quarantine filters the trusted view;
the journal keeps everything.

| # | Stage | Threat | Guardrail | Where |
|---|---|---|---|---|
| GR1 | capture | weak signal trusted as strong | trust tiers — every observation tagged `explicit`/`stated`/`inferred` | `guardrails.assess_trust` via `digest.ts` |
| GR2 | deliver/inject/recall | bulk batch poisons the cache | volume-anomaly quarantine — a session over `DURABLE_VOLUME_CAP` (5) durable observations is held **whole** (a `partial` skill-usage embeds the correction text, so partial holds leak) from injection, recall, honcho delivery, and G2 confidence | `guardrails.screen_for_injection` |
| GR3 | inject | leaked eval/sandbox state pollutes real memory | sandbox detection — `status` warns when the state dir looks like a temp/eval path | `guardrails.looks_like_sandbox` |
| GR4 | adapt | a learned artifact hijacks future agents | content scan refuses instruction-override/exfiltration patterns at the **propose boundary** for every executable surface: `body`, `content`, `eval.assert` (runs via `sh -c` in the bench runner), `eval.prompt` | `guardrails.scan_skill_content` via `overlay.ts propose` |
| GR5 | review | poison silently dropped or superseding good conclusions | visibility + supersession doctrine — quarantine surfaced and triaged first (promote genuine burst / discard poison / leave held); a new observation supersedes a conclusion only at ≥ its trust tier | `/evolve-review` prose |

GR2 detail: a real session states 0–2 durable facts; a pasted document or
injection attack produces many. False positives cost a review glance, never
lost memory — hold suspicious, never silently trust. Residual limit in honcho
mode: delivery is fire-and-forget, so slow cross-turn accumulation is caught
from the crossing digest onward; single-turn bulk dumps are caught in full.
GR4 is a trust-boundary check, not a content filter — it judges *safe to
install*, not *good*. If quarantine false-positives appear, make the cap
per-user configurable (upgrade path noted in `guardrails.ts`).

## Quality gates (G0 / G1 / G2)

```text
G0 static lint (free, every PR)       node scripts/skill-lint.ts
   └─► G1 merge bench (paid, on change)    node scripts/skill-bench.ts <skill>
          └─► G2 field promotion (continuous)   node scripts/evolve/g2.ts report
                 └─► improvement queue ─► patch ─► re-run G1 ─► PR
```

### G0 — static lint (FAIL blocks merge)

| # | Criterion | Threshold |
|---|---|---|
| S1 | Skill file exists at its `marketplace.json` path | required |
| S2 | Frontmatter is exactly `name` + `description` (no `triggers`) | required |
| S3 | `name` matches its directory | required |
| S4 | Description 30–500 chars, embeds trigger phrasing | length required; phrasing WARN |
| S5 | No two skills share a name or identical description | required |
| S6 | Body ≤ ~1500 tokens (≈6000 chars); use progressive disclosure beyond | WARN >1500, FAIL >3000 |
| S7 | Relative links resolve; `${CLAUDE_PLUGIN_ROOT}` paths exist | required |
| S8 | `marketplace.json` == `plugin.json` version; every entry versioned | required |

Pre-existing debt is grandfathered in `scripts/skill-lint-baseline.json` —
shrink it, never grow it. A deliberate S6 exception: `evolve-review`'s body
is operative doctrine the agent must see at invocation; thinning it into a
reference file would trade behavior for lint aesthetics.

### G1 — merge bench (per changed skill; 3 runs; medians)

Scenarios in `tests/bench/<skill>.json`; the runner drives real `claude -p`
and reads its JSON metrics. Every scenario also runs a **baseline** (same
prompt, skill disabled) — a skill must earn its tokens against doing nothing;
one that costs more and completes no better is negative value.

| # | Criterion | Gate |
|---|---|---|
| B1/B2 | Completion + accuracy — asserts on artifacts, not vibes | strict 3/3; phrasing 2/3 |
| B3 | Response quality (LLM-judge rubric when provided) | median ≥ 4/5 |
| B4/B5 | Tokens / cost | ≤ 1.5× baseline or per-skill budget |
| B6/B7 | Generate / reason latency | ≤ 2× baseline; B7 advisory |
| B8 | Tool-call efficiency (turns vs baseline) | ≤ 1.5× baseline |
| B9/B10 | Trigger recall / precision | ≥ 80% / ≥ 90% |
| B11 | Variance — strict outcomes must not flip across runs | no flip-flop |

G1 requires the plugin installed from the branch under test. Every live run
appends a row to `tests/bench/history.jsonl` — **git-tracked append-only
JSONL, never a database file**: rows are human-diffable in the PR, reviewed,
and audited by git. `node scripts/skill-trends.ts ledger|regressions` is the
query layer (plain aggregation — the ledger is small).

### G2 — field promotion (continuous)

Runner: `node scripts/evolve/g2.ts report [--json]` — reads the **screened**
journal (GR2: a quarantined batch never earns confidence) plus the bench
ledger; emits `promote / improve / demote / keep / no-data`. Read-only —
featured/pinned changes ship as PRs.

| # | Criterion | Bar |
|---|---|---|
| F1 | Earned confidence `min(runs/10,1) × success_rate` | ≥ 0.7 for featured/pinned |
| F2 | Correction pressure (same-session at/after use; the journal stores no turn indices by design) | 0 recurring |
| F3 | Freshness (last G1 date; upstream drift for synced skills) | re-bench > 90 days |
| F4 | Cross-model robustness | advisory |

Decisions: **merge** = G0 + G1 pass on ≥1 real scenario. **promote** = F1 ≥
0.7 and F2 clean. **demote/archive** = fails G1 after an improvement attempt,
or 60+ days unused with confidence < 0.3 → archive proposal. Pinned skills
are exempt from demotion, never from patching. F2 pressure is a *pointer*,
not a verdict — the review pass reads the corrections before acting (the
first field run flagged a skill whose same-session corrections were about
unrelated behavior).

## The skill lifecycle

Skills are long-lived assets, not one-off artifacts. External research this
design adapted found trajectory-distilled, eval-gated skills outperform
human-authored ones and pay for themselves after ~3 reuses — and that the
headline failure mode is single-trajectory overfit (run-specific paths and
calibrations baked in). Both shaped the gates.

```text
        ┌────────────── CREATE ──────────────┐
        │ evidence: ≥2 distinct-session      │
        │ witnesses, or explicit ask         │
        │ distill → SKILL.md (+scripts)      │
        ▼                                    │
   EVALUATE (G0 + bundled G1 scenario — REQUIRED; no eval, no registration)
        │ pass                               ▲
        ▼                                    │ patch (refiner = review pass
   REGISTER (overlay scaffold w/ provenance, │         proposals)
   or hub PR — human merges)                 │
        ▼                                    │
   REUSE (native catalog injection; recall surfaces earned confidence)
        ▼                                    │
   REMEMBER (telemetry: [skill-usage]/[correction] journal, bench rows)
        ▼                                    │
   REVIEW (/evolve-skills walks the library) ┤
        ├─ refine ───────────────────────────┘
        ├─ merge  (same capability → one general variant, others archived)
        └─ prune  (~60d unused + confidence <0.3 → archive proposal; pinned exempt)
```

Per-skill state machine: `candidate → new (G1-passed) → validated (first
field success) → active (confidence ≥0.5) → deprecated (proposed) → archived
(never deleted)`.

Creation protocol (`/evolve-distill`): distill **class-level, not
session-level** — name for the task class, strip session-specific paths and
values, never invent steps the user didn't demonstrate; single-trajectory
details go to `references/`, not the body. The proposal must bundle its eval
and its session witnesses; `overlay.ts propose` enforces the gates (distinct
≥2 sessions or `explicit`, eval with assert, GR4 scan of every executable
field). Confidence starts at 0.0 and is earned.

Tier delineation (`/evolve-map`): **repo** (`skills/`, PR-gated, everyone) ·
**user** (`~/.claude/skills/`, overlays and hand-written) · **plugin**
(installed, read-only — refine upstream). A proven user skill promotes to the
repo tier via the `repo-promotion` proposal (body + rationale + eval + GR4
scan → human-merged PR). `skill_graph.ts inventory|overlaps` is the
deterministic substrate; the map pass judges merge-vs-complement and enforces
augment-before-create.

## Command surface

| Command | Owns |
|---|---|
| `/evolve` | recall + explicit write; the read cost ladder |
| `/evolve-review` | session signal → overlays / repo-memory (triage, quarantine) |
| `/evolve-status` | loop health: journal, quarantine, cache age, spool |
| `/evolve-skills` | one skill's lifecycle verdict: refine/merge/prune |
| `/evolve-distill` | create one skill from a proven workflow (gated proposal) |
| `/evolve-map` | relate all skills; find gaps; user→repo promotion |

Boundary: *skills judges one, map relates all, distill creates one.*

## Verification

Three layers, all free and offline by default:

1. **Unit/component**: `node --test tests/test_evolve.test.ts` — sandboxed, in-process +
   subprocess CLI contract tests.
2. **Scenario catalog (S01–S27)**: `node scripts/evolve/evals.ts` — each
   scenario builds an isolated sandbox and drives the real pipeline,
   asserting on **artifacts, never vibes**. `--list` prints the catalog;
   `--with-claude` adds live halves (costs tokens; exercises the *installed*
   plugin, not the working tree); `--mode honcho --runs 3` for a configured
   instance.
3. **G1 bench**: real `claude -p` sessions (see quality gates).

Scenario conventions: hard assertion (every run) · `:phrasing` (one miss
allowed) · `:xfail` (documented known gap; **XPASS means the gap closed —
promote to hard, never delete an xfail silently**). A scenario earns its
place by provenance: a wild failure (with date), a doctrine law, or a
reviewer finding — a scenario without provenance is speculation.

The catalog (compressed; full assertions in `evals.ts`):

| Range | Proves |
|---|---|
| S01–S04 | the loop: cold preference injection; skill friction → overlay patch (never hub edit); fixes remembered not grudges; project decisions route to repo-memory |
| S05–S11 | capture purity: gerund corrections; quoted examples capture nothing; harness blocks (incl. CI events and compaction summaries) are never user speech; embedded markers strip their block only; secrets redacted everywhere; benign near-vocabulary phrasing ignored; idempotent re-digest |
| S12–S15 | memory semantics: witnesses kept + injection deduped; empty sessions create no cache; the local recall ladder; explicit writes instantly recallable |
| S16–S20 | artifacts + confinement: overlay lifecycle (semver, provenance, earned confidence, pinned, archive-never-delete); headless writes confined to `pending/`; truthful `status`; hooks inert-unconfigured and <1s; live library pass emits `verdicts:` tally and edits no hub skill |
| S21–S24 | guardrails: GR1 trust tiers; GR2 quarantine; GR4 write refusal; GR3 sandbox warning |
| S25–S27 | ecosystem: backfill through the guardrails (dry-run, quarantine, idempotent); distillation stays gated (no eval → refused; <2 distinct sessions → refused); cross-tier inventory/overlaps + promotion gate |

Known-gap register: currently none open. Closed gaps stay recorded with
provenance (harness CI-event block, 2026-07-05; headless allowlist hard-abort
— literal-match rules never match `$EVOLVE`-style invocations, diagnosed
2026-07-06, live re-verify pending; compaction-summary capture, 2026-07-06).

## Roadmap

Numbered so change-log entries can reference them. R1–R8 distill an external
review pass (2026-07-06) over four skill-learning and memory-agent systems;
each is stated as our own requirement, self-contained.

**R1 — Sharper derive-stage filters** (capture/distill prompts):
the de-identification reuse test ("after removing case-specific entities,
would this user need the same policy again? if what remains is generic
advice, extract nothing"); the WHAT/HOW distinction (content changes are
instance data; policy/workflow changes are skill candidates);
empty-extraction as the default success; "never invent steps the user didn't
demonstrate" as a hard rule. Extends the anti-capture list upstream.

**R2 — Formal merge policy** (map/skills passes): judge overlap on four
axes — job-to-be-done, deliverable type, hard constraints/success criteria,
required tools/workflow. Merge only when the same capability remains after
removing instance details; **an unsafe merge target degrades to add** (no
blind merges); low-confidence judgments fall back to the deterministic
overlap score. Merges bump patch versions and preserve both provenances.

**R3 — Champion/challenger benching + incubating status** (G1/G2): a revised
skill must beat the current version on its bench scenarios before replacing
it (the ledger already records before/after); lineages with thin evidence
stay `incubating` rather than registered — extends "no eval, no
registration" with "no victory, no replacement".

**R4 — Evidence-cited verification** (review + bench judge): the verifying
judge must cite concrete trajectory evidence (tool calls, files, exit codes)
for every pass verdict, not just emit a score. Our artifact-assert doctrine
already does this for code; extend it to the LLM-judge rubric (B3) and
review-pass outcome verification.

**R5 — Injection skepticism preamble + outline-index disclosure**: injected
context gets a standing header — *historical experience, not absolute truth;
when reality deviates, exit the guidance and record the deviation as new
signal*. Keep injection as an outline/index with detail fetched on demand
(the native catalog already does this for skills; apply it to conclusions
when they outgrow the cap).

**R6 — Delta-only derivation**: distillation prompts emit only entries that
changed ("only output modifications or additions; document only verified
procedures, never assumptions") — keeps review diffs minimal and the
conclusions file stable. Cap-forced consolidation stays (the ~60-line
conclusions cap is what forces generalization).

**R7 — Explicit state machines + hypothesis ledger**: encode the overlay/
proposal lifecycle transitions as a declared table validated at transition
time (corruption-proofing); attach an expected-delta hypothesis to each
refine proposal (`variable, expected_delta, status: pending → confirmed/
rejected` against the bench baseline) so G1 becomes a regression-attribution
ledger, one variable per patch.

**R8 — Honcho baked in, two levels** (the self-improvement design):

*Device level (user practices/behavior)*: hybrid write-ahead — the local
spool/journal stays authoritative (fail-open, at-least-once; never
drop-after-retry), Honcho becomes the deriver when configured. Peer model:
a user peer and an agent self-peer per profile; representations give
cross-session synthesis, semantic retrieval (`search_query`-scoped context
instead of whole-file injection), and supersession self-healing the
append-only journal can't do. Two-layer cached injection on cadences (base
context + dialectic supplement), injected cache-friendly, with empty-streak
backoff. Everything continues to pass GR2 screening at the delivery
boundary; Honcho output is *signal, never authority*.

*Repo level (the marketplace improves from aggregate usage)*: a fleet
workspace where **each repo skill is a peer** whose representation is what
the fleet has learned about it; devices are observer peers with
observe-others isolation. Devices deliver screened observations
(`skill:<name>` targets — the channel already exists); the deriver builds
per-skill representations; dialectic queries ("what corrections recur for
skill X?") feed G2/F2 and the curator's improvement queue; distilled
conclusions land as evidence in refine PRs. Hard trust boundary the
integration must add (the production integration we studied does not handle
poisoning): per-device peer isolation, aggregate only via queries — never
merge raw device data, GR2 screening before delivery, and the
human-approved `pending/`/PR gate before any fleet conclusion touches a
skill. One hostile device must never poison shared representations.

**R9 — Prior phases still open**: per-skill memory (`.memory.md` sibling
accumulating lessons across uses, loaded with the skill); refine-loop
automation (headless library pass on a cadence; bench-regression →
auto-staged refine proposal with before/after numbers); fleet parity
(telemetry-driven curator PRs; per-skill eval sets in CI as the merge gate).

**Deliberate non-goals** (unchanged): DAG context compression (session
context suffices); embedding retrieval; auto-merge without human approval;
auto-writing skills to disk (sprawl + poisoning risk — everything routes
through gated proposals).

## Open questions

- Hub-creation evidence bar: 2 sessions on one device is weak evidence for
  shipping to everyone — current answer: hub creation is always a PR, human
  decides; R8's fleet telemetry is the stronger future bar.
- Semantic merge detection stays judgment (review pass), not code.
- When champion/challenger re-verification is affordable: bench runs cost
  real tokens; cached baselines help; created-skill G1 runs are unavoidable
  spend (~3 reuses pay for it).

## Change log

Record every evolve change here: date, what changed, roadmap item or
provenance.

- **2026-07-07** — TypeScript migration completed and verified: 12 modules
  ported (78/78 unit tests, 80/80 offline scenario assertions, lint parity
  byte-for-byte); Python removed. Honcho-mode call surface aligned to the
  documented TS SDK (promise-returning peer/session, addMessages,
  searchQuery, reasoningLevel; live validation stays with `smoke`, C-17).
  Wild-caught during port verification: backfill spawned the flusher one
  directory too high (s25 caught it). Review hardening: spool filenames
  sanitize session_id (traversal-proof, regression-tested); the headless
  allowlist tightened to script-name-anchored rules (path-spelling
  agnostic, so $EVOLVE invocations still match). Version 0.5.4.

- **2026-07-06** — Consolidated seven docs into this plan; external repo
  references removed. Suite migrated Python → TypeScript (Node ≥22.18,
  zero-build, stdlib-only; DuckDB query layer replaced with plain
  aggregation). Roadmap R1–R8 added from the external systems review.
  Review-pass fixes: GR4 extended to `eval.assert`/`eval.prompt` (Critical),
  distinct-session evidence bar, plugin-tier identity in the skill graph,
  backfill flush honesty.
- **2026-07-06** — G2 gate shipped (`g2.ts report`); first field run: 6
  improve, 0 promote. Backfill dogfood: 209 observations / 149 sessions, 6
  quarantined; compaction-summary capture bug found and fixed (S07 probe 3).
- **2026-07-05** — Anti-poisoning guardrails GR1–GR5; scenario catalog to
  S27; `/evolve-distill`, `/evolve-map`, retrospective backfill shipped.
- **2026-07-04 and earlier** — Suite built: capture→derive→inject→adapt→
  promote loop, three modes, quality gates G0/G1, 6-skill command surface.
