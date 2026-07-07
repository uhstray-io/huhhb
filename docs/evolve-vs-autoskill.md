# evolve vs. claude-autoskill — comparison & adopted improvements

Assessment of [sam-ueckert/claude-autoskill](https://github.com/sam-ueckert/claude-autoskill)
(upstream: wwt/claude-autoskill) against huhhb's evolve suite, and what evolve
adopts from it. Both descend from the same paper (MUSE-Autoskill,
arXiv:2605.27366); they made different bets.

## What claude-autoskill does

A single `autoskill.py` + four Claude Code hooks (UserPromptSubmit, Stop,
SessionEnd, PreCompact) that archive every conversation turn to SQLite, and —
when a per-session turn delta crosses `extract_every_turns` (default 8) — call
`claude -p` to distill **multi-step workflow skills** into
`~/.claude/skills/as-<name>/SKILL.md`. It mines both prospectively (live
hooks) and retrospectively (`--import`/`--extract-all`/`--search` over all
`~/.claude/projects/*.jsonl`). A `--refine` pass batch-reviews skills for
keep/update/merge/delete.

## Head to head

| Capability | claude-autoskill | evolve | Winner |
|---|---|---|---|
| Prospective capture from live sessions | ✓ (Stop hook, turn archive) | ✓ (Stop hook, typed observations) | tie |
| **Retrospective mining of history** | ✓ (`--import`/`--extract-all` over all past transcripts) | ✓ now — `digest.py --backfill` mines all past transcripts *through the capture guardrails* (this PR) | **evolve** (screened, not raw) |
| **Workflow-skill distillation from successful sessions** | ✓ (threshold-triggered `claude -p`, auto-written) | ✓ now — `/evolve-distill` distills class-level, but as a gated proposal (≥2-session, eval, GR4, human-approved), never auto-written (this PR) | **evolve** (gated, not auto) |
| **Cross-skill relationships / tier map / promotion** | ✗ — flat `~/.claude/skills/as-*`, no graph, no tiers | ✓ `/evolve-map`: repo/user/plugin inventory, relationship graph, augment-before-create, user→repo promotion (this PR) | **evolve** |
| PreCompact capture | ✓ | n/a — digest reads the transcript *file* incrementally (byte cursor), so context compaction can't lose signal | tie (evolve resilient by design) |
| Anti-poisoning (PII/secret redaction, anti-capture, volume caps) | ✗ none — stores full raw turns unencrypted | ✓ five guardrails (GR1–GR5), redaction, quarantine | **evolve** |
| Human-in-the-loop before a skill lands | ✗ auto-writes to `~/.claude/skills/` | ✓ proposals staged to `pending/`, approved in review | **evolve** |
| Eval gate before registration | ✗ no quality gate at all | ✓ G1 bench + "no eval, no registration" | **evolve** |
| Confidence / provenance on skills | ✗ ("limited provenance", no scoring) | ✓ earned confidence, `version ← session-ids` | **evolve** |
| Memory strata / routing | ✗ slash-command skills only | ✓ Honcho / repo-memory / MemPalace / overlay routing | **evolve** |
| Dedup | LLM reads a skills-inventory list | lint S5 + review judgment + quarantine | tie |

**Summary:** evolve was already ahead on safety, quality gating, provenance,
and memory strata. The two axes autoskill led on — retrospective history mining
and workflow-skill distillation — are now closed (`--backfill` and
`/evolve-distill`), and evolve's versions are *screened* and *gated* where
autoskill's are raw and auto-written. `/evolve-map` adds a cross-skill layer
autoskill has no analogue for.

## What evolve adopts

### 1. Retrospective backfill (BUILT — this change)

`digest.py --backfill` mines existing `~/.claude/projects/*/*.jsonl`
transcripts through evolve's **existing** capture pipeline. This is the
capability evolve most lacked (a fresh install started blind), and evolve's
digest already parses exactly this format — so the borrow is a thin driver,
not a new parser.

Crucially, evolve does the aggressive thing autoskill does, *safely*: every
backfilled observation passes the same gates as live capture — secret
redaction, harness-block stripping, the anti-capture filter, trust tagging,
and GR2 volume quarantine. Where autoskill ingests raw turns with zero
screening, evolve backfill can bulk-mine hundreds of historical sessions and a
poisoning batch is still held from the trusted view. Idempotent via the
per-session byte cursor (re-running skips processed transcripts); `--dry-run`
previews; `--limit` bounds it.

### 2. Workflow-skill distillation (BUILT — this change, `/evolve-distill`)

autoskill's core trick — distill a *successful multi-step workflow* into a
skill — is now `/evolve-distill`, but not a copy: autoskill auto-writes
unproven skills to disk (a sprawl/poisoning risk evolve rejects). evolve's
version keeps the extraction idea but the agent is the extractor (no
`claude -p` subprocess, no raw-turn archive) and the output is a *proposal*,
gated at `overlay.py propose` — ≥2-session evidence, a bundled G1 eval (no
eval, no registration), and the GR4 poisoning scan — landing only on human
approval, scaffolded at 0.0 confidence.

### 3. Cross-skill map & user→repo promotion (BUILT — this change, `/evolve-map`)

Beyond anything autoskill offers: `skill_graph.py` inventories every skill
across repo/user/plugin tiers and flags overlaps/collisions; `/evolve-map`
draws the relationship graph, enforces augment-before-create (a new skill only
for a confirmed gap, then via `/evolve-distill`), and adds the
`repo-promotion` path so a proven user skill can be promoted to the shared
repo tier through a human-merged PR (body + rationale + eval + GR4 scan).

## What evolve deliberately does NOT adopt

- **Raw-turn SQLite archive.** autoskill stores full unredacted turns. evolve
  stores *typed, sanitized observations* in a capped journal — capture purity
  over raw retention (Law 1). Backfill respects this: it produces observations,
  never a turn archive.
- **Auto-writing skills without approval or eval.** The consequence-radius
  doctrine (device auto / overlay approval / hub PR) stands.
- **A second `extract_every_turns` global threshold.** evolve's per-session
  byte cursor + GR2 volume cap already cover the "how much is enough / too
  much" question.
