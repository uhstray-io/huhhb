## Purpose

Defines what a memory-setup run must actively look for before it installs
anything, the decision it must put to the operator about each store it finds, and
the obligation to record that decision where the routing policy can act on it —
so that a competing store is caught by a check rather than by whether anyone
remembered it.

## ADDED Requirements

### Requirement: Detection is a named checklist, not a recollection

The survey SHALL check for a named list of memory systems, and each entry SHALL
state how it is detected — a binary on `PATH`, a registered MCP server, a data
directory, or a configuration entry. An open prompt to consider "existing memory
systems" finds only what the operator already had in mind, which is never the
store they forgot.

#### Scenario: A store the operator forgot is still found

- **WHEN** the survey runs on a machine carrying a memory system the operator
  does not mention
- **THEN** the listed detection check finds it and it is reported

#### Scenario: An unlisted store is handled the same way

- **WHEN** the operator identifies a memory system the list does not name
- **THEN** it is carried through the same decision and recorded identically,
  because the list is a floor rather than a closed set

#### Scenario: A detection result is traceable to its check

- **WHEN** the survey reports a store as present or absent
- **THEN** it names the check that produced that result, so a wrong answer is
  attributable rather than an impression

### Requirement: MemPalace is named explicitly

The detection list SHALL name MemPalace. This repository shipped it, then retired
it from routing while leaving it installed, so it is the most likely collision on
a machine that has used huhhb — and the least likely to be volunteered, because
retirement made it invisible rather than absent.

#### Scenario: A machine carrying MemPalace is told so

- **WHEN** the survey runs where MemPalace is installed
- **THEN** it is reported by name, with its retired-from-routing status stated,
  and carried into the keep-or-replace decision

### Requirement: Every store found gets a keep-or-replace decision

For each store the survey finds, it SHALL ask the operator to keep it alongside
hindsight or replace it with hindsight, and SHALL NOT decide on their behalf.
Replacement is named as the recommended answer for a store whose role hindsight
now fills; keeping is a legitimate answer. Deciding silently is what produces two
sources of truth with nothing recording which was meant to win.

#### Scenario: The human decides and the run stops for it

- **WHEN** the survey finds a store whose role overlaps a store being installed
- **THEN** the run stops, presents the overlap, and proceeds only on the
  operator's answer

#### Scenario: Keeping a store is a supported outcome

- **WHEN** the operator chooses to keep a store alongside hindsight
- **THEN** the run continues normally and the store is not disabled, removed, or
  degraded

### Requirement: The decision is recorded where routing can honour it

Each answer SHALL be written into the routing policy the run installs, so the
machine's routing reflects the choices its operator actually made. A decision
that lives only in the session transcript has to be re-made — differently — on
the next run.

#### Scenario: A kept store appears in the routing policy

- **WHEN** the operator keeps a store alongside hindsight
- **THEN** the installed routing policy names it, states it is secondary to
  hindsight, and says when to reach for it

#### Scenario: A replaced store is recorded as replaced

- **WHEN** the operator replaces a store with hindsight
- **THEN** the routing policy records that the store was replaced rather than
  omitting it silently, so a later reader can tell a decision from an oversight

#### Scenario: A re-run does not re-litigate a recorded decision

- **WHEN** memory-setup runs again on a machine whose routing policy already
  records a decision for a store
- **THEN** the recorded answer is presented as the current state and is changed
  only if the operator says so
