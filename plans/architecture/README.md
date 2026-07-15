# plans/architecture

Durable, numbered ADRs (`NNN-<slug>.md`), promoted from a change's design on
archive. `ARCHITECTURE.md` at the repo root summarizes; the decision records
live here. (Current-state capability specs live in the store at
`plans/development/openspec/specs/`, not here.)

Promotion is mechanical — `openspec-conformance`'s `promote-adr.ts` extracts a
change's `design.md` `## Decisions` into the next-numbered ADR on archive. Do
not hand-number ADRs.
