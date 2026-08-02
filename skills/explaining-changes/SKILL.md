---
name: explaining-changes
description: >
  Use during implementation to narrate changes as they happen — activates for the session
  and explains each logical change, each completed plan task, and every change being
  committed, using brief prose plus simple ASCII diagrams. Triggers on "explain as you go",
  "narrate changes", "walk me through the changes", "explain what you're doing", and similar.
  Output is chat/CLI only — nothing is written to files.
---

# Explaining Changes

## Overview

Narrate implementation work *as it happens* so the user follows the reasoning without
reading the diff. Once triggered, treat narration as **standing session behavior** until
the user turns it off ("stop explaining").

**Announce at start:** "Explaining-changes is on — I'll narrate each change, each completed
task, and summarize before commits. Say 'stop explaining' to turn it off."

## Default depth: `brief` / `standard`

This runs many times per session, so keep it tight — it must not fight the repo's
token-economy ethos. Default to `brief`/`standard`: at most ~5 sentences and at most one
small ASCII diagram per increment. Go `deep` only when the user asks.

**When brevity and specificity collide, cut scope — never specifics.** One thing named
precisely beats three things summarized vaguely.

## The three checkpoints

Self-invoke this narration at exactly these moments:

1. **After each logical change** — one cohesive edit (a function, a config block, a fix).
   One or two sentences on what now behaves differently and why.
2. **After each completed plan task** — when a task from the active plan finishes, a short
   recap of the task's outcome.
3. **Before any commit** — a slightly fuller summary of everything in the commit, suitable
   to *inform the commit message*. This is the one checkpoint worth a few extra sentences.

## Output rules

- **Chat/CLI only.** Never persist narration to a file.
- **ASCII diagrams by default** (boxes + arrows, single level, no nesting) at every
  checkpoint where something moved — structure, flow, data shape, or file relationships.
  Show **before → after** with the changed node marked. Omit only when there is nothing
  to draw, and say so. Prose-introduce it (one sentence first; never a bare diagram).
- **Brevity ceiling** at default depth: ≤~5 sentences + ≤1 small diagram per increment.
- **Educate, don't report:** say what the system now does, not "I edited file X."
- **Name specifics:** the path, the symbol, the value, the pattern — never "the system",
  "various files", or "more robust". Credentials are named by variable, never by value.

## Interplay with other skills

- **`caveman-commit`:** at the pre-commit checkpoint, if `caveman-commit` is active, hand it
  the change summary to shape into the commit message. Offer the summary; don't impose a
  message of your own.
- **`training` (Sensei):** if the user is in teaching mode, **yield** — that skill
  intentionally withholds answers, and narrating the changes would undercut it. Stay quiet
  about the how-and-why and let Sensei lead.

## Always-on (opt-in)

By default this skill activates per session when its triggers match. To make narration
**standing across every session**, opt in and the plugin's `SessionStart` hook primes it
automatically. Enable it either way:

- **Env var** (recommended) — set `HUHHB_EXPLAIN_CHANGES=1`, e.g. in `~/.claude/settings.json`:
  ```json
  { "env": { "HUHHB_EXPLAIN_CHANGES": "1" } }
  ```
  or `export HUHHB_EXPLAIN_CHANGES=1` in your shell profile.
- **Marker file** — `touch ~/.claude/explaining-changes.on`

Disable for a single session at any time by saying "stop explaining"; remove the env var or
marker file to turn the always-on default back off.

> Requires huhhb installed as a **plugin** (the hook ships with it). A loose
> `~/.claude/skills/` copy of this skill has no hook, so the always-on opt-in won't apply there.
> The hook runs via a POSIX shell (`sh`); on Windows, use Git Bash or WSL on PATH. The bundled
> `.ps1` is a reference equivalent for manual setup — `plugin.json` invokes the `.sh` only.

## Known limitation (be honest about this)

Skill auto-matching alone cannot *guarantee* "always on" — Claude may not re-invoke at every
checkpoint without a reminder. Two plugin hooks reinforce it: the `SessionStart` opt-in above
primes narration each session, and a `PreToolUse` git-commit hook reinforces checkpoint 3.
Both can only **inject reminders/context** — they nudge, they don't force narration. Treat
narration as a standing intent and self-check at the three checkpoints; the hooks are
backstops, not guarantees.

## Core ruleset (summary)

Full rules in the co-located [`principles.md`](./principles.md). The essentials:

- **Diagram rule (hard):** every diagram is preceded by ≥1 sentence saying what it shows.
- **Medium:** this skill narrates in *chat*, so use **simple ASCII** (never mermaid here).
- **Depth:** `brief`/`standard` by default; honor user overrides.
- **Educate, don't report:** frame the new behavior, not the edit list.
- **Voice (§7):** identity, voice defaults, patterns, anti-patterns, context shifts, and
  the red flags that precede a vague narration. Precedence — a `VOICE & WORKING PROFILE`
  block in `~/.claude/CLAUDE.md` outranks §7; `caveman` outranks its defaults; `training`
  overrides everything and you yield.
