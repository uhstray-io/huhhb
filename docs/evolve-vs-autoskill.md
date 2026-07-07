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
| **Retrospective mining of history** | ✓ (`--import`/`--extract-all` over all past transcripts) | ✗ — learns going-forward only | **autoskill** |
| **Workflow-skill distillation from successful sessions** | ✓ (threshold-triggered `claude -p`) | ✗ — evolve distills from *corrections*, not workflows (design Phase 3, deferred) | **autoskill** |
| PreCompact capture | ✓ | n/a — digest reads the transcript *file* incrementally (byte cursor), so context compaction can't lose signal | tie (evolve resilient by design) |
| Anti-poisoning (PII/secret redaction, anti-capture, volume caps) | ✗ none — stores full raw turns unencrypted | ✓ five guardrails (GR1–GR5), redaction, quarantine | **evolve** |
| Human-in-the-loop before a skill lands | ✗ auto-writes to `~/.claude/skills/` | ✓ proposals staged to `pending/`, approved in review | **evolve** |
| Eval gate before registration | ✗ no quality gate at all | ✓ G1 bench + "no eval, no registration" | **evolve** |
| Confidence / provenance on skills | ✗ ("limited provenance", no scoring) | ✓ earned confidence, `version ← session-ids` | **evolve** |
| Memory strata / routing | ✗ slash-command skills only | ✓ Honcho / repo-memory / MemPalace / overlay routing | **evolve** |
| Dedup | LLM reads a skills-inventory list | lint S5 + review judgment + quarantine | tie |

**Summary:** evolve is materially ahead on safety, quality gating, provenance,
and memory strata. autoskill is ahead on exactly two axes, both of which evolve
*designed* but *deferred*: retrospective history mining and workflow-skill
distillation.

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

### 2. Workflow-skill distillation (DESIGNED — deferred, Phase 3)

autoskill's core trick — distill a *successful multi-step workflow* into a
skill — is evolve's `docs/skill-lifecycle.md` Phase 3, still unbuilt. The
adaptation is not a copy: autoskill auto-writes unproven skills to disk (a
sprawl/poisoning risk evolve rejects). evolve's version keeps autoskill's
extraction mechanism (threshold-triggered `claude -p` over journal-referenced
sessions) but behind evolve's gates — distill to a *proposal* in `pending/`,
require the ≥2-session evidence bar, bundle a G1 eval, and land only on human
approval. Tracked as the next lifecycle increment; autoskill's `autoskill.py`
extraction prompt is the reference to adapt.

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
