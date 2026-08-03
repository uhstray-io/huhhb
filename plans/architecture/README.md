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
ADR on archive, appending it to the monthly file and adding its row to both indexes. The
mechanism is `openspec-conformance`'s; the **records are `repo-memory`'s**. Do not
hand-number ADRs when promoting, and do not fold a promoted ADR in by hand — the promoter
already did.
