# Architecture Decisions — master index

Every architecture decision record (ADR) for this repository. **This file is the entry
point**: it groups decisions by domain and points at where each one is written in full.

## How this is organised

```
plans/architecture/
├── DECISIONS.md          ← you are here: domains → decisions → location
├── TEMPLATE.md           the record template; copy it, do not improvise
├── YYYY/
│   ├── INDEX.md          that year's decision log — one table row per ADR
│   └── YYYY-MM.md        the records themselves, in full, one file per month
```

Find a decision three ways: **by domain** (the tables below), **by date** (the year
`INDEX.md`), or **by number** (`ADR-NNNN` is globally sequential and never reused).

## The rules that make this worth keeping

1. **One decision per record.** If a proposal contains two decisions, it is two records.
   Multi-phase work — short-term, then long-term — is one record per phase.
2. **Records are append-only. Never edit an accepted record.** If the decision changes,
   write a new record that supersedes it and link the two. This preserves *when and why*
   the direction shifted, which is the whole point.
3. **Never delete a record**, including a rejected one. A rejected option that stays
   visible stops the team re-litigating it next year.
4. **Only architecturally significant decisions.** It qualifies if it affects the
   system's structure, a key quality attribute, or is **difficult to reverse**. A
   reversible implementation choice is not an ADR.
5. **A record is not a design guide.** State the decision so it stands alone; link
   supplemental exploration rather than inlining it. The deliberation belongs in the
   experience store, not here.
6. **Never hide a consequence.** The negative ones are the reason anyone reads this later.
7. **Record confidence.** A significant decision made with low confidence is worth
   flagging so a future reader knows it was a judgement call under uncertainty, not a
   settled matter.

## Status values

| Status | Meaning |
|---|---|
| `Proposed` | Written, not yet agreed |
| `Accepted` | Agreed and in force |
| `Superseded by ADR-NNNN` | Replaced; the record stays, the pointer is added |
| `Deprecated` | No longer applies, nothing replaced it |
| `Rejected` | Considered and declined — kept deliberately |

## Decisions by domain

<!-- Add a row when an ADR is accepted. Keep one line per decision; detail lives in the
     monthly file. Domains are added as needed — do not force a decision into a domain
     that does not fit. -->

### Memory architecture

| ADR | Decision | Status | Record |
|-----|----------|--------|--------|
| [ADR-0001](2026/2026-08.md#adr-0001--adopt-the-two-store-memory-architecture-as-the-default) | Two stores split on whether a fact is regenerable from source | Accepted | 2026-08 |
| [ADR-0004](2026/2026-08.md#adr-0004--repo-memory-owns-adrs-all-other-memory-defers-to-the-two-stores) | repo-memory owns ADRs; everything else defers to the two stores | Accepted | 2026-08 |

### Skills and marketplace

| ADR | Decision | Status | Record |
|-----|----------|--------|--------|
| [ADR-0002](2026/2026-08.md#adr-0002--fold-memory-health-into-memory-setup-and-retire-memory-onboarding) | Memory health folded into memory-setup; memory-onboarding retired | Accepted | 2026-08 |

### Planning and specs

| ADR | Decision | Status | Record |
|-----|----------|--------|--------|
| [ADR-0003](2026/2026-08.md#adr-0003--architecture-decision-records-live-in-plansarchitecture-openspec-writes-specifications-only) | ADRs live in plans/architecture/; OpenSpec writes specs only | Accepted | 2026-08 |
| [ADR-0006](2026/2026-08.md#adr-0006--product-inception-layer) | product-inception-layer | Accepted | 2026-08 |

### Tooling and CI

| ADR | Decision | Status | Record |
|-----|----------|--------|--------|
| [ADR-0005](2026/2026-08.md#adr-0005--prove-a-skill-refinement-pairwise-against-a-champion-not-on-absolute-judge-scores) | Skill refinements prove superiority pairwise against a champion; objective gates first, judge second, humans last | Proposed | 2026-08 |

## Years

| Year | Decisions | Index |
|------|-----------|-------|
| 2026 | 5 | [2026/INDEX.md](2026/INDEX.md) |
