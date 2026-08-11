# memory-routing Specification

## Purpose
Governs which memory stores this plugin *installs* versus which it merely
*offers*, and holds the installed set to the routed set — so that retiring a
store from routing stops imposing it on every installer, without destroying the
path back to data those installers may still hold.

> **[TARGET] — not yet true.** No requirement here is implemented.
> `.claude-plugin/.mcp.json` still registers the retired store for every
> installer, and the four legacy skills do not yet state the opt-in
> prerequisite. Tracked by the `retire-mempalace` change (0/22). Do not
> reason as if these guarantees hold.

## Requirements

### Requirement: The plugin installs nothing for a store it does not route to

The plugin SHALL NOT register an MCP server for a memory store its routing
policy no longer directs traffic to. Registration is imposition: it reaches every
installer regardless of whether they hold data in that store or want its tools.
A store retired from routing SHALL become opt-in — reachable by a configuration
the user adds deliberately, not one the plugin ships on their behalf.

#### Scenario: A retired store's server is absent from a fresh install

- **WHEN** the plugin is installed into a clean profile and a session starts
- **THEN** no MCP server for a retired memory store is registered

#### Scenario: Retiring from routing obliges un-registering, not deleting

- **WHEN** a memory store is retired from the routing policy
- **THEN** its MCP registration is removed from the shipped manifest, and its
  skills are **not** required to be removed with it

### Requirement: A skill may outlive the store's registration, as a stated legacy path

A skill for a retired store MAY continue to ship as a read path to existing data.
Where it does, it SHALL declare its legacy status, name the current system for
the same concern, and state the prerequisite its tools depend on. Deleting the
skill would strand data that is not regenerable; shipping it silently
prerequisite-less would strand the user mid-task instead.

#### Scenario: A legacy skill names what it needs

- **WHEN** a legacy skill's tools come from a server the plugin no longer
  registers
- **THEN** the skill states that the server is opt-in and names the configuration
  required to reach it, rather than assuming it is present

#### Scenario: Invoking a legacy skill without its server fails legibly

- **WHEN** a user invokes a legacy skill on a machine where the opt-in server is
  not configured
- **THEN** the failure names the missing prerequisite and how to add it, rather
  than surfacing as an unexplained missing tool

### Requirement: A retired store's skills do not compete for current phrasings

A retired store's skills SHALL NOT match the request phrasings that belong to the
current system. Their descriptions carry the retirement plainly and route the
reader to the system that now owns the concern. Coexistence is only safe while
this holds: two skill families answering to "remember this" is the
duplicate-source-of-truth failure the retirement exists to end.

#### Scenario: A current-system phrasing routes to the current system

- **WHEN** a user asks to remember something, to recall what is known about a
  topic, or to check memory health
- **THEN** the skill that owns that concern in the current system activates, and
  no retired skill claims it

#### Scenario: A retired skill is reachable by name

- **WHEN** a user names a retired store or its skill explicitly
- **THEN** that skill activates, because retirement removes it from routing, not
  from reach

### Requirement: Retirement never touches user data

Retiring a store SHALL affect only what the plugin distributes and registers,
never what exists on a user's machine. Their installation of that store, and any
data held in it, remain untouched and independently reachable.

#### Scenario: Local data survives the retirement

- **WHEN** a user holding data in the retired store updates to a release that
  un-registers it
- **THEN** their data and their standalone installation are unchanged, and remain
  reachable through the opt-in configuration or the store's own interface

### Requirement: Documentation and shipped code agree on what is live

Documentation SHALL NOT describe a store as retired while the plugin still
registers it, nor describe a registration as present once it has been removed.
The gap between the two is the defect; closing it in one direction only converts
a visible inconsistency into an invisible one.

#### Scenario: The manifest and the docs tell the same story

- **WHEN** the repository is read for what memory systems it installs
- **THEN** the shipped manifest, the routing policy, and the skill descriptions
  agree on which stores are registered, which are opt-in, and which are current
