## Purpose

Defines the properties every skill published from this marketplace must have —
hand-written or machine-generated alike — and which enforcement layer is
responsible for proving each one, so that "is this skill good enough to ship"
has a mechanical answer rather than a reviewer's opinion.

## ADDED Requirements

### Requirement: A description states when to use the skill

A skill's description SHALL state the conditions under which it applies, in the
vocabulary a user would actually type, rather than describing what the skill
contains. The description is the only text the model sees when deciding whether
to invoke a skill, so a description that summarises content instead of naming
triggers is undiscoverable regardless of how good the body is.

#### Scenario: A description naming triggers is selected over a summarising one

- **WHEN** two skills could plausibly serve a request, and one description names
  the request's phrasing while the other summarises its own contents
- **THEN** the trigger-naming skill is the one invoked

#### Scenario: A description without trigger conditions fails the gate

- **WHEN** a skill is submitted whose description states only what the skill is
  about, with no conditions of use
- **THEN** the authoring gate reports it as undiscoverable and the skill does not
  ship

### Requirement: One skill covers one coherent unit of work

A skill SHALL cover a single coherent task class. A skill whose description
requires "and" between unrelated capabilities MUST be split, because a compound
description competes for triggers it cannot serve well and dilutes the surface
of both halves.

#### Scenario: Compound scope is rejected

- **WHEN** a skill's stated purpose spans two task classes that a user would
  request separately
- **THEN** the authoring gate reports the skill as non-discrete and names the
  seam along which it should be split

### Requirement: A skill earns the context it consumes

A skill SHALL justify its context cost against the alternative of not existing.
The context window is a shared resource: every token a skill occupies is denied
to the task. A skill whose guidance the model already follows unaided consumes
budget and returns nothing.

#### Scenario: A skill measurably beats its own absence

- **WHEN** a skill is benchmarked against a baseline arm with the skill disabled
- **THEN** the skill arm completes the scenario the baseline arm fails, or the
  skill does not ship

#### Scenario: Body size is bounded by disclosure, not by trimming

- **WHEN** a skill's guidance exceeds what its body can carry concisely
- **THEN** the detail moves to a progressively-disclosed reference the skill
  points at, rather than being deleted or inlined

### Requirement: A skill supplies rules the model lacks

A skill SHALL encode judgment the model does not already apply, at the weakest
prescriptiveness that achieves the outcome. Restating default behavior as a rule
adds tokens without changing output, and over-prescribing a task the model
handles well makes the result worse.

#### Scenario: Restated default behavior is rejected

- **WHEN** a candidate rule describes behavior the unaided baseline already
  exhibits in benchmark runs
- **THEN** that rule is removed from the skill rather than shipped

### Requirement: No skill ships without evaluation

Every skill SHALL have at least one benchmark scenario that discriminates —
one the skill passes and its skill-disabled baseline fails. A scenario that both
arms pass, or both arms fail, measures something other than the skill and MUST
NOT be counted as evidence.

#### Scenario: A non-discriminating scenario is not evidence

- **WHEN** a benchmark scenario is passed by both the skill arm and the baseline
  arm
- **THEN** the scenario is reported as non-discriminating and does not satisfy
  the evaluation requirement

#### Scenario: A green run over zero discriminating scenarios is not a pass

- **WHEN** every scenario for a skill is excluded or non-discriminating
- **THEN** the gate reports that nothing was measured, and MUST NOT report a pass

### Requirement: Silence is proven, not assumed

A skill SHALL be measured for when it must *not* activate, not only for when it
must. Trigger precision is a property of the description, and a skill that fires
on adjacent-but-wrong requests degrades every other skill's discoverability.

#### Scenario: A negative-activation scenario holds the description honest

- **WHEN** a skill declares a request class it must stay silent on, and a probe
  issues a request from that class
- **THEN** the skill does not activate, and an activation is reported as a
  precision failure

### Requirement: A refinement must not regress the version it replaces

A revised skill SHALL be proven not worse than the version it replaces before it
ships. Absolute quality scores compress and drift across judge-model versions, so
non-regression MUST be established by comparison against the prior version rather
than by an absolute threshold.

#### Scenario: A refinement that loses more comparisons than it wins is blocked

- **WHEN** a revised skill is compared against its predecessor across the
  scenarios both pass objectively, and loses more of those comparisons than it
  wins
- **THEN** the refinement does not ship

#### Scenario: Being better is a higher bar than being not-worse

- **WHEN** a refinement wins its comparisons but the number of decided
  comparisons is below the sample floor
- **THEN** the result is reported as not-worse, and the refinement MUST NOT be
  declared superior

### Requirement: Machine-checkable rules are enforced mechanically

Any rule in this standard that can be checked without judgment SHALL be enforced
by an automated gate rather than left to review. Rules requiring judgment remain
with human review and MUST NOT be approximated by a mechanical check that would
produce confident wrong answers.

#### Scenario: Adoption does not retroactively fail existing skills

- **WHEN** a new mechanical check is introduced and existing skills violate it
- **THEN** those violations are recorded as grandfathered baseline debt and the
  gate passes, so adoption is not blocked by pre-existing debt

### Requirement: Generated skills meet the same bar

A skill authored by the automated distillation pipeline SHALL be held to this
standard identically to a hand-written one. A pipeline that emits skills exempt
from the standard reintroduces every problem the standard exists to prevent, at
a faster rate.

#### Scenario: The pipeline consults the standard at authoring time

- **WHEN** the distillation pipeline produces a new or refined skill
- **THEN** the skill satisfies this standard's requirements before it is
  proposed, and is gated identically to a hand-written submission
