# plans/architecture

Architecture decision records, owned by the [`repo-memory`](../../skills/repo-memory/SKILL.md) skill.

| File | What it is |
|------|------------|
| [DECISIONS.md](DECISIONS.md) | Master index — every decision, grouped by domain, with a pointer to its record |
| [TEMPLATE.md](TEMPLATE.md) | The record template, the confidence levels, and the superseding procedure |
| `YYYY/INDEX.md` | That year's decision log — one row per ADR |
| `YYYY/YYYY-MM.md` | The records in full, one file per month |

`ADR-NNNN` is globally sequential across all years and never reused. Take the next
number from `DECISIONS.md`, not from the current month's file — a decision may have
landed in a different month.

**Records are append-only.** Never edit an accepted record; write a new one that
supersedes it and link the two. The only permitted edit to an accepted record is setting
its superseded pointer. Never delete a record, including a rejected one — a visible
rejected option is what stops the team re-litigating it next year.

`ARCHITECTURE.md` at the repo root summarizes current state; the decisions that produced
it live here. Current-state capability specs live in the store at
`plans/development/openspec/specs/` — **OpenSpec writes specifications, not decisions**
(ADR-0003).

## Promotion from an OpenSpec change

`promote-adr.ts` extracts a change's `design.md` `## Decisions` section into the decision
log on archive. The mechanism is `openspec-conformance`'s; the **records are
`repo-memory`'s**, and they land in the monthly file with rows added to both indexes. Do
not hand-number ADRs when promoting.
