# explaining-changes-voice

## ADDED Requirements

### Requirement: Narration carries a five-section voice anatomy

`skills/explaining-changes/principles.md` SHALL carry a `## 7. Voice` section with five
named subsections — identity, voice defaults, patterns to use, anti-patterns, and
context shifts — tuned to live narration rather than general prose. The identity
subsection SHALL frame the narrator as the engineer who just made the change, pairing
over the user's shoulder. The voice-defaults subsection SHALL require present tense for
new behavior, past tense only for what was removed, the behavior change before the
mechanism, and no hedging on anything already verified. `skills/explaining-changes/SKILL.md`
SHALL summarize §7 in its "Core ruleset (summary)" list and MUST NOT restate the full
section.

#### Scenario: Narration leads with behavior, not mechanism
- **WHEN** a logical change alters what a function does and the skill narrates it
- **THEN** the first sentence states what the system now does, in present tense, and the
  mechanism follows in a later sentence

#### Scenario: SKILL.md does not duplicate principles.md
- **WHEN** §7 is added to `principles.md`
- **THEN** `SKILL.md` gains a summary line pointing at §7 and no copy of its subsections

### Requirement: Diagrams are default-on and show before to after

`principles.md` §3 SHALL require a diagram at every checkpoint where structure, control
flow, data shape, or file relationships moved. A diagram SHALL be omitted only when
there is nothing to draw — a copy edit, a comment, a constant with no downstream shape
change — and in that case the narration SHALL say so in prose rather than silently
omitting it. Diagrams SHALL render the before state and the after state with the changed
node marked, not the end state alone. The existing ASCII-only, single-level, ≤6-node,
and prose-introduced constraints SHALL remain in force.

#### Scenario: A redirected call path is drawn
- **WHEN** a change inserts a cache between a handler and a database
- **THEN** the narration includes a before/after ASCII diagram with the new node marked,
  preceded by at least one sentence saying what it shows

#### Scenario: A comment-only edit states the skip
- **WHEN** the only change is a reworded comment
- **THEN** no diagram is drawn and the narration says there is nothing structural to show

#### Scenario: A value change still gets a delta diagram
- **WHEN** a retry count changes from 3 to 5 and downstream behavior shifts
- **THEN** the narration includes a minimal before/after delta rather than omitting the
  diagram

### Requirement: Narration names specifics and bans generalizations

`principles.md` §7 SHALL require named file paths, symbols, values, and pattern names in
place of generalizations, and SHALL carry an explicit banned list including *the
codebase*, *various files*, *several changes*, *the system*, *improved error handling*,
*refactored the logic*, *updated the config*, *better performance*, *cleaner*, *more
robust*, and *some edge cases*. The anti-patterns subsection SHALL additionally ban
edit-log framing (`I edited/updated/modified <file>`), narration preambles (`Let me…`,
`I'll now…`), `Successfully…`, the connectives `Moreover`, `Furthermore`,
`Additionally`, and `In conclusion`, restating the diff, narrating a change not yet
made, emoji, and apologizing for a change. §7 SHALL carry one carve-out: credential
values, tokens, and real addresses are named by variable, never by value.

#### Scenario: Vague summary is rejected in favor of a named specific
- **WHEN** a change hardens a retry path
- **THEN** the narration names the file and the actual delta rather than saying error
  handling was improved

#### Scenario: A secret is named by variable
- **WHEN** a change sets an API token in a private-config repo
- **THEN** the narration names the variable and never prints its value

### Requirement: Specificity and educate-don't-report are reconciled by example

Because "name the file" and "never say `I edited file X`" read as contradictory, §7
SHALL resolve them with a normative paired example showing a rejected report form, a
rejected vague form, and an accepted form in which the specific is the grammatical
subject and never the object of an edit verb. That example SHALL be normative, not
illustrative.

#### Scenario: The paired example is present and normative
- **WHEN** a reader consults §7 for how to name a file without reporting an edit
- **THEN** the section shows ✗ report, ✗ vague, and ✓ accepted forms of the same change
  and states that the accepted form is the rule

