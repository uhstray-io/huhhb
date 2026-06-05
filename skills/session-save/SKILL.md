---
name: session-save
description: >
  Use when ending, pausing, or running low on context in a working session and you want to resume
  cleanly later — phrases like "save our spot", "before I close this session", "pick this up
  tomorrow", "make a follow-up file", "so we can continue", "write a continuation doc", or when a
  session is about to compact/expire mid-task. Writes the continuation file consumed by
  session-resume. Not for mid-session checkpoints (use grounding) or storing standalone facts (use
  repo-memory).
---

# Session Save

## Overview

Write a durable continuation file so the next session — you, a teammate, or a fresh agent — resumes
in seconds instead of re-reading everything.

**Core principle:** capture the *exact next action* and the *context that lives nowhere else* —
conversation decisions, working-tree state, gotchas — and link to the source of truth rather than
copying it.

## When to use

- A session is ending, or about to compact/expire, mid-task.
- The user says "continue later", "save our spot", "make a follow-up file".
- A long session produced decisions, gotchas, or state that commits alone won't preserve.

**Skip** for trivial one-off tasks, or work already fully captured by commits plus an up-to-date
plan/tracker.

## Procedure

1. **Find, don't duplicate.** Look for an existing `.claude/CONTINUE.md`. Also check the repo root
   for a legacy `CONTINUE.md` or `HANDOFF.md` — if found, fold its content into
   `.claude/CONTINUE.md` and delete the legacy file. Exactly one continuation file per worktree;
   update it, never spawn a second.
2. **Ensure it stays out of git.** Check `.gitignore` for a `.claude/CONTINUE.md` line; append it
   if missing (that edit is a normal, committable change). **Never stage or commit the continuation
   file itself** unless the user explicitly asks — then use `git add -f`.
3. **Link the source of truth.** If a plan/tracker/ROADMAP holds full status, point to it. The
   continuation file is a *pointer + the volatile bits*, not a copy — copies drift out of sync.
4. **Self-stamp.** Record save date, branch, and HEAD sha in the header — `session-resume`
   verifies against these.
5. **Fill the required sections** (table below). The make-or-break ones are the **exact next
   action** and the **conversation context**.
6. **Save the file.** Do not stage it. Do not commit it.

## Required sections

| Section | Must answer |
|---------|-------------|
| Stamp | Save date · branch · HEAD sha · pushed y/n |
| Where we stopped | What's done **and verified** vs merely planned |
| ▶ Next action | The ONE exact next step **and its entry point** (file / task #) — never just "continue" |
| Conversation context | Decisions made and alternatives rejected **in chat only** — the highest-value section |
| Non-obvious learnings | Gotchas and dead-ends not visible in code or commits |
| Working-tree state | Uncommitted/untracked files and what each is mid-change · stashes · open PRs + review state · background processes · in-flight task list |
| How to resume | What to read first (1–3 links) · how memory/context loads next session |
| Environment & commands | dev / test / build commands used this session + key versions; mark ONE as the **baseline command** for session-resume to re-run |
| Blockers / human steps | Anything waiting on a person or external system (and what to do) |

## Quick template

```markdown
# Continue Here
> Saved <YYYY-MM-DD> · branch: <name> @ <short-sha> · pushed: y/n
> Authoritative status lives in <tracker>. This file = where we stopped + the exact next action.

## Where we stopped
- <done & verified> · <planned>

## ▶ Next action
<one concrete step> — entry point: <file / task #>

## Conversation context (chat-only decisions)
- <decision + rejected alternative + why>

## Non-obvious learnings (not in code/commits)
- <gotcha / dead-end + why it matters>

## Working-tree state
- uncommitted: <file — what's mid-change> · stashes: <n> · PRs: <# + state> · background: <process> · tasks: <in-flight list state>

## How to resume
1. Read <tracker/plan link>   2. <memory/context note>

## Environment & commands
- dev: <cmd> · test: <cmd> ← baseline · build: <cmd> · versions: <key versions>

## Blockers / human steps
- <waiting-on person/external + what to do>
```

## Common mistakes

- **Vague narrative** ("we worked on X") instead of the *exact* next action and entry point.
- **Duplicating the full plan/status** into the continuation file → it drifts. Link the tracker;
  keep only volatile bits here.
- **Creating a second continuation file** when one already exists — update the existing one.
- **Omitting conversation context and non-obvious learnings** — the parts git can't recover.
- **Committing the continuation file** — never, unless the user explicitly says to.
- **Leaking secrets/PII** into the file.
