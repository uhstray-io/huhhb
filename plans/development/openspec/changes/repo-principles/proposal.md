## Why

This repository states its durable rules in three places, none of which a human
can read to understand why it is the way it is.

`AGENTS.md` is 400+ lines of turn-by-turn instruction written for an agent
mid-task. The six ADRs record individual ratified decisions but not the shape
they add up to. `skills/writing-skills/references/skill-authoring.md` is
normative for authoring one skill and says nothing about the repository around
it. A person evaluating huhhb — deciding whether to adopt it, contribute to it,
or trust its quality claims — has no document to read.

The rules exist and are unusually well-evidenced; they are simply not written
down for that reader. This change writes them down, and states the relationship
between that document and the agent-facing one so the two do not become a fourth
instance of the duplication this repo keeps having to remove.

## What Changes

- **New**: `PRINCIPLES.md` at the repository root — the durable rules and the
  deliberate trade-offs, written for a human. Each principle is a rule plus a
  terse *why*, tagged `[TARGET]` with an honest as-built note where it describes
  something not yet true.
- **New**: a huhhb-owned skill that authors a `PRINCIPLES.md` for a repository by
  crawling it for evidence and interrogating the operator about the trade-offs
  behind what it finds. It ships in the marketplace rather than depending on a
  user-tier skill that never travels with the plugin.
- **Modified**: `repo-kickstart` seeds a `PRINCIPLES.md` skeleton carrying the
  genre conventions, and names the authoring skill. It does not author content —
  kickstart stays idempotent and non-destructive.
- **Modified**: `AGENTS.md` gains an explicit statement of the audience split and
  the derivation edge, so a reader of either document knows which one they are in
  and where its rules come from.

**The audience split, which is the load-bearing decision here.** `PRINCIPLES.md`
is for humans; `AGENTS.md` is for agents; `AGENTS.md` is *partially derived from*
`PRINCIPLES.md`. Neither outranks the other and no tiebreaker clause is needed,
because they do not address the same reader. `AGENTS.md` remains canonical for
operations, and also carries material no principle implies — commit format,
release checklist, manifest shape.

## Capabilities

### New Capabilities

- `repo-principles`: what a `PRINCIPLES.md` is in this org — its audience, its
  per-principle form, its honesty obligations, and its relationship to the
  agent-facing operating document.

### Modified Capabilities

- `repo-bootstrap`: adds one concern — a conformed repository carries a
  `PRINCIPLES.md`, seeded as a skeleton by kickstart. Existing bootstrap
  behavior is unchanged.

**Sequencing:** depends on `kickstart-plans-layout` archiving first, so
`openspec/specs/repo-bootstrap/spec.md` exists for that delta to extend.

## Impact

- `PRINCIPLES.md` — new, repository root.
- `AGENTS.md` — the audience/derivation statement, and a maintenance clause
  binding the derived sections to the principles they come from.
- `CLAUDE.md` — currently says AGENTS.md is "the single source of truth". That
  claim is true *for agents* and needs the qualifier, or the repo appears to name
  two sources.
- `skills/repo-kickstart/` — the seeded skeleton and a verification row.
  **Constraint:** SKILL.md is near its 12,000-char FAIL threshold; the skeleton
  template belongs in `reference.md`.
- New skill directory, its `marketplace.json` entry, its
  `onboarding/skills-list.md` row, and its bench fixture — a new skill needs at
  least one discriminating G1 scenario before merging.
- The eight candidate principles are drawn from decisions this repo already made
  and can cite: the evidence gates, the enforcement split, memory routing,
  append-only records, and one-home-for-one-fact.

## Rollback Plan

- **`PRINCIPLES.md`** — delete it. Nothing executes against it and no gate reads
  it; it is a document whose only consumers are humans and the derivation clause.
- **The `AGENTS.md`/`CLAUDE.md` edits** — ordinary reverts. They add a
  qualification to an existing claim rather than replacing it, so reverting
  restores the prior wording exactly.
- **The authoring skill** — revert its directory, manifest entry and list row
  together, exactly as any skill is removed. The lint count returning to its
  prior value is the proof the revert was complete.
- **The kickstart skeleton** — repos scaffolded in between keep a `PRINCIPLES.md`
  skeleton, which is an empty document rather than a broken one. Nothing depends
  on its presence.

The one thing that does not cleanly roll back is a `PRINCIPLES.md` that has been
**wrong** rather than absent — a stated principle the repo does not actually
follow is worse than no document, because it will be cited. The `[TARGET]`
convention exists for exactly this: a rule that is not yet true is shipped
labelled, not shipped silently.