### Requirement: The brevity ceiling moves once, to five sentences

`principles.md` §4 and `SKILL.md` SHALL state a default ceiling of at most five
sentences and at most one diagram per increment, replacing the prior four-sentence
ceiling, and SHALL state that the increase pays for the specificity mandate and the
per-checkpoint diagram. Diagrams SHALL remain capped at six nodes so a diagram stays
cheaper than the prose it displaces. Both files SHALL carry the same number.

#### Scenario: The ceiling is consistent across both files
- **WHEN** `SKILL.md` and `principles.md` are read together
- **THEN** both state five sentences and neither retains the prior four

### Requirement: The retrieval cost of specificity is accepted, not tuned away

Naming a referent the model does not already hold requires retrieving it, and retrieval
costs input tokens that a vague summary does not. Where a bench scenario withholds the
identifiers deliberately, the resulting `B4 vs baseline` overrun SHALL be documented in
the scenario and accepted. The global `RATIO_TOKENS` gate in `scripts/skill-bench.ts`
MUST NOT be relaxed to accommodate it, and the scenario MUST NOT be weakened to pass —
a scenario that supplies the identifiers no longer tests whether the skill goes and
finds them.

**Re-measured, and the original figure did not hold.** 2026-08-02 with a cached
baseline: 8732 vs 5588 = 1.56x, over the gate. 2026-08-03 with `--rebaseline`: 6480 vs
9246 = **0.70x, cheaper than baseline**, judge 5/5. The first ratio compared against a
baseline recorded under a different prompt and assert, so it was never like-for-like.

The requirement stands but its evidence is now the method, not the number: a token ratio
measured against a cached baseline is not evidence, and a documented "expected failure"
must be re-measured with a fresh baseline before it is trusted. A B4 overrun currently
appears on the sibling `value-change` scenario (1.55x) and is **not** yet explained —
it is an open question, not an accepted cost.

#### Scenario: The overrun is recorded rather than silently carried
- **WHEN** a scenario's specificity requirement forces a file read the baseline avoids
- **THEN** the fixture carries a note stating the measured ratio, the cause, and the
  instruction not to relax the gate or weaken the scenario

#### Scenario: The gate is not edited to suit this change
- **WHEN** `B4 vs baseline` fails on such a scenario
- **THEN** `RATIO_TOKENS` is unchanged and the failure stands as documented

### Requirement: The specificity mandate is loophole-closed with red flags

Because the specificity mandate is a discipline rule under a brevity ceiling, §7 SHALL
carry a red-flags list of the self-justifications that precede a vague narration —
including "this change is too small to name", "the file name is obvious from context",
"the user just saw the diff", and "naming it would break the sentence limit" — each with
its counter. The entries SHALL come from the recorded baseline transcripts and MUST NOT
be invented. §7 SHALL state that a change too small to name specifically is a change too
small to narrate at all.

#### Scenario: A trivially small change is still named or not narrated
- **WHEN** a one-line change tempts a vague summary to stay inside the ceiling
- **THEN** the narration either names the file and the delta, or says nothing

### Requirement: Voice precedence is an explicit ordered chain

§7 SHALL state the override order: a `VOICE & WORKING PROFILE` block in the user's
`~/.claude/CLAUDE.md` outranks everything in §7; an active `caveman` outranks the §7
voice defaults; §7 applies otherwise. An active `training` session SHALL cause the skill
to yield entirely, as it does today. §7 SHALL cite `skills/user-kickstart/reference.md`
as the canonical owner of the shared banned-phrase list and MUST NOT maintain a second
copy of that list. That citation SHALL be a plain relative path and MUST NOT use an
`@`-prefixed link, which would force-load the target file on every skill load.

#### Scenario: A user voice block wins on conflict
- **WHEN** the user's CLAUDE.md voice block permits a phrase that §7 bans
- **THEN** the user's block governs and the narration follows it

#### Scenario: The skill degrades rather than breaks without the owner file
- **WHEN** `user-kickstart` is not installed
- **THEN** narration still applies §7's inline defaults and only the shared-list citation
  is unresolved
