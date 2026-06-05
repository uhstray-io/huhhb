---
name: session-resume
description: >
  Use when starting a session that should continue prior work — phrases like "resume the session",
  "pick up where we left off", "continue from where we stopped", "where were we", "load the
  continuation file". Consumes the .claude/CONTINUE.md written by session-save: verifies it against
  the repo, re-hydrates context, briefs, then acts. Not for mid-session checkpoints (use grounding)
  or recalling stored facts (use repo-memory).
---

# Session Resume

## Overview

Consume the continuation file written by `session-save`: verify it against reality, re-hydrate full
context, brief the user, then start on the recorded next action.

**Core principle:** trust the file's pointers, but verify its claims — the repo may have moved
since the save.

## Procedure

1. **Locate** `.claude/CONTINUE.md`. Also check the repo root for a legacy `CONTINUE.md` or
   `HANDOFF.md`. If none exists, say so plainly and fall back to `git log` plus repo memory —
   never invent a prior state.
2. **Verify against reality.** Compare the file's stamp and claims to the actual repo:
   - Does the recorded branch still exist? Is it checked out?
   - Has HEAD moved past the recorded sha? If so, summarize the intervening commits.
   - Are the recorded dirty files still dirty? Stashes still present?
   - Were the recorded PRs merged or closed in the interim? (`gh pr view <n>`)
   - Staleness: warn if the save is more than 7 days old.
   Report any drift to the user **before** acting.
3. **Re-hydrate fully:**
   - Load repo memory (`.claude/memory/MEMORY.md` and the relevant entries) if present.
   - Re-read the 1–3 links under "How to resume".
   - Re-run the **baseline command** recorded under "Environment & commands"; report pass/fail
     either way.
4. **Brief** the user in a few lines: where we were · what changed since · the next action.
5. **Delete the continuation file** — only after the brief is delivered and verification passed.
   If verification failed or the drift is severe, leave the file in place and explain why.
6. **Act.** Start on the recorded next action.

## Common mistakes

- **Acting on the next action before reporting drift** — the user decides what drift means.
- **Deleting the file when verification failed** — a failed resume must keep its source.
- **Pretending to resume** when no continuation file exists.
- **Re-reading the whole codebase** instead of trusting the file's pointers.
- **Skipping the baseline command** — "it passed last session" is not evidence it passes now.
