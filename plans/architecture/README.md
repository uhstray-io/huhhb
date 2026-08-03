# plans/architecture

Architecture decision records, owned by the [`repo-memory`](../../skills/repo-memory/SKILL.md) skill.

| File | What it is |
|------|------------|
| [DECISIONS.md](DECISIONS.md) | Master index — every decision, grouped by domain, with a pointer to its record |
| [TEMPLATE.md](TEMPLATE.md) | The record template, the confidence levels, and the superseding procedure |
| `YYYY/INDEX.md` | That year's decision log — one row per ADR |
| `YYYY/YYYY-MM.md` | The records in full, one file per month |

**The rules live in [DECISIONS.md](DECISIONS.md) — that file is canonical.** Append-only
records, global sequential numbering, one decision per record, never delete. This README
does not restate them; a second copy is a second thing to keep in sync.

`ARCHITECTURE.md` at the repo root summarizes current state; the decisions that produced
it live here. Current-state capability specs live in the store at
`plans/development/openspec/specs/` — **OpenSpec writes specifications, not decisions**
(ADR-0003).

## Promotion from an OpenSpec change

`promote-adr.ts` extracts a change's `design.md` `## Decisions` section into a numbered
ADR on archive. The mechanism is `openspec-conformance`'s; the **records are
`repo-memory`'s**. Do not hand-number ADRs when promoting.

> **Pending migration.** `promote-adr.ts` still writes the old flat
> `plans/architecture/NNN-<slug>.md` shape and does not update `DECISIONS.md` or the year
> `INDEX.md`. Until it is retargeted, a promoted ADR must be folded into the monthly file
> and both indexes by hand, or it will not appear in either index. Tracked as the
> remaining task in this migration; ADR-0003 records the decision it has to implement.
