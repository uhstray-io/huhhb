## Purpose

Governs which memory stores this plugin ships to installers and which it routes
to, and holds the two sets identical — so that a store retired from routing
stops being installed rather than lingering as a tool surface nobody intends
anyone to use.

## ADDED Requirements

### Requirement: The plugin ships only stores it routes to

The plugin SHALL NOT register an MCP server, or publish a skill, for a memory
store that its routing policy no longer directs traffic to. Shipping a retired
backend hands every installer a tool surface the project has decided against,
and the discrepancy is invisible to them because the documentation says
otherwise.

#### Scenario: A retired store is absent from a fresh install

- **WHEN** the plugin is installed into a clean profile and a session starts
- **THEN** no MCP server for a retired memory store is registered

#### Scenario: Retiring a store from routing obliges removing it from the manifest

- **WHEN** a memory store is retired from the routing policy
- **THEN** its MCP registration and its skills are removed from the shipped
  manifest in the same release, rather than left in place with updated prose

### Requirement: Removing a store leaves no dangling invocation

The plugin SHALL contain no call to a tool provided by a removed MCP server. A
removed server with a surviving call is a runtime failure, which is strictly
worse than the retired server that was there before.

#### Scenario: Every named invocation is accounted for before removal

- **WHEN** an MCP server registration is removed
- **THEN** every remaining reference to its tools by name has been inspected and
  is either removed or confirmed to be descriptive text rather than a call

#### Scenario: A scratch-profile session completes without a failed tool call

- **WHEN** the plugin is installed from the change branch into a scratch profile
  and a session exercises the memory-related skills
- **THEN** no tool call fails due to an absent server

### Requirement: Trigger surface freed by a removal is claimed deliberately

When skills are removed, the request phrasings they matched SHALL be assigned
explicitly to a surviving skill or to none. Phrasings a user types when they mean
the current system — asking to remember something, to recall what is known about
a topic, to report memory health — MUST route to the store that now owns them.

#### Scenario: A freed phrasing routes to the surviving owner

- **WHEN** a user issues a request using a phrasing formerly matched by a removed
  skill
- **THEN** the surviving skill that owns that concern activates, and no removed
  skill's absence leaves the request unhandled

#### Scenario: Contaminated activation measurements are reported as such

- **WHEN** trigger precision or recall is measured while untracked auto-loading
  skills are present in the environment
- **THEN** the measurement is reported as provisional and MUST NOT be presented
  as a clean result

### Requirement: Removal from the marketplace does not touch user data

Removing a memory store from the plugin SHALL affect only what is distributed,
never what exists on a user's machine. A user's existing installation of the
retired store, and any data held in it, remain untouched and independently
reachable outside this plugin.

#### Scenario: Local data survives the removal

- **WHEN** a user who has data in the retired store updates to a release that
  removes it
- **THEN** their data and their standalone installation of that store are
  unchanged, and remain accessible through that store's own interface

### Requirement: Documentation and shipped code agree on what is live

Documentation SHALL NOT describe a memory store as retired while the code still
ships it, nor describe one as available once it has been removed. The gap between
the two is the defect; closing it in one direction only converts a visible
inconsistency into an invisible one.

#### Scenario: A search for the retired store finds only history

- **WHEN** the repository is searched for references to a removed memory store
- **THEN** the only matches are historical plans, superseded records, and
  changelog entries — no live documentation and no shipped code
