## Purpose

Defines how this project handles a requirement it cannot check before release —
how the unverified claim is marked, when and against what artifact it is later
checked, and what happens to the change that made the claim when the check fails.

## ADDED Requirements

### Requirement: A structurally-verified requirement is marked partial, never claimed

Where a requirement is confirmed only by inspecting source — a manifest entry, a
description, a test over files — and not by observing the running system, it
SHALL be recorded as partially verified, naming what was proven and what was not.
A claim that reads as verified when only its inputs were checked is the failure
this project has already made once: four skills were believed retired for eight
days because the retirement was confirmed in a file the runtime never reads.

#### Scenario: A source-only check is recorded as partial

- **WHEN** a requirement is confirmed by reading files rather than by observing
  behaviour
- **THEN** it is recorded as partial, stating separately what was proven and what
  remains unproven

#### Scenario: The blocker is named, not implied

- **WHEN** a requirement is marked partial
- **THEN** the specific action that would complete it is named, so a reader can
  tell an unverifiable claim from an unperformed one

### Requirement: Post-release checks run against the published artifact

A deferred check SHALL be performed against the artifact users actually receive —
installed from the marketplace after merge — and never against a working tree, a
hand-assembled cache, or a local build. Verifying a different artifact than the
one shipped proves something about the wrong thing, and this repo's install
tooling makes that mistake easy to make silently.

#### Scenario: The installed artifact is confirmed before anything is checked

- **WHEN** a post-release verification begins
- **THEN** the installed version is read back and matched against the expected
  release before any scenario is exercised

#### Scenario: A stale or reverted install voids the run

- **WHEN** the installed artifact does not match the expected release
- **THEN** no result is recorded and the run is reported as void, rather than its
  findings being kept with a caveat

### Requirement: The result is written back to the change that made the claim

A completed post-release check SHALL update the originating change's record, so
its coverage reflects what is now proven. An archived change carrying a stale
"partial" is indistinguishable from one nobody ever came back to.

#### Scenario: Coverage stops reading partial once proven

- **WHEN** a deferred scenario is verified live
- **THEN** the originating change's coverage record is updated to reflect it

#### Scenario: A still-unverifiable scenario keeps its status and gains a reason

- **WHEN** a deferred scenario cannot be checked even after release
- **THEN** it remains partial and the record states why, rather than being
  quietly dropped

### Requirement: A failed check reopens the claim

Where a post-release check contradicts a requirement, that SHALL be treated as a
defect in the originating change rather than as an observation about it. The
change asserted behaviour the system does not have; recording the contradiction
without acting on it leaves a specification that lies.

#### Scenario: A contradicted requirement produces a defect, not a footnote

- **WHEN** a live check shows the system does not do what a requirement states
- **THEN** the failure is raised as a defect against the originating change, and
  the requirement is not marked verified

#### Scenario: Verification does not quietly fix what it finds

- **WHEN** a post-release check finds a defect
- **THEN** the fix belongs to its own change, so that a verification pass cannot
  silently become an unreviewed edit
