---
name: fix-memory
description: Use when a memory artifact is in the wrong place and needs moving to the store that owns it — a record found by a conformance check, a lint failure, a legacy `.claude/memory/` file, a decision buried in a chat log or commit body, notes under `plans/`, or anything surfaced by "this memory is in the wrong store", "migrate this record", "fix our memory layout", "triage these old memories". Migrates one artifact at a time, ask-first, never bulk. Installing or verifying the stores is memory-setup; authoring a new decision is repo-memory.
---

# fix-memory

Move a misplaced memory artifact to the store that owns it — **one at a time, ask
first, never in bulk.**

This skill decides *where a fact belongs* and moves it there. It does not install
stores (`memory-setup`), author new decisions (`repo-memory`), or bootstrap a repo
(`repo-kickstart`).

## The routing test

Ask what kind of fact it is. There are only four answers, and each has exactly one home.

| The fact is… | It belongs in | Because |
| ------------ | ------------- | ------- |
| **Regenerable from source** — what calls this, where defined, blast radius, routes, dead code | the **code graph** — and is simply **deleted** here | The graph rebuilds it for free and it goes stale on the next commit. Migrating it is the failure mode, not the fix |
| **A ratified decision** — what was chosen, what it cost, what was rejected | an **ADR** via `repo-memory` | Versioned with the code it governs, reviewable in a PR |
| **Deliberation, outcome, or preference scoped to this repo** — why we tried X, what failed, what we learned here | this repo's **Hindsight bank** | Nothing regenerates it; it is the only copy |
| **A preference that holds across every project** — how the user works, standing constraints | the **`personal` bank**, or `~/.claude/CLAUDE.md` via `user-kickstart` if it is a directive | Cross-project, so a repo-scoped store would strand it |

**Decision vs deliberation is the call people get wrong.** A record often contains both.
Split it: the decision and its cost become the ADR; the reasoning, the alternatives and
the story go to the bank. One copy each — never both in both places.

**Cross-project vs repo-scoped is the second.** "Joe prefers Conventional Commits" is
personal. "This repo uses Conventional Commits" is a convention that belongs in
`AGENTS.md`, not in any memory store.

## Not everything is a migration

Three honest outcomes besides "move it":

- **Delete it** — it is regenerable structure, or it duplicates something already in
  `AGENTS.md`, a README, or a spec. Say which, and say where the surviving copy is.
- **Leave it** — it is already in the right place, or it is a historical record whose
  value *is* being where it is. A superseded record that documents what the repo used to
  believe is not misplaced.
- **Split it** — one artifact, two destinations. This is the common case for anything
  with both a decision and its reasoning in it.

## Procedure — one artifact at a time

1. **Read it whole.** Never route on a filename or a `type:` field; both lie. A file
   called `project-*` is frequently a preference, and a `feedback-*` is frequently a
   ratified decision.
2. **Classify** against the table above, and say which row and why in one line.
3. **Propose** — source, destination, the exact content that would be written, and what
   happens to the original. **Then stop.**
4. **On approval, write the destination first, verify it landed, then handle the
   original.** A delete that precedes a verified write loses the record.
5. **Report** what moved, what was left, and what could not be verified.

## Handling the original

Default is **supersede, not delete**. Mark the original as migrated with a pointer to
where the content now lives, and leave the file. Delete only when the content was
regenerable structure or a verified duplicate — and say which.

Never bulk-migrate a directory. Twelve records are twelve decisions; a sweep that moves
them all in one pass will get several wrong and make none of them reviewable.

## Verification before you claim it moved

- Wrote to a bank? `recall` it back with an **explicit `bank_id`**, in domain language.
  A retain that returned `accepted` is a receipt, not a confirmation — use `sync_retain`.
- Wrote an ADR? Confirm the record, the year `INDEX.md` row, and the `DECISIONS.md` line
  all exist. Any one missing and the index lies.
- Could not verify? Say **unverified** and leave the original untouched.

## Red flags — STOP

- Migrating more than one artifact without a fresh approval for each
- Deleting an original before the destination write is verified
- Routing on a filename or `type:` field instead of reading the content
- Copying a fact into two stores because it "fits both" — split it or pick one
- Retaining code structure into a bank because it looked like useful context
- Writing a bank memory with an implicit `bank_id` — it silently targets a bank that
  does not exist and returns empty on recall
- Turning a repo convention into a memory record when it belongs in `AGENTS.md`
- Bulk-sweeping `.claude/memory/` because the records "are all the same kind"
- Reporting a migration complete when the recall came back empty
