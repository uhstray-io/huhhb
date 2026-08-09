# repo-principles Specification

## Purpose
Defines what a `PRINCIPLES.md` is in this organization — who it is written for,
the form each principle takes, what it must admit about itself, and how it
relates to the agent-facing operating document — so that a repository's durable
rules are readable by a person without becoming a second copy of the instructions
an agent follows.

> **[TARGET] — not yet true.** No `PRINCIPLES.md` exists in this repository and
> the authoring skill is unwritten. Tracked by the `repo-principles` change
> (0/26). Do not reason as if these guarantees hold.

## Requirements

### Requirement: PRINCIPLES.md is written for a human

`PRINCIPLES.md` SHALL address a person deciding whether to adopt, contribute to,
or trust the repository. It SHALL state durable rules and the deliberate
trade-offs behind them, not turn-by-turn procedure. Procedure written for an
agent belongs in the agent-facing document, and a principles file that drifts
into it becomes a second copy of instructions that already exist.

#### Scenario: A reader learns why, not what to type

- **WHEN** a person unfamiliar with the repository reads `PRINCIPLES.md`
- **THEN** they can state what the repository refuses to do and why, without
  needing any command, file path, or tool invocation from it

#### Scenario: Procedure is deferred, not restated

- **WHEN** a principle is enforced by a documented procedure
- **THEN** the principle names the rule and points at the procedure, and does not
  reproduce its steps

### Requirement: Every principle carries a rule and its reason

Each principle SHALL state a rule and, separately, why that rule exists. A rule
without a reason cannot be applied to a case its author did not anticipate, and
is obeyed literally or ignored entirely.

#### Scenario: A novel case is decidable from the reason

- **WHEN** a situation arises that no principle names directly
- **THEN** the reasons attached to the nearest principles are sufficient to argue
  the case either way, rather than leaving the reader with only literal text

### Requirement: A rule that is not yet true is labelled

Where a principle describes a target the repository has not yet reached, it SHALL
be marked as such and carry an honest note of what is actually built. A reader
SHALL NOT reason as though a labelled guarantee already holds. An unlabelled
aspiration is indistinguishable from a false claim about the system.

#### Scenario: An aspirational rule cannot be mistaken for a guarantee

- **WHEN** a principle describes behavior the repository does not yet have
- **THEN** it is marked as a target and states what is true today

#### Scenario: A principle names its own violations

- **WHEN** the repository contains a known instance that contradicts a stated
  principle
- **THEN** that instance is named in the principle's as-built note, rather than
  the principle being written as though the violation did not exist

### Requirement: The audience split is stated, and the derivation is maintained

`PRINCIPLES.md` and the agent-facing operating document SHALL each state who they
are for, and SHALL state that the operating document is partly derived from the
principles. Neither SHALL claim precedence over the other, because they address
different readers. When a principle changes, the derived sections of the
operating document SHALL be reviewed in the same change.

#### Scenario: A reader knows which document they are in

- **WHEN** either document is opened
- **THEN** it states its audience and its relationship to the other

#### Scenario: A principle change does not silently orphan its derivation

- **WHEN** a principle is added, altered, or removed
- **THEN** the sections of the operating document derived from it are reviewed in
  that same change, so the two cannot drift into disagreement

#### Scenario: Neither document is the tiebreaker over the other

- **WHEN** a reader looks for which document wins a conflict
- **THEN** they find that the question does not arise, because each is
  authoritative for its own audience — and any genuine contradiction is a defect
  in the derivation, to be fixed rather than arbitrated

### Requirement: Principles are derived from decisions the repository has made

A principle SHALL be traceable to a decision, an incident, or a measurement in
the repository, and SHALL NOT be authored as generic best practice. A principles
file assembled from received wisdom describes some other project, and is
abandoned the first time it conflicts with how the work is actually done.

#### Scenario: Each principle can name its evidence

- **WHEN** a principle is proposed
- **THEN** it can cite the decision record, measurement, or incident it came from

#### Scenario: Unevidenced advice is rejected

- **WHEN** a candidate principle has no such source in the repository
- **THEN** it is not admitted, however sound it seems in general

### Requirement: Authoring a PRINCIPLES.md is evidence-gathering, then interrogation

A `PRINCIPLES.md` SHALL be produced by examining the repository for what it
already does and then questioning the operator about the trade-offs behind it —
never generated from the repository's description alone. The mechanism SHALL ship
with the marketplace, because a repository being conformed cannot depend on a
skill that exists only on one machine.

#### Scenario: The crawl precedes the questions

- **WHEN** a repository has no `PRINCIPLES.md`
- **THEN** the authoring pass first gathers evidence from the repository, and the
  questions put to the operator are grounded in what was found

#### Scenario: The mechanism travels with the plugin

- **WHEN** the authoring pass runs on a machine that has only the published
  marketplace installed
- **THEN** every skill it depends on is available, and none is a user-local skill
