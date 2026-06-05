# session-save / session-resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the uncommitted `skills/session-handoff/` draft with a `session-save` / `session-resume` skill pair per the approved spec (`docs/superpowers/specs/2026-06-04-session-save-resume-design.md`), delivered via feature branch + PR.

**Architecture:** Two sibling markdown skills under `skills/`. `session-save` owns the continuation-file format (`.claude/CONTINUE.md`, gitignored, never committed); `session-resume` consumes it (verify → re-hydrate → brief → delete → act). Manifest, onboarding list, and plugin version updated in the same PR.

**Tech Stack:** Markdown skills with YAML frontmatter, `marketplace.json` manifest, `jq` for JSON validation, `gh` for the PR.

**Important context for the executor:**
- This repo has **no test suite** — verification steps are `grep`/`jq` checks plus a real-use-case dry run (the repo's skill quality bar).
- The working tree already contains uncommitted draft work: untracked `skills/session-handoff/`, and modified `marketplace.json`, `.claude-plugin/plugin.json`, `onboarding/skills-list.md` (version already bumped to **0.4.7** — correct, keep it). The tasks below fold these into proper commits. **Do not** create a worktree — the uncommitted draft would not follow you there. Work on a feature branch in this checkout.
- **Terminology rule:** the word "handoff" must not appear in either skill, the manifest, or onboarding copy — the only allowed appearances are legacy-filename detection (`HANDOFF.md`) inside the two skills' procedures.
- Repo conventions: Conventional Commits; **no AI attribution anywhere** (no Co-Authored-By trailers, no "Generated with" footers); PR required (CodeRabbit reviews it).

---

### Task 1: Create the feature branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to the branch**

```bash
git checkout -b feat/session-save-resume
```

- [ ] **Step 2: Verify**

Run: `git branch --show-current`
Expected: `feat/session-save-resume`

### Task 2: Replace session-handoff with session-save

**Files:**
- Rename: `skills/session-handoff/` → `skills/session-save/` (untracked, so plain `mv`)
- Rewrite: `skills/session-save/SKILL.md` (full content below)

- [ ] **Step 1: Rename the directory**

```bash
mv skills/session-handoff skills/session-save
```

- [ ] **Step 2: Overwrite `skills/session-save/SKILL.md` with exactly this content**

````markdown
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
````

- [ ] **Step 3: Verify the terminology rule**

Run: `grep -ci "handoff" skills/session-save/SKILL.md`
Expected: `1` (the single legacy-filename mention `HANDOFF.md` in Procedure step 1 — nothing else)

- [ ] **Step 4: Verify frontmatter has no `triggers` field**

Run: `grep -c "^triggers:" skills/session-save/SKILL.md || true`
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add skills/session-save
git commit -m "feat(session-save): add session-save skill for durable continuation files"
```

### Task 3: Create session-resume

**Files:**
- Create: `skills/session-resume/SKILL.md`

- [ ] **Step 1: Create `skills/session-resume/SKILL.md` with exactly this content**

````markdown
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
````

- [ ] **Step 2: Verify the terminology rule**

Run: `grep -ci "handoff" skills/session-resume/SKILL.md`
Expected: `1` (the single legacy-filename mention `HANDOFF.md` in Procedure step 1)

- [ ] **Step 3: Verify frontmatter has no `triggers` field**

Run: `grep -c "^triggers:" skills/session-resume/SKILL.md || true`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add skills/session-resume
git commit -m "feat(session-resume): add session-resume skill consuming continuation files"
```

### Task 4: Update marketplace.json

**Files:**
- Modify: `marketplace.json:10-17` (the session-handoff entry)

- [ ] **Step 1: Replace the session-handoff entry with two entries**

Find this block (currently lines 10–17):

```json
    {
      "name": "session-handoff",
      "path": "skills/session-handoff/SKILL.md",
      "description": "Use when ending or pausing a session and you want to resume cleanly later — writes or updates a durable handoff with the exact next action and the non-obvious context that isn't in code or commits.",
      "category": "dev",
      "tags": ["handoff", "continuity", "session", "resume", "context"],
      "version": "0.1.0"
    },
```

Replace with:

```json
    {
      "name": "session-save",
      "path": "skills/session-save/SKILL.md",
      "description": "Use when ending or pausing a session and you want to resume cleanly later — writes a gitignored continuation file (.claude/CONTINUE.md) with the exact next action, conversation context, and working-tree state.",
      "category": "dev",
      "tags": ["continuity", "session", "save", "context"],
      "version": "0.1.0"
    },
    {
      "name": "session-resume",
      "path": "skills/session-resume/SKILL.md",
      "description": "Use when picking up prior work in a fresh session — consumes the continuation file written by session-save: verifies it against the repo, re-hydrates context, briefs, deletes the file, then acts.",
      "category": "dev",
      "tags": ["continuity", "session", "resume", "context"],
      "version": "0.1.0"
    },
```

- [ ] **Step 2: Validate JSON and check contents**

Run: `jq -r '.version, (.skills[] | select(.name | startswith("session-")) | .name + " -> " + .path)' marketplace.json`
Expected:
```
0.4.7
session-save -> skills/session-save/SKILL.md
session-resume -> skills/session-resume/SKILL.md
```

Run: `grep -ci "handoff" marketplace.json || true`
Expected: `0`

- [ ] **Step 3: Commit** (this also captures the already-pending 0.4.7 bump in this file)

```bash
git add marketplace.json
git commit -m "feat(marketplace): register session-save and session-resume, bump to 0.4.7"
```

### Task 5: Update onboarding skills list

**Files:**
- Modify: `onboarding/skills-list.md:43` (the session-handoff row)

- [ ] **Step 1: Replace the row**

Find (line 43):

```markdown
| session-handoff | `/session-handoff` | Use when ending or pausing a session and you want to resume cleanly later — writes/updates a durable handoff with the exact next action and non-obvious context |
```

Replace with two rows (note: the table is alphabetized — `session-resume` sorts before `session-save`):

```markdown
| session-resume | `/session-resume` | Use when picking up prior work in a fresh session — verifies the continuation file against the repo, re-hydrates context, briefs, then acts |
| session-save | `/session-save` | Use when ending or pausing a session and you want to resume cleanly later — writes a gitignored continuation file with the exact next action and chat-only context |
```

- [ ] **Step 2: Verify**

Run: `grep -c "session-" onboarding/skills-list.md`
Expected: `2`

Run: `grep -ci "handoff" onboarding/skills-list.md || true`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add onboarding/skills-list.md
git commit -m "docs(onboarding): list session-save and session-resume skills"
```

### Task 6: Commit version bump in plugin.json + spec + plan docs

**Files:**
- Modify: `.claude-plugin/plugin.json` (version already 0.4.7 in working tree — commit it)
- Add: `docs/superpowers/specs/2026-06-04-session-save-resume-design.md`
- Add: `docs/superpowers/plans/2026-06-04-session-save-resume.md`

- [ ] **Step 1: Verify both versions match**

Run: `jq -r .version marketplace.json .claude-plugin/plugin.json`
Expected:
```
0.4.7
0.4.7
```

- [ ] **Step 2: Commit**

```bash
git add .claude-plugin/plugin.json docs/superpowers/specs/2026-06-04-session-save-resume-design.md docs/superpowers/plans/2026-06-04-session-save-resume.md
git commit -m "chore(release): bump plugin to 0.4.7; add session-save/resume spec and plan"
```

### Task 7: Repo-wide terminology + cleanliness sweep

**Files:** none (verification only)

- [ ] **Step 1: No "handoff" outside allowed locations**

Run: `grep -ril "handoff" --exclude-dir=.git --exclude-dir=docs . || echo CLEAN`
Expected: only `./skills/session-save/SKILL.md` and `./skills/session-resume/SKILL.md` (the legacy `HANDOFF.md` filename detection). If anything else appears, fix it before continuing. (`docs/` is excluded — the spec documents the rename history.)

- [ ] **Step 2: Old skill directory is gone**

Run: `ls skills/session-handoff 2>&1 || true`
Expected: `No such file or directory`

- [ ] **Step 3: Working tree is clean**

Run: `git status --short`
Expected: empty output

### Task 8: Real-use-case test (skill quality bar)

**Files:**
- Modify: `.gitignore` (the skill's own gitignore-ensure step, exercised for real)
- Create: `.claude/CONTINUE.md` (gitignored — never committed)

Exercise `session-save` by following its procedure on THIS session, then dry-run `session-resume`'s verification against the result.

- [ ] **Step 1: Follow session-save's procedure end to end**

Write a real `.claude/CONTINUE.md` for the current session using the skill's template (stamp with actual branch/sha; next action = "open the PR — Task 9 of this plan"). Append `.claude/CONTINUE.md` to `.gitignore` per Procedure step 2.

- [ ] **Step 2: Verify the file is invisible to git**

Run: `git status --short | grep CONTINUE || echo IGNORED`
Expected: `IGNORED`

- [ ] **Step 3: Dry-run session-resume verification**

Follow session-resume Procedure steps 1–2 against the file just written: confirm branch/sha match, no drift. Expected: verification passes. Then delete `.claude/CONTINUE.md` (per its lifecycle — consumed) to leave a clean state.

- [ ] **Step 4: Commit the gitignore change**

```bash
git add .gitignore
git commit -m "chore: gitignore .claude/CONTINUE.md continuation file"
```

### Task 9: Push and open the PR

**Files:** none (git/gh only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/session-save-resume
```

- [ ] **Step 2: Open the PR** (no AI attribution anywhere in the body)

```bash
gh pr create --title "feat: replace session-handoff draft with session-save/session-resume pair" --body "## What

Replaces the unreleased session-handoff draft with a two-skill pair:

- **session-save** — writes a gitignored continuation file (\`.claude/CONTINUE.md\`) capturing the exact next action, chat-only decisions, and working-tree state. Never committed unless explicitly requested.
- **session-resume** — consumes the file: verifies against repo reality (branch/sha/staleness/drift), re-hydrates context (repo memory, linked docs, baseline command), briefs, deletes the file, then acts.

## Why

The draft was write-only (nothing consumed the file), had ambiguous commit behavior, and no staleness or lifecycle handling. Design rationale in \`docs/superpowers/specs/2026-06-04-session-save-resume-design.md\`.

## Notes

- Version bumped to 0.4.7 in both manifests.
- Both skills tested against a real session per the skill quality bar.
- The word \"handoff\" survives only as legacy-filename detection (\`HANDOFF.md\`) for migration."
```

- [ ] **Step 3: Verify CI / CodeRabbit picks it up**

Run: `gh pr view --json url,title -q '.url + " " + .title'`
Expected: PR URL printed; CodeRabbit review will follow — address its findings before merge.

---

## Self-review (completed)

- **Spec coverage:** naming (T2/T3), file location + gitignore enforcement (T2 content, T8), never-commit (T2 content), full re-hydration (T3 content), delete-after-resume (T3 content), manual-only (no hook tasks — by design), manifest/onboarding (T4/T5), 0.4.7 bump (T4/T6), quality-bar test (T8), PR delivery (T9), terminology ban (T2/T3 grep steps, T7 sweep). No gaps.
- **Placeholder scan:** every step has full content/commands; the only `<angle-bracket>` placeholders are *inside the skill templates themselves*, where they are the product.
- **Consistency:** file paths, names, and version match across tasks; both SKILL.md descriptions match their manifest/onboarding copy in substance.
