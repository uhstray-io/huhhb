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
it live here. Each decision is written as one record with the `repo-memory` skill and
added to both indexes. Development plans are dated Markdown files in
`plans/development/`, and work is tracked in Plane (ADR-0007).
