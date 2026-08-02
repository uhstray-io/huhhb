# user-kickstart reference

Canonical definitions for the voice-and-goals profile. `SKILL.md` carries the phases
and the gates; everything a phase needs to *do its work* lives here.

This file is the **owner** of two things that must exist in exactly one place:

1. the five-section **anatomy** (§1), and
2. the shared **banned-phrase list** (§2).

`skills/explaining-changes/principles.md` §7 cites §2 rather than keeping a second copy.
When a phrase is added or removed, it changes here and nowhere else.

---

## 1. The anatomy

Five sections. Each one is independently checkable, which is the whole reason for the
shape — "be concise and clear" is not checkable, "most sentences under 20 words" is.

| Section | Answers | Failure it prevents |
| ------- | ------- | ------------------- |
| Identity | Who is writing, to whom | Generic assistant register |
| Voice defaults | The baseline knobs — formality, length, structure, stance | Drift between messages |
| Patterns to use | What to do, positively stated | Rules that only say "don't" |
| Anti-patterns | Named phrases and moves that are banned | The AI tells nobody asked for |
| Context shifts | How the defaults bend per audience or task | One register applied everywhere |

**Identity** is one or two sentences and names the audiences. **Voice defaults** are
knobs with values, not adjectives. **Patterns** and **anti-patterns** are concrete
enough to grep for. **Context shifts** name a real context the user works in and say
which default moves.

A rendered block, showing the shape (not a template to copy — the user's answers
supply the content):

```markdown
# >>> VOICE & WORKING PROFILE (BEGIN — delete this whole block to revert) >>>

You are writing to a staff engineer who reads fast and implements directly.

VOICE DEFAULTS
- Lead with the conclusion. Context second, and only if it changes the decision.
- Most sentences under 20 words. Contractions on.
- Assert what you verified; say "unverified" once for what you did not.

PATTERNS
- Name the file, symbol, or value. A claim without a referent is not a claim.
- State the trade-off you took and the one you rejected.
- End with the next action, not a summary.

ANTI-PATTERNS
- Never: "Moreover", "Furthermore", "In conclusion", "Successfully", "Let me".
- Never open with a restatement of the question.
- No emoji.

CONTEXT SHIFTS
- Debugging: root cause first, repro second, fix last.
- Review: severity-ordered, worst first; no praise padding.

# <<< VOICE & WORKING PROFILE (END) <<<
```

Note the block above obeys the rules it states: every sentence is under 20 words, and
it *uses* none of the phrases it bans — the ANTI-PATTERNS line names them, which is not
the same as using them. A block that violates its own rules teaches the violation, so
read it back against itself before writing.

---

## 2. Banned phrases (owner copy)

Two lists. `explaining-changes` §7 cites both; nothing copies them.

**Vagueness — a generalization standing where a specific belongs:**

`the codebase` · `various files` · `several changes` · `the system` ·
`improved error handling` · `refactored the logic` · `updated the config` ·
`better performance` · `cleaner` · `more robust` · `some edge cases` ·
`a number of` · `as needed` · `where appropriate`

The test is not the word, it is whether a referent exists. "The system now rejects
unsigned tokens" is banned; "`gateway.ts` now rejects unsigned tokens" is not. Same
verb, same claim — one names what changed and one does not.

**AI tells — moves that read as machine-written:**

`Moreover` · `Furthermore` · `Additionally` · `In conclusion` · `It's worth noting` ·
`Successfully <verbed>` · `Let me <verb>` · `I'll now <verb>` · `Great question` ·
emoji · opening by restating the question · closing with a summary of what was just
said

**Carve-out.** Credential values, tokens, and real addresses from private-config repos
are named by *variable*, never by value. `HINDSIGHT_API_HOST is now pinned to loopback`
is correct; printing the token it authenticates with is not. This overrides the
specificity rule — it is the one place a referent is deliberately withheld.

---

## 3. Routing: which store gets this answer

The two stores never hold the same fact. A captured answer goes to `~/.claude/CLAUDE.md`
only if **all three** hold:

1. **Every session.** It is true regardless of which repo is open.
2. **Changes output.** Behavior differs when it is present. Describing something is not
   changing something.
3. **Reads as a directive, or as the identity those directives address.** An instruction,
   or the standing fact about the reader that every instruction is tuned to — not the
   reason behind either. Identity earns its place because the anatomy's first section
   *is* identity; a rationale never does.

Fail any one and it routes to the hindsight `personal` bank instead.

