# repo-bootstrap Specification

## Purpose
Defines what a repository is guaranteed to have after `repo-kickstart` runs —
the planning tree, the OpenSpec root and its registration, and the invariant that
a change's status has exactly one home — so that "this repo is conformed" is a
checkable claim rather than an impression.

> **Partially as-built.** The five requirements from `kickstart-plans-layout`
> are implemented; *A conformed repository carries a PRINCIPLES.md*, added by
> `repo-principles` (0/26), is **[TARGET]**.

## Requirements

### Requirement: The planning tree has three homes and one name

A conformed repository SHALL carry `plans/development/`, `plans/architecture/`,
and `plans/product/`, and every directory the verification checklist asserts SHALL
be one the scaffold actually creates. The house name is `plans/`; `plan/` is not
a synonym for it and MUST NOT be treated as one.

#### Scenario: All three directories exist after a run

- **WHEN** kickstart completes on a repository that had no planning tree
- **THEN** all three directories exist with their READMEs, and the verification
  checklist finds nothing it asserts but the scaffold did not create

#### Scenario: A pre-existing tree is left alone

- **WHEN** kickstart runs on a repository that already has any of the three
- **THEN** existing files are not overwritten and the run still succeeds, because
  kickstart is idempotent and non-destructive

#### Scenario: A differently-named tree is reported, not merged into

- **WHEN** a repository keeps planning documents under a directory that is not
  `plans/`
- **THEN** the run reports the divergence rather than silently creating a second,
  empty tree alongside it

### Requirement: The OpenSpec root is initialized inside the development tree

A conformed repository SHALL have its OpenSpec root at `plans/development/`, with
`openspec/config.yaml` present and the root registered as a store under the
repository's name. The root is not at the repository root, because planning
documents and the specification store are the same concern and live together.

#### Scenario: An uninitialized repository gets a root and a registration

- **WHEN** kickstart runs and `plans/development/openspec/config.yaml` is absent
- **THEN** the root is initialized there and registered as a store, and both steps
  are idempotent on a re-run

#### Scenario: An already-registered store is not duplicated

- **WHEN** kickstart runs on a repository whose store is already registered
- **THEN** the registration reports that it already exists and no second store id
  is created

### Requirement: A missing OpenSpec CLI is resolved, never silently skipped

When the OpenSpec CLI is absent, kickstart SHALL report that the step cannot
complete and name what the operator must run, rather than printing a skip notice
and continuing as though the repository were conformed. Kickstart SHALL NOT
install software outside the repository on the operator's behalf.

#### Scenario: Absent CLI stops the step and says why

- **WHEN** the CLI is not on `PATH`
- **THEN** the run reports the OpenSpec steps as unresolved, names the install
  command, and the verification checklist does not report the repository as
  conformed

#### Scenario: Installation stays the operator's decision

- **WHEN** the CLI is absent
- **THEN** no global package is installed automatically, because installing
  software outside the repository is a decision with consequences the operator
  owns

### Requirement: A change's status has exactly one home

A conformed repository SHALL NOT carry a second, hand-maintained register of
change status alongside the specification store. Status, task counts and change
identity come from the store. Two records of one fact diverge, and the one
maintained by hand is the one that goes stale.

#### Scenario: Kickstart seeds no change index

- **WHEN** kickstart scaffolds the planning tree
- **THEN** no implementation-plan index file is created, and nothing in the
  scaffolded repository requires one to exist

#### Scenario: Archiving succeeds without an index

- **WHEN** a change is archived in a repository conformed by kickstart
- **THEN** the archive completes and the ADR is promoted, with no step failing on
  a missing index row

### Requirement: One writer owns decision records, and owns nothing else

The decision-record writer SHALL own the ADR at
`plans/architecture/YYYY/YYYY-MM.md`, its year index row, and its master index
row — and nothing beyond them. It SHALL NOT read, write, or fail on any register
of change status. A writer that spans two concerns makes the second one a
precondition of the first.

#### Scenario: Promotion succeeds where no change index exists

- **WHEN** a decision record is promoted in a repository conformed by kickstart
- **THEN** the ADR and both index rows are written, and nothing consults or
  requires an implementation-plan index

### Requirement: A conformed repository carries a PRINCIPLES.md

`repo-kickstart` SHALL seed a `PRINCIPLES.md` skeleton at the repository root
carrying the genre conventions — the audience statement, the rule-plus-reason
form, and the target-labelling convention — and SHALL name the skill that
authors its content. Kickstart SHALL NOT author principles itself: it is
idempotent and non-destructive by contract, and principles are produced by
examining a repository and questioning its operator, which is neither.

#### Scenario: A repository without one gets a skeleton, not content

- **WHEN** kickstart runs on a repository with no `PRINCIPLES.md`
- **THEN** a skeleton is created carrying the conventions and a pointer to the
  authoring skill, and no principle is invented for the repository

#### Scenario: An existing PRINCIPLES.md is never overwritten

- **WHEN** kickstart runs on a repository that already has one
- **THEN** the file is left exactly as it is, and the run still succeeds

#### Scenario: The skeleton is reported as unfinished

- **WHEN** the verification checklist runs against a repository whose
  `PRINCIPLES.md` is still an unfilled skeleton
- **THEN** it is reported as present-but-unauthored rather than counted as
  satisfied, so an empty skeleton cannot read as a conformed repository
