---
name: user-kickstart
description: Use when the user wants to establish, change, or revert how Claude writes and behaves toward them personally across every project — their own voice, tone, register, standing preferences and working constraints at the user level rather than in any one repo. Triggers on "set up how you talk to me", "establish my voice preferences", "configure my global CLAUDE.md", "how should you communicate with me", "I want you to always write like this", "stop writing like that", "change my personal preferences", and on symptoms: the same correction repeated across unrelated projects, output that reads generic or AI-written, a user-level CLAUDE.md that has grown unreadable or contradicts itself. User scope — repo CLAUDE.md quality is claude-md-improver; session learnings are /revise-claude-md; settings.json is update-config.
---

# user-kickstart

Establish the user's **voice-and-goals profile** at user scope: a delimited, revertible,
size-capped block in `~/.claude/CLAUDE.md`, plus the reasoning behind it in the hindsight
`personal` bank. One bootstraps a repo (`repo-kickstart`); this one bootstraps the person.

**Scope.** This skill owns **user scope** — `~/.claude/CLAUDE.md` and the `personal`
bank. It writes nowhere else. Hand off rather than absorbing:

| Ask | Owner |
| --- | ----- |
| Repo or project CLAUDE.md quality, coverage, audit | `claude-md-management:claude-md-improver` |
| Fold this session's learnings into a repo file | `/revise-claude-md` |
| settings.json, hooks, permissions, env vars | `update-config` |
| Installing or repairing the memory stores | `two-store-memory-setup` |

If the request is about a *repository's* instructions, say so and route. Do not start
an interview.

## Three rules that outrank convenience

**1. Two stores, never the same fact.** A directive that must hold every session goes in
the file. The *reason* for it, the alternatives rejected, and what went wrong before go
to the `personal` bank. Splitting them is not duplication — duplication is the same fact
in both places, and that is the thing the policy forbids. Full test in
[reference.md](reference.md) §3.

**2. Never write unseen.** Back up, show the diff, wait for approval. "I'm in a hurry",
"I trust you", "don't bother showing me" are the conditions under which a bad write does
the most damage, because this file is re-read at the start of every future session and
nobody re-reads it on purpose. Prior approval covers prior content, never new text.

**3. Stay inside your markers.** Replace only the bytes between this skill's own
`BEGIN`/`END` lines. Everything else in that file belongs to someone else — including
any other managed block — and is out of contract.

## Phases and gates

| # | Phase | Gate |
| - | ----- | ---- |
| 0 | Read `~/.claude/CLAUDE.md`, detect existing markers, recall from `personal` | Markers already there? Show what is in force **before** asking anything |
| 1 | Interview — ten questions, one per message, destination tagged at capture | Never mine artifacts first; a new intention has no git history |
| 2 | Draft the block and the retain paragraphs | **STOP** — over 60 lines, prune with the user; never write oversized |
| 3 | Evidence audit of the draft against real artifacts | Report what you sampled **and what you could not reach** |
| 4 | Resolve contradictions | **STOP** — user picks keep / edit / drop. You never resolve one |
| 5 | Back up → show diff → write → `sync_retain` → report | **STOP** — no approval, no write |

Questions, sources, routing test, block template and the write contract are all in
[reference.md](reference.md). Phase order is load-bearing: the audit follows the
interview so a preference the user has never practised can still be stated.

## What decides whether this is worth having

| Do this | Instead of | Cost of getting it wrong |
| ------- | ---------- | ------------------------ |
| Directives in the file, reasons in the bank | Everything in the file | Always-loaded context grows without bound; the file stops being read |
| Hard 60-line cap | "Keep it short" | A soft target is ignored; this one blocks the write |
| Own `BEGIN`/`END` markers | A bare `## Communication style` heading | Nothing can find it again — no update, no revert, and the next run appends a second copy |
| Back up and report the path | Asserting nothing else changed | An assertion is not a safety net; only one of them survives being wrong |
| Report the audit's gaps | A clean-looking summary | A partial sample presented as complete reads as "I checked everything" |

## Red flags — STOP

- About to write without having shown a diff **in this session**
- About to write without having reported a backup path
- About to touch a byte outside your own markers
- Rendering a block over sixty lines, or planning to "trim it later"
- Putting a *reason* in the file, or a *directive* only in the bank
- Calling `retain` instead of `sync_retain`, or omitting `bank_id`
- Reporting the audit as complete when a source was unreachable
- Editing a rule the evidence contradicted, instead of asking
- Interviewing when the request was about a repository's instructions

## Rationalizations, observed

Captured from unaided runs of `tests/bench/user-kickstart.json`. Full table with counters
in [reference.md](reference.md) §7.

| Excuse | Reality |
| ------ | ------- |
| "A duplicate memory file just gives you two copies to keep in sync" | Directive and rationale are different facts. One copy each is the design |
| "That's the whole edit — no other line touched" | A claim about the write is not a backup of it |
| "I've done this before, just write it" | Prior runs approved prior content. This text is new |
| "They said not to show a diff" | The diff is not ceremony; it is the only cheap moment to catch a bad rule |