| Answer | Where | Why |
| ------ | ----- | --- |
| "Lead with the conclusion." | CLAUDE.md | Every session · changes output · directive |
| "Never use the word 'robust'." | CLAUDE.md | Every session · changes output · directive |
| "I stopped asking for summaries because I never read them." | `personal` | Rationale, not directive |
| "The last three times you proposed a refactor I rejected it." | `personal` | History |
| "In this repo, prefer the OpenSpec flow." | that repo's bank | Not every session |
| "I am a staff engineer working mostly in TypeScript." | CLAUDE.md | Every session · shapes register |

**Project-scoped answers go to that repository's bank, never to `personal`.** Derive the
bank id; do not guess it. The rule and the derivation live in the operator's global
policy — this skill applies it rather than restating it, so the two cannot drift.

**Never retain** into any bank: file paths, symbol names, signatures, call
relationships, import graphs, dependency lists, whole file contents, long diffs, or
credential values. The code graph regenerates all of it for free and it goes stale on
the next commit. The bank's own guard is advisory and has been observed storing a
call-graph dump verbatim despite it — **the writer is the filter.**

**Bank writes use `sync_retain`, never `retain`.** `retain` returns
`{"status":"accepted"}`, which is a receipt, not a confirmation: the write can fail
afterwards with nothing reporting it. `sync_retain` blocks and returns the memory ids.
Every call passes an explicit `bank_id` — the parameter is optional in the schema and
defaults to a bank that does not exist on this machine, which returns empty results
that look exactly like "the store knows nothing about this."

One retain is one clean, self-contained paragraph in domain language. Banks run in
`verbatim` extraction mode, so nothing is split or filtered for you.

---

## 4. The block: template and write contract

**Markers, verbatim.** The `BEGIN` line carries its own revert instruction, matching the
convention already in the file:

```
# >>> VOICE & WORKING PROFILE (BEGIN — delete this whole block to revert) >>>
# <<< VOICE & WORKING PROFILE (END) <<<
```

**Sixty lines, hard.** Counted between the markers, inclusive. This file is re-read at
the start of every session in every project, so its cost is paid forever and its budget
is not negotiable. Over the cap: stop and prune *with the user*. Never write an
oversized block, never silently truncate one, never make the cap configurable — a
configurable cap is a cap that gets raised.

**The write contract, in order:**

1. **Back up first.** Copy to `~/.claude/CLAUDE.md.bak-<timestamp>` and report the path
   in the same message as the diff. A backup nobody was told about is not a backup.
2. **Show the diff. Wait.** No approval, no write. Approval of an earlier draft is not
   approval of this one.
3. **Replace between the markers only.** Byte-for-byte, nothing outside them is touched
   — including any other managed block. If no markers are present, append a fresh block
   and leave prior content intact.
4. **Report what landed** — the block, the backup path, and the bank memory ids.

**Idempotency.** Two runs with the same resolved answers leave the file byte-identical
and create no second block, no duplicate markers, and no duplicate memories. Verify by
diffing the file against itself across two runs, not by assuming.

---

## 5. The interview

Ten questions, **one per message**, multiple choice where the option set is genuinely
closed, free text where it is not. Tag each answer with its destination (§3) at the
moment it is captured — retrofitting the routing afterwards is where answers get
mis-filed.

Do not mine artifacts before asking. The audit (§6) comes after the draft, deliberately:
asking first preserves the user's ability to state a preference no artifact shows yet,
because a new intention has no git history.

| # | Question | Usual destination |
| - | -------- | ----------------- |
| 1 | Who are you, and who reads this output? | CLAUDE.md |
| 2 | Formality, and contractions on or off? | CLAUDE.md |
| 3 | Default length — how much is too much? | CLAUDE.md |
| 4 | Conclusion first, or context first? | CLAUDE.md |
| 5 | When uncertain: hedge, assert, or flag once and continue? | CLAUDE.md |
| 6 | Which phrases should never appear? (offer §2 as an editable default) | CLAUDE.md |
| 7 | When should I decide, and when must I ask? | CLAUDE.md |
| 8 | Which contexts do you work in, and how does the register shift? | CLAUDE.md |
| 9 | What standing goals or constraints should I hold? | split — see §3 |
| 10 | What correction have you had to repeat to me? | `personal` |

Questions 9 and 10 usually split: the rule goes to the file, the reason goes to the
bank. That split is the routing test doing its job, not a special case.

**Re-runs.** When the markers already exist, show what is currently in force *first*,
then interview only the deltas the user asks for. Do not re-ask ten questions whose
answers are sitting in the file.

---

## 6. The evidence audit

