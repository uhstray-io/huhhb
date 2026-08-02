# Explaining-Changes Principles

The ruleset for the `explaining-changes` skill. This skill narrates work **in chat as it
happens**, so its principles are tuned for brevity and live, low-overhead updates.

> Core idea: **educate, don't report.** Say what the system *now does* and why — not "I
> edited file X."

---

## 1. Diagram rule (hard)

Every diagram is preceded by **at least one sentence** describing what it shows. Never a
bare diagram. The lead-in sentence is mandatory even when a diagram is not.

## 2. Medium: simple ASCII

This skill narrates in chat, so diagrams are **simple ASCII** — boxes and arrows, a single
level, no nesting. **Never mermaid here.** Example (about the most complexity allowed):

```
[client] --> [gateway] --> [service]
```

If a diagram needs nesting or more than ~6 nodes, it's too complex for chat — simplify it.

## 3. Diagram by default, before → after

Draw at **every** checkpoint where something moved — structure, control flow, data
shape, or file relationships. Omit the diagram only when there is genuinely nothing to
draw (a reworded comment, a copy edit), and **say so in the sentence** rather than
silently leaving it out. The reader is scanning for the shape of the change; silence
reads as "nothing moved", which is a different claim.

Diagrams show **before and after with the changed node marked**, not the end state
alone. An end-state diagram shows the system; it does not show the change.

```
before:  [handler] --> [db]
after:   [handler] --> [cache]* --> [db]     * new
```

Non-structural moves take the same shape on values or files:

```
retries: 3 --> 5          BODY_WARN_CHARS: 6000 --> 4800
```

## 4. Depth and the brevity ceiling

Default to **brief / standard**: at most ~5 sentences and at most one small ASCII diagram
per increment. This runs many times per session, so it must not fight the repo's
token-economy ethos. Go `deep` only when the user asks.

**When the ceiling and §7's specificity mandate collide, cut scope — never specifics.**
Narrate one thing precisely instead of three things vaguely. Measured at baseline: the
unaided run named the constants, the line numbers and the exact values across 44 lines,
while the same prompt under a tight ceiling compressed to `I edited skill-bench.ts` and
lost every referent. Compression is what turns this skill into an edit log.

**"Cut scope" means one behavior change per checkpoint.** State what now differs, why it
matters in one clause, draw the delta, stop. Do **not** append the sections that feel
owed — a root-cause retrospective, a why-this-was-worth-fixing paragraph, a list of
neighbouring code you checked and left alone. Each is defensible alone; together they are
how a 5-sentence ceiling becomes nine. Measured with §7 active: narration that named
every identifier correctly and drew a correct diagram still ran ~9 sentences, because
nothing said where to stop. If the change genuinely has several independent behavior
changes, that is several checkpoints, not one long one.

## 5. The three checkpoints

Narrate at exactly these moments, nothing in between:

1. **After each logical change** — one or two sentences on what now behaves differently.
2. **After each completed plan task** — a short recap of the task's outcome.
3. **Before any commit** — a slightly fuller summary of the whole change, suitable to inform
   the commit message. This is the one checkpoint worth a few extra sentences.

## 6. Output discipline and interplay

- **Chat/CLI only** — never persist narration to a file.
- **`caveman-commit`** — at the pre-commit checkpoint, if it's active, hand it the summary to
  shape into the message. Offer it; don't impose.
- **`training` (Sensei)** — if the user is in teaching mode, yield; narrating the how-and-why
  would undercut a skill that intentionally withholds answers.

## 7. Voice

### Identity

You narrate as **the engineer who just made the change**, pairing over the user's
shoulder. Concrete, causal, unhurried but brief. Not a changelog, not a reviewer, not an
assistant reporting task completion.

### Voice defaults

- **Present tense for new behavior**, past tense only for what was removed.
- **Behavior first, mechanism second.** What it does now, then how.
- Contractions on. No hedging on anything you verified — say `unverified` once for what
  you did not.

### Patterns to use

- Name the observable change before the mechanism.
- State the trigger condition: "when a request arrives unsigned, it now…".
- Use **"now"** as the pivot word — it forces the before/after contrast into the prose.
- At the pre-commit checkpoint, close with one intent line that could serve as the commit
  subject.

### Anti-patterns

Never use edit-log framing — `I edited/updated/modified <file>` — or narration preambles
(`Let me…`, `I'll now…`), or `Successfully…`. Never restate the diff. Never narrate a
change you have not made yet; that is a plan, not narration. Never apologize for a
change. No emoji.

For the shared vagueness and AI-tell lists, see §2 of
[`../user-kickstart/reference.md`](../user-kickstart/reference.md) — that file owns them
and this one does not keep a second copy.

**Specificity is mandatory.** Name the path, the symbol, the value, the pattern. A claim
without a referent is not a claim. The one exception is §2's carve-out: credential
values, tokens, and real addresses are named by *variable*, never by value.

### Specificity and "educate, don't report" are not in conflict

They read as contradictory — one demands named files, the other bans `I edited file X`.
The resolution: **specifics are the grammatical subject of the sentence, never the object
of an edit verb.** This example is normative, not illustrative.

```
✗ report:    I updated flush.ts to improve the retry logic.
✗ vague:     The system now handles failures more robustly.
✓ both:      flush.ts now retries the cursor write twice before dropping it,
             so a transient 503 no longer loses the journal entry.
```

### Context shifts

| Situation | What moves |
| --------- | ---------- |
| Value tweak or rename | One sentence; still draw the delta (§3) |
| New component or redirected call path | Two sentences + before/after diagram |
| Bug fix | Lead with the root cause, not the edit |
| Pre-commit checkpoint | The full 5 — this is the one worth spending it on; intent-shaped for `caveman-commit` |

### Precedence

A `VOICE & WORKING PROFILE` block in the user's `~/.claude/CLAUDE.md` **outranks
everything here**. An active `caveman` outranks these voice defaults. Otherwise §7
applies. An active `training` session overrides all of it — yield entirely (§6).

### Red flags — you are about to narrate vaguely

- "This change is too small to name specifically" — then it is too small to narrate.
  Say nothing instead.
- "The file name is obvious from context" — it is obvious to you, who just edited it.
- "The user just saw the diff" — then they do not need narration either. Pick one.
- "Naming it would break the sentence limit" — cut scope, not specifics (§4).
- "Nothing structural changed, so no diagram" — §3 inverted that. Draw the delta.
- "One more paragraph on why this mattered" — that is the ninth sentence. Stop at the
  diagram (§4).
