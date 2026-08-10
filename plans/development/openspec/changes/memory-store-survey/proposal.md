## Why

`memory-setup` phase 0 already surveys "existing memory systems" and stops for a
human to pick retire / migrate / alongside / abandon. The mechanism is right; the
input is vague. It names no system, so what gets found depends entirely on what
the operator happens to think of, and the most likely collision on a huhhb
machine — MemPalace, which this repo shipped for months — is not among the things
it prompts anyone to look for.

A survey whose checklist is "think of some" finds what the operator already knew
about. The point of the phase is to surface the store they *forgot* they had.

## What Changes

- Phase 0 gains a **named detection list**: MemPalace first, since huhhb shipped
  it and retired it from routing, plus the other stores an agent machine
  plausibly carries. Each entry says how to detect it — a binary on `PATH`, a
  registered MCP server, a data directory — so detection is a check rather than a
  recollection.
- The list is explicitly **open**: an unlisted store found by the operator is
  handled the same way. The named entries are a floor, not a closed set.
- For every store found, the phase asks the same question and records the answer:
  **keep it alongside hindsight, or replace it with hindsight.** "Replace" is
  named as the recommended default for a store whose role hindsight now fills,
  and "keep" stays a legitimate answer — the human decides, and the answer is
  written down rather than re-derived on the next run.
- The recorded answer drives what phase 3's routing policy says about that store,
  so a machine's routing block reflects the choices its operator actually made.

**Not in scope:** changing which stores `memory-setup` installs. hindsight and
codebase-memory-mcp remain unconditional (phases 1 and 2). This change is about
what the survey *finds* and what it does with the answer.

## Capabilities

### New Capabilities

- `memory-store-survey`: what a memory-setup run must detect before installing
  anything, the question it must ask about each store it finds, and the
  obligation to record the answer where the routing policy can honour it.

### Modified Capabilities

None. `memory-setup`'s install phases are untouched.

## Impact

- `skills/memory-setup/SKILL.md` phase 0 row and `reference.md`'s phase 0
  section — the detection list and the keep-or-replace question.
- `reference.md`'s phase 3 routing-policy block — it must be able to say
  "MemPalace is opt-in here" or "MemPalace was replaced" depending on the answer,
  rather than assuming one.
- **Constraint:** `memory-setup`'s SKILL.md body is near this repo's lint
  thresholds; the detection table belongs in `reference.md`, with the SKILL.md
  row pointing at it.
- Sequencing: reads more naturally after `retire-mempalace` lands, since the
  keep-or-replace question for MemPalace is then a question about an opt-in
  store rather than a shipped one. Not a hard dependency.

## Rollback Plan

Documentation only **in this repo** — `memory-setup` is a skill, not a program,
so both pieces revert as ordinary edits.

**But the procedure writes to operator machines, and reverting the skill does
not un-write those.** The survey records its keep-or-replace decisions in a
managed block in the operator's global routing policy — a file this repo does
not own and cannot reach. So "nothing to migrate" is true of the skill and false
of its output, and the two must not be conflated:

- A machine that ran the new procedure keeps its managed block after a revert.
  The block must therefore remain **valid and self-describing on its own** —
  readable as a record of decisions without the version of the skill that wrote
  it, which is what makes leaving it in place safe.
- Cleanup is the operator's, and is an ordinary edit inside marked block
  delimiters. The skill SHALL NOT reach outside those markers, so removing the
  block never disturbs anything the operator wrote around it.
- A reverted skill meeting a newer block reads it rather than rewriting it.
  Re-deriving a decision the operator already made is the failure this whole
  change exists to prevent.

- **The detection list** — revert; phase 0 returns to its generic prompt and
  still stops for a human.
- **The keep-or-replace question** — revert; the existing retire/migrate/
  alongside/abandon prompt is already there and is what this refines.

The failure worth naming is not a bad revert but a bad list: a detection entry
that reports a store as absent when it is present would let a real collision pass
as a clean machine. That is why each entry states its detection *method*, so a
wrong answer is traceable to a check rather than to an impression.
