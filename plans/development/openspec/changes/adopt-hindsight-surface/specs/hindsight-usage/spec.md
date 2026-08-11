## Purpose

Defines which of the experience store's capabilities this project uses and what
each is for — including the ones it declines — so that a capability is unused
because someone decided it should be, not because nobody read the tool list.

## ADDED Requirements

### Requirement: A retained memory that is wrong has a stated correction path

The routing policy SHALL name how a memory is corrected or retired once it is
known to be wrong or superseded, and SHALL distinguish the available operations
from one another. The policy already warns that a store full of low-value
memories retrieves worse than a small one; a warning with no remedy is an
instruction to accumulate.

#### Scenario: A wrong memory can be retired by an agent following the policy

- **WHEN** a memory is found to be wrong or superseded
- **THEN** the policy names the operation that retires it and the situation each
  available operation is for

#### Scenario: Correction is distinguished from deletion

- **WHEN** a memory is merely out of date rather than wrong
- **THEN** the policy distinguishes updating it from invalidating it, so the
  reasoning behind the original is not discarded to fix a detail

### Requirement: An unused capability is a recorded decision, not an omission

For each capability family the experience store exposes, the policy SHALL either
state what this project uses it for or state that it is not used and why. A tool
absent from the guidance is indistinguishable from a tool nobody noticed, and the
question re-opens every time someone reads the tool list.

#### Scenario: A reader can tell a rejection from an oversight

- **WHEN** someone compares the store's capabilities against this project's
  guidance
- **THEN** every family is accounted for as adopted-with-a-purpose or
  declined-with-a-reason

#### Scenario: A declined capability stays declined without re-litigation

- **WHEN** a capability was evaluated and declined
- **THEN** the recorded reason is sufficient to answer "why aren't we using
  this?" without re-running the evaluation

### Requirement: An adopted capability names the situation that triggers it

Guidance for an adopted capability SHALL name the concrete situation in which an
agent reaches for it. Capability guidance with no trigger is dead text: it costs
context on every load and changes nothing, which is the failure this repo's
authoring standard exists to prevent.

#### Scenario: Adoption is testable by its trigger

- **WHEN** a capability is adopted into the policy
- **THEN** the situation that calls for it is stated concretely enough that "this
  has never been triggered" is an observable fact rather than an assumption

### Requirement: Adoption extends the routing policy rather than adding a store of guidance

Guidance for the experience store SHALL live in the routing policy that already
governs read and write routing. A second document restating any part of it is the
duplicate-source-of-truth defect this project has removed three times in the past
week. A new skill is warranted only where a capability needs a *procedure* — a
sequence with gates — rather than a rule.

#### Scenario: A rule extends the policy

- **WHEN** an adopted capability is expressible as a routing rule
- **THEN** it is added to the routing policy and no second document repeats it

#### Scenario: A procedure earns a skill, and says why

- **WHEN** an adopted capability needs a gated sequence rather than a rule
- **THEN** a skill may own it, and the policy points at that skill instead of
  restating its steps
