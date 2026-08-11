## Context

See proposal.md — Why. The design-relevant state:

- `memory-setup` phase 0 already exists and already **STOP**s: *"each extra store
  is a competing source of truth. Present collisions; human picks retire /
  migrate / alongside / abandon."* The gate is right; it names no system.
- Phase 3 writes the routing policy into the operator's global configuration as a
  delimited, removable block (`reference.md` §405–477). That block is currently
  written the same way on every machine.
- Phase 4 already establishes a detect-first, never-clobber discipline for the
  per-repo command; the same discipline applies here.
- `memory-setup`'s SKILL.md sits near this repo's lint thresholds, so net prose
  belongs in `reference.md`.
- MemPalace is the concrete case: shipped by this repo for months, retired from
  routing 2026-08-01, still installed on machines that used it. Retirement made
  it invisible rather than absent, which is exactly why an operator would not
  volunteer it.

## Goals / Non-Goals

**Goals:**

- Detection that does not depend on what the operator remembers.
- One decision per store found, made by the human, recorded where it takes effect.
- A second run that shows the recorded decision rather than asking again.

**Non-Goals:**

- **Changing what gets installed.** codebase-memory-mcp and hindsight stay
  unconditional. This change alters what the survey *finds*.
- Migrating data out of a store the operator chooses to replace. "Replace" here
  means routing stops pointing at it, not that anything is moved or deleted —
  the same distinction `retire-mempalace` draws.
- Detecting every memory system in existence. The list is a floor.

## Decisions

**Each entry states its detection method, not just a name.** A list of names is
still a memory test — the operator reads "MemPalace" and answers from
recollection. A list of *checks* is executable: a binary on `PATH`, a registered
MCP server, a data directory. *Consequence:* an entry whose check cannot be
written is not ready to be listed, which is a useful filter on what goes in.

**The list is open, and says so.** A closed list invites the reading that an
unlisted store is therefore fine. *Alternative rejected:* an exhaustive
catalogue — it would be stale within a release and would still need the escape
hatch, so the escape hatch is the design.

**The question narrows to keep-or-replace.** The existing four options
(retire/migrate/alongside/abandon) blur two axes: what happens to the *data* and
what happens to the *routing*. This change only decides routing, so it asks only
that. *Consequence:* "migrate" leaves the menu — data movement is a separate job
and pretending a setup skill does it is worse than saying it does not.

**The answer is written into the routing policy, not a sidecar file.** The policy
is the artifact that acts on the decision, and it is already written per-machine
in phase 3. A separate record would be a second source of truth about the same
fact — this repo has removed three of those in the past week. *Consequence:* the
phase 3 block becomes parameterised by phase 0's answers rather than fixed text.

**A replaced store is recorded as replaced, not omitted.** Omission and oversight
are indistinguishable to the next reader, and the next reader is often the same
operator six months later. This mirrors the `[TARGET]` convention already adopted
for specs that describe unbuilt behavior.

**Recommend replacement; accept keeping.** Naming a recommended answer is what
makes the prompt useful rather than a shrug — but a store the operator depends on
is theirs to keep, and a setup skill that degrades a kept store has exceeded its
remit.

## Risks / Trade-offs

- **A detection check that reports absent when the store is present** lets a real
  collision pass as a clean machine — worse than not checking, because it
  produces false confidence. → Each entry names its method so a wrong answer is
  traceable to a check rather than an impression, and the gate runs the checks on
  a machine known to carry MemPalace.

- **Parameterising the phase-3 block risks breaking its idempotency**, which is
  load-bearing: `memory-setup` promises a re-run changes nothing. → The
  re-run scenario is a spec requirement, and the gate is a byte-identical diff
  across two runs with the same answers.

- **The prompt could become a wall of questions** on a machine carrying several
  stores, and a long prompt gets answered carelessly. → Only stores actually
  *found* are asked about; a machine with no collisions sees no questions at all.

- **"Replace" may be read as "delete my data."** → The wording must say routing
  stops pointing at the store, and that its data and installation are untouched —
  the same clarification `retire-mempalace` needed for the same reason.

## Migration Plan

No data migration; this changes a skill's procedure. Rollout is ordered only so
that nothing points at something absent:

1. Detection table in `reference.md` (nothing depends on it yet).
2. Phase 0 prompt rewritten to use it.
3. Phase 3 block parameterised by the recorded answers — last, because it is the
   consumer.

Machines already set up are unaffected until `memory-setup` is re-run, at which
point phase 0 surveys them for the first time and the operator answers once.

Rollback is per-step and covered in proposal.md — Rollback Plan.

## Open Questions

- **Where exactly in the routing block does a kept store's guidance sit** — a
  dedicated section, or a line inside the existing routing table? Affects
  readability of the generated block, not what gets built or tested.
- **Should the detection table live in `memory-setup` or somewhere shared**, if a
  future skill needs the same checks? Only worth answering once a second consumer
  exists; duplicating it pre-emptively would be the defect this repo keeps
  removing.
