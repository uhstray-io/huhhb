# Architecture decisions — 2026

The year's decision log. One row per ADR, newest last. Detail lives in the monthly
file; this table exists so you can scan a year without opening any of them.

Master index and the rules: [../DECISIONS.md](../DECISIONS.md).
Template: [../TEMPLATE.md](../TEMPLATE.md).

| ADR | Date | Decision | Domain | Status | Confidence | Record |
|-----|------|----------|--------|--------|------------|--------|
| ADR-0001 | 2026-08-02 | Adopt the two-store memory architecture as the default | Memory architecture | Accepted | High | [2026-08.md](2026-08.md) |
| ADR-0002 | 2026-08-02 | Fold memory health into memory-setup and retire memory-onboarding | Skills and marketplace | Accepted | High | [2026-08.md](2026-08.md) |
| ADR-0003 | 2026-08-02 | ADRs live in plans/architecture/; OpenSpec writes specifications only | Planning and specs | Accepted | High | [2026-08.md](2026-08.md) |
| ADR-0004 | 2026-08-02 | repo-memory owns ADRs; all other memory defers to the two stores | Memory architecture | Accepted | Medium | [2026-08.md](2026-08.md) |
| ADR-0005 | 2026-08-02 | Prove a skill refinement pairwise against a champion, not on absolute judge scores | Tooling and CI | Proposed | Medium | [2026-08.md](2026-08.md) |

## Months

| Month | Decisions | File |
|-------|-----------|------|
| 2026-08 | 5 | [2026-08.md](2026-08.md) |

## Adding a row

When an ADR is accepted, three files change together:

1. the monthly file gains the record in full,
2. this table gains a row,
3. [`../DECISIONS.md`](../DECISIONS.md) gains a line under its domain.

All three, or the index lies. `/repo-memory` does this for you.