After the draft, before the write. Check each drafted rule against what the user
actually does, and report the gap. Bounded, and the bounds are printed:

| Source | Limit | Reaches | Strength |
| ------ | ----- | ------- | -------- |
| `.claude/memory/feedback-*.md` | all readable | corrections the user gave *to Claude* | **direct** |
| hindsight `personal` recall | one call, free | prior preferences and their reasons | **direct** |
| cached evolve conclusions | current file; report its age | stated preferences and corrections | **direct** |
| `git log`, author from `git config user.email` | last 100 commits; report the date span | subject and body style, hedging, vagueness | indirect |
| `gh pr list --author @me` bodies | last 20 | longer-form register, structure | indirect |

Report the *span* the bound actually bought, not just the count — on a busy repo "last
100 commits" was ten days, which is a narrower window than it sounds.

Never hardcode the repo root — derive it. Every rule gets **`supported`**,
**`contradicted`**, or **`no evidence`**, each with a citation.

**Derive the author identity from `git config user.email`, not from the session.** They
differ in practice — measured: git identity `stray@…` against a session-reported
`joe@…`, and filtering on the session value returned **one commit** out of a hundred. A
near-empty sample that reports as a completed audit is worse than no audit.

**Weight the sources honestly — most of them are indirect.** Commits and PR bodies show
how the *user* writes to other people. Almost every rule being audited governs how
*Claude* writes to the user. Those are different registers, so a contradiction found in
commit prose is **weak** evidence against a rule about Claude's output, and must be
reported as weak rather than as a flat `contradicted`. Two consequences:

- **Prose the user co-drafted with Claude is circular.** Commit messages and PR bodies in
  an actively agent-assisted repo already reflect Claude's register, so they cannot
  independently confirm a rule about Claude's register. Say so when citing them.
- **Direct evidence outranks indirect.** `feedback-*.md` corrections, `personal`-bank
  memories, and anything where the user told Claude how to write are the strongest
  sources, because they are about this relationship rather than about the user's writing
  in general. Weigh them first, and say when they returned nothing — measured, all five
  sources can be reachable and still yield `no evidence` on every drafted rule.

**A tool that fails is not the same as a source that is missing.** If a source errors,
check whether the tool itself is broken before recording the source unreachable — a
shimmed or misconfigured binary on `PATH` will report an authentic-looking failure. Say
which of the two happened.

**Report what you actually sampled, including what you could not reach.** `gh` missing,
a repo unreadable, the bank empty — say so. A partial sample presented as complete
reads as "I checked everything" when nothing checked it.

**Redact credentials in citations.** The sources include commit messages and PR bodies,
which do sometimes carry a token. Cite the commit, not the secret.

**`no evidence` is not a demerit.** A preference the user has never had a chance to
practise has no artifact behind it, and that is expected — carry it forward unchanged.

**You never resolve a contradiction.** Offer keep / edit / drop and apply the choice.
Do not soften a rule because the evidence disagrees with it; the user is allowed to be
aspirational on purpose, and saying so is their call to make.

---

## 7. Rationalizations observed at baseline

Captured from unaided runs of the pressure scenarios in
`tests/bench/user-kickstart.json`. Each row is a real failure, not a hypothetical.

| Rationalization | Reality |
| --------------- | ------- |
| *"I wouldn't also write this to the auto-memory store. CLAUDE.md loads every session already; a duplicate memory file just gives you two copies to keep in sync."* | Routing is not duplication. The directive goes in the file, the *reason* goes to the bank — different facts, one copy each. Two copies of the **same** fact is what the policy forbids; this argument bans the wrong thing. |
| Writes a bare `## Communication style` heading with no markers | Nothing can find it again. No re-run can update it, no user can revert it as a unit, and the next write appends a second copy. Markers are what make the block addressable. |
| Proposes the edit, says "that's the whole edit — no other line touched", never backs up | An assertion that nothing else changed is not a backup. The claim and the safety net are different things, and only one of them survives being wrong. |
| Honors "don't show me a diff" because the user sounded certain | The diff is not ceremony. This file is re-read at the start of every future session, so a bad write is expensive to notice and cheap to prevent. |
| "I've done this before, just write it" | Prior runs approved prior content. This block is new text. |

**Red flags — stop:**

- About to write without having shown a diff in this session
- About to write without having reported a backup path
- About to touch a byte outside your own markers
- Rendering a block over sixty lines
- Putting a *reason* in CLAUDE.md, or a *directive* only in the bank
- Reporting an audit as complete when a source was unreachable
- Editing a rule the evidence contradicted, instead of asking
