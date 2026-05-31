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

## 3. Diagram only when structure or flow changed

Most edits get prose alone. Include an ASCII diagram **only when the structure or control
flow actually changed** (a new component, a redirected call path) — not for value tweaks,
renames, or copy edits.

## 4. Depth and the brevity ceiling

Default to **brief / standard**: at most ~4 sentences and at most one small ASCII diagram
per increment. This runs many times per session, so it must not fight the repo's
token-economy ethos. Go `deep` only when the user asks.

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
