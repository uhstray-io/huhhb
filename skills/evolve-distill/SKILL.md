---
name: evolve-distill
description: Use when turning a repeated, successful multi-step workflow from past sessions into a reusable overlay skill — distilling a proven procedure into a class-level skill proposal ("distill a skill from this", "turn this workflow into a skill", "make a skill from how I keep doing X", "extract a skill from my history"). Creates an eval-gated, human-approved proposal — never writes a skill directly. For auditing existing skills use evolve-skills; for session corrections use evolve-review.
---

# evolve-distill — a proven workflow becomes a skill, safely

This is evolve's answer to autoskill-style skill creation
(`docs/evolve-plan.md`): distill a *successful multi-step workflow*
into a reusable skill — but behind every evolve gate. The difference that
matters: autoskill runs an LLM subprocess and **auto-writes** the skill to
disk. Here **you are the extractor** (the agent-is-deriver pattern), and the
output is a *proposal*, not a skill — it lands only after an eval and a human
say so. That prevents the sprawl and poisoning that ungated auto-creation
invites.

Paths: `EVOLVE=${CLAUDE_PLUGIN_ROOT}/scripts/evolve`; resolve state with
`python3 $EVOLVE/honcho_client.py status` (honors `XDG_DATA_HOME`).

## When NOT to distill

Most sessions produce nothing distillable, and that is the correct outcome.
A workflow earns a skill only when **all** hold — otherwise stop:

- **Reusable class, not a one-off.** A procedure for a *class* of tasks
  ("set up a new FastAPI service"), never a single task ("fix today's bug").
- **≥2 witnessing sessions** (the anti-overfit bar — autoskill's headline
  failure is single-trajectory skills that bake in run-specific paths). The
  exception is an explicit user ask ("make a skill from this"), which is its
  own evidence.
- **Non-obvious.** It saved real work and isn't common knowledge or a
  single command.
- **Not already covered** by a hub skill or an existing overlay (check
  `overlay.py report`; near-duplicate → propose a *patch* via evolve-review,
  not a new skill).

## Procedure

**1. Find candidates.** Recurring signal points at what to read:

```bash
python3 $EVOLVE/overlay.py distill-candidates
```

Task classes seen in ≥2 distinct sessions, with their session-ids. Thin by
design — it says *where to look*, not *what to create*. No candidates? Say
"nothing to distill" and stop (run `digest.py --backfill` first if the
journal is empty).

**2. Read the evidence — you are the extractor.** For a candidate, open the
named sessions' transcripts (under the projects dir from `status`) and confirm
the *same* multi-step workflow actually recurred and succeeded. Two sessions
that merely touched the same skill are not a workflow — read them and judge.
Verify success from artifacts (git log, test output) where the transcript is
ambiguous; never trust a self-report of "it worked."

**3. Distill class-level, strip the session.** Draft the SKILL.md body as
*When to use / Core principles / Workflow* with concrete tool commands.
Ruthlessly remove anything specific to one run — fixed paths, values, repo
names, calibrations. Whatever only one trajectory needed goes to a
`references/` note, not the body. A session-specific name is an automatic
reject; name for the class (`setup-fastapi-service-local`, never
`fix-x-today-local`).

**4. Write the eval — no eval, no registration.** A skill with no way to
prove it works never enters the catalog (the catalog is trusted recall). Draft
a bench scenario that asserts on **artifacts**: `{"id": ..., "prompt": ...,
"assert": "<shell that exits 0 iff the skill worked>", "judge": "<optional
rubric>"}`. This is the gate — `overlay.py propose` refuses an
`overlay-create` without it.

**5. Stage the proposal (never write the skill).** Pipe the proposal to
`propose` — it validates the eval and the ≥2-session bar, then stages to
`pending/`:

```bash
echo '{"kind":"overlay-create","name":"<class>-local",
       "description":"Use when …","body":"## When to use…\n## Workflow\n1. …",
       "summary":"distilled <class> workflow","signal":"recurred in N sessions",
       "sessions":["<id1>","<id2>"],
       "eval":{"id":"smoke","prompt":"/<class>-local …","assert":"…"}}' \
  | python3 $EVOLVE/overlay.py propose
```

**6. Record the mining (symmetric mining, Law 9).** Bank what *worked*, not
only failures: `honcho_client.py observe --type technique --target agent
--content "[technique] project=… — <the reusable method>"` so the next
distill pass sees the reinforcing signal.

**7. Hand off.** The proposal sits in `pending/`; `/evolve-review` presents it
for approval, and approval replays it via `overlay.py apply-pending` →
**GR4 skill-write scan** → overlay scaffolded at confidence **0.0** with its
`bench.json` bundled. It earns trust only through `overlay.py record` outcomes;
never present a fresh distilled skill as proven.

## Hard rules

- **Propose, never write.** This skill stages proposals only. Applying is
  `/evolve-review`'s human-gated step; scaffolding runs the poisoning scan.
- **≥2 sessions or an explicit ask.** One impressive session is the overfit
  trap, not evidence.
- **No eval, no registration.** Enforced mechanically at `propose`.
- **Class-level names; hub skills are read-only.** A distilled skill is always
  a user-scope `*-local` overlay. A gap in a *hub* skill routes to the fleet
  channel (`observe --target skill:<name>`), never a local edit.
- **Distill from success; strip the session.** The failure mode you are
  guarding against is baking one run's specifics into a "reusable" skill.
