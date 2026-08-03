---
name: repo-memory
description: Use when a decision about this repository's architecture needs recording or looking up — "record this decision", "write an ADR", "why did we choose X", "what did we decide about Y", "is there a decision about Z", "supersede that decision" — or when a change lands that alters the system's structure, trades away a quality attribute, or is hard to reverse. Owns architecture decision records in plans/architecture/. Code structure belongs to codebase-memory-mcp; deliberation and outcomes belong to the Hindsight bank.
---

# repo-memory

Owns this repository's **architecture decision records** — their format, numbering,
indexes and lifecycle — at `plans/architecture/`. Committed to git, reviewable in the PR
that changes them, readable by anyone who clones with no service running.

**Scope: ratified decisions only.** Everything else has a better home:

| Fact | Goes to | Why |
| ---- | ------- | --- |
| What calls this · what breaks if I change it · where is this defined | **codebase-memory-mcp** | Regenerated from source for free; stale the moment you commit |
| Why we tried X first · what we feared · how it turned out | **Hindsight bank** | Deliberation and experience; nothing regenerates it |
| **What we decided, and what it cost** | **here** | Ratified, versioned with the code it governs |

A decision and its deliberation are different facts. The record says what was chosen and
what it cost; the reasoning that produced it goes to the bank. One copy each — two copies
of the same fact is what this memory architecture exists to prevent (ADR-0001).

Machine-level store health is `memory-setup`. Per-repo store init is `repo-kickstart`.

## Does this even need a record?

An ADR is for **architecturally significant** decisions. It qualifies if it:

- changes the system's structure, or
- trades away or buys a key quality attribute, or
- is **difficult to reverse**.

A reversible implementation choice is not an ADR. Neither is a preference, a convention,
or a bug fix. When it does not qualify but is still worth keeping, say where it goes
instead — usually the bank — rather than writing a record nobody will read.

## The layout

```
plans/architecture/
├── DECISIONS.md      master index — domains → decisions → location
├── TEMPLATE.md       the record template, confidence levels, superseding rules
└── YYYY/
    ├── INDEX.md      the year's decision log, one row per ADR
    └── YYYY-MM.md    the records in full, one file per month
```

Template and field definitions:
[`../../plans/architecture/TEMPLATE.md`](../../plans/architecture/TEMPLATE.md).
Rules and domains:
[`../../plans/architecture/DECISIONS.md`](../../plans/architecture/DECISIONS.md).

## In a repo that has not adopted this layout

**Do not assume a path — not `plans/architecture/`, not `docs/adr/`, not any of them.**
Discover where this repo already keeps decisions, and follow what you find:

```bash
git ls-files | grep -iE '(^|/)(adr|adrs|decisions?|architecture)(/|$)|(^|/)[0-9]{3,4}-[a-z0-9-]+\.md$'
```

Also check `README`, `CONTRIBUTING` and `AGENTS.md`/`CLAUDE.md` for a stated location, and
look for a `docs/` tree that is already the documentation home.

- **Found an existing convention** → use it, match its numbering and file shape, and say
  which convention you matched. Do not migrate the repo to this layout as a side effect
  of recording one decision.
- **Found nothing** → ask where decisions belong. Do not invent a directory. Offer this
  layout as the recommendation and let the human choose; `repo-kickstart` is what adopts
  it deliberately.

Creating a second decision location in a repo that already has one is the failure this
skill exists to prevent.

## Recording a decision

1. **Check it qualifies.** If not, route it and stop.
2. **Take the next number.** `ADR-NNNN` is globally sequential across all years and
   never reused. Read the highest in `DECISIONS.md` and add one — **not** the highest in
   the current month's file, since a decision may have landed in a different month.
3. **Write the record** appended at the bottom of the current `YYYY/YYYY-MM.md`, using
   the template verbatim. Create the month file or the year `INDEX.md` if this is the
   first record for either.
4. **Update all three in the same commit** — the record, the year index row, the master
   index line under its domain. Any one missing and the index lies.
5. **Show it and wait.** A record is a claim about what the team agreed; it is not yours
   to assert unilaterally.

## Three rules that outrank convenience

Operative summary, kept here because an agent must not have to open another file mid-write. **[`plans/architecture/DECISIONS.md`](../../plans/architecture/DECISIONS.md) is canonical** — if these ever disagree, that file wins and this one is the bug.

**1. Append-only — never edit an accepted record.** If the decision changed, write a new
record that supersedes it. Editing erases *when and why* the direction shifted, which is
the only thing a decision log is for. The single permitted edit to an accepted record is
setting `Status: Superseded by ADR-NNNN` and filling `Superseded by`. Nothing else moves.

**2. Never delete a record**, including a rejected one. A visible rejected option is what
stops the team re-litigating it next year.

**3. Never omit a negative consequence.** The costs are why anyone reads this in two
years. A record listing only benefits is marketing.

## Looking a decision up

Cheapest first: **by domain** in `DECISIONS.md`, **by date** in the year `INDEX.md`, **by
number** — `ADR-NNNN` is unique forever.

If the question is *why* rather than *what* — what else was considered, what failed first
— that is the Hindsight bank. Recall in domain language, never identifiers, and always
with an explicit `bank_id`.

## Hooks

Activate once per clone: `git config core.hooksPath .githooks`. Without it none of the
repo's hooks fire.

- **`.githooks/post-commit` → `hooks/repo-memory-adr-check.sh`** — inspects each commit
  for architecturally significant signals and prints a one-line reminder when it finds
  them and no ADR index changed in the same commit. It **only prints**: never writes,
  never blocks, never fails a commit. A nudge, not a gate — a commit touching
  architecture without an ADR is often correct, because the decision may already be
  recorded or may not qualify.
- **Per-commit capture** — the same `post-commit` hook appends outcome-framed lines to
  the branch journal `.claude/memory/wip/<branch-slug>.md`. Staging material only.
- **PR consolidation** — on `gh pr create`, the journal is consolidated into one outcome
  paragraph and `sync_retain`ed into the repo's Hindsight bank, then deleted in the same
  commit. Any *decision* surfaced while consolidating gets an ADR here; the narrative
  goes to the bank. `wip/` journals are staging and exempt from the rules above.

## Legacy `.claude/memory/`

Records predating ADR-0004 remain in `.claude/memory/`. **Do not delete or bulk-migrate
them.** They are triaged one at a time — decisions become ADRs here, experience goes to
the bank, structure is dropped because the graph regenerates it. `fix-memory` does that
triage; this skill does not.

## Red flags — STOP

- Editing an accepted record for any reason but setting its superseded pointer
- Deleting a record, including a rejected one
- A record with one option considered — that is a memo, not a decision
- A record with no negative consequences listed
- Taking the next number from the month file instead of `DECISIONS.md`
- Updating the record but not both indexes, or an index but not the record
- Writing the record without showing it and waiting
- Recording a reversible implementation choice as an ADR
- Putting deliberation, outcomes, or code structure here — bank, bank, graph
- Writing anything under `plans/` that is not a document
