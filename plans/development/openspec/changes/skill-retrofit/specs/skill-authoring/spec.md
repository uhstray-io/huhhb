## ADDED Requirements

### Requirement: Machine-checkable rules become blocking once the debt is cleared

The S9–S12 checks SHALL be advisory only while grandfathered violations remain,
and SHALL become blocking once none remain. A check that is permanently advisory
is documentation wearing a gate's clothing; a check made blocking while debt
remains blocks every merge regardless of the change under review. The transition
is what makes the standard enforceable, so it MUST be an explicit step rather
than an aspiration.

#### Scenario: A new violation blocks once the baseline is empty

- **WHEN** the lint baseline holds no grandfathered entries and a change
  introduces a skill violating S9–S12
- **THEN** the gate fails and the change does not merge

#### Scenario: The gate stays advisory while debt remains

- **WHEN** grandfathered violations still exist
- **THEN** S9–S12 report as WARN and do not block a merge, so the burndown is
  never a precondition for unrelated work

### Requirement: The burndown tracks progress in one place

Retrofit progress SHALL be represented by the shrinking lint baseline, not by a
separate status document. Two trackers disagree eventually, and the one that is
merely written is the one that goes stale — this repo has already had a plan
report 0 of 48 tasks complete while the work was fully shipped.

#### Scenario: The ordering and the progress are separate artifacts

- **WHEN** the retrofit order is generated and checked in
- **THEN** it records ordering and its edge evidence only, and carries no
  per-skill completion state

#### Scenario: Debt never grows during the burndown

- **WHEN** a retrofit batch merges
- **THEN** the count of grandfathered entries and S9–S12 findings is no higher
  than before that batch

### Requirement: A skill is retrofitted only after the skills it depends on

Skills SHALL be retrofitted in dependency order, so a skill is revised only after
the skills its body names, links to, or invokes already conform. Revising a
dependent first means revising it twice — once against the old target and again
when its dependency moves.

#### Scenario: A dependency cycle is retrofitted as one unit

- **WHEN** two or more skills reference each other
- **THEN** they form a single batch and are revised together, rather than being
  ordered arbitrarily against one another

#### Scenario: Independent skills may proceed in parallel

- **WHEN** two skills share a rank and neither references the other
- **THEN** their batches may proceed concurrently

### Requirement: A retrofit that cannot prove itself is reverted, not merged

A retrofitted skill SHALL merge only if battle finds it not worse than the
version it replaces. After at most two revise-and-rebattle attempts it is
reverted and moved to the tail of the order. The standard exists to raise skill
quality; merging a regression to finish a burndown inverts that.

#### Scenario: A regression is reverted after two attempts

- **WHEN** a retrofitted skill loses more battle comparisons than it wins, twice
- **THEN** the retrofit is reverted, the skill returns to its pre-retrofit
  version, and it moves to the end of the order

#### Scenario: An unbattleable entry is excluded rather than forced

- **WHEN** a marketplace entry has no `skills/<name>/SKILL.md` and therefore no
  content hash to battle against
- **THEN** it is excluded from the retrofit with its exclusion recorded, and is
  held to the lint rules alone
