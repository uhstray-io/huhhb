## ADDED Requirements

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
