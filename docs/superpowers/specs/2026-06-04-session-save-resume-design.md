# Design: session-save / session-resume skill pair

**Date:** 2026-06-04
**Status:** Approved by user (this session)
**Replaces:** the uncommitted `skills/session-handoff/` draft

## Summary

A pair of sibling skills for suspending and resuming working sessions:

- **`session-save`** — writes a durable *continuation file* (`.claude/CONTINUE.md`) capturing where the session stopped, the exact next action, and the context that lives nowhere else (conversation decisions, dirty working-tree state, gotchas).
- **`session-resume`** — consumes the continuation file: verifies it against the real repo state, fully re-hydrates context, briefs the user, deletes the file, and starts on the recorded next action.

Terminology rule: the word "handoff" does not appear in either skill, the manifest, or onboarding copy. The artifact is the **continuation file**; the act is **saving the session**.

## Decisions (locked with user)

| Decision | Choice |
|----------|--------|
| Names | `session-save` / `session-resume` |
| File location | `.claude/CONTINUE.md`, enforced gitignored |
| Commit policy | Never staged or committed unless the user explicitly asks (then `git add -f`) |
| Resume depth | Full re-hydration (verify + memory + linked docs + re-run baseline command) |
| File lifecycle | Deleted by session-resume after a successful brief + verification |
| Automation | Manual only — no hook changes |
| Structure | Two sibling skills; file format owned by `session-save`, `session-resume` references it |

## Gaps in the old draft this design closes

1. **No consumer** — write-only; nothing resumed from the file. → `session-resume` exists; its description carries strong trigger phrases.
2. **Ambiguous commit behavior** — "commit if that matches the repo's workflow" conflicted with the never-commit rule; root-level file risked `git add -A` pickup. → gitignored `.claude/` location, explicit never-commit rule.
3. **No staleness handling** — → resume verifies branch/sha/age and warns on drift before acting.
4. **No lifecycle** — stale files could mislead later sessions. → delete-after-resume; a present `CONTINUE.md` always means an unconsumed save.
5. **No dirty-state capture** — → new required section: uncommitted/untracked files, stashes, open PRs, background processes, task-list state.
6. **No conversation-level context** — → explicitly named the highest-value content: decisions and rejected alternatives that exist only in chat.
7. **Trigger overlap** with `grounding` and `repo-memory` — → both new descriptions carry disambiguating clauses.
8. **Worktree blindness** — → file lives in the worktree's own `.claude/`, so parallel worktrees each get their own.

(Auto-trigger via hooks was considered and rejected: manual only, per user.)

## `session-save` — specification

A rewrite of the old draft, keeping its strong bones: exact-next-action principle, link-don't-copy, one-file rule.

### Frontmatter

- `name: session-save`
- `description`: triggers on "save our spot", "before I close this session", "pick this up tomorrow", "make a follow-up file", "so we can continue", "write a continuation doc", session about to compact/expire mid-task. No `triggers:` field (VS Code agents don't support it).

### Procedure

1. **Find, don't duplicate.** Look for an existing `.claude/CONTINUE.md` (also legacy root `CONTINUE.md` / `HANDOFF.md` — if found, migrate content into `.claude/CONTINUE.md` and delete the legacy file). Exactly one continuation file per worktree; update, never spawn a second.
2. **Ensure gitignore.** Before writing, check `.gitignore` for `.claude/CONTINUE.md`; append the line if missing. The gitignore edit is normal committable change; the continuation file itself is never staged or committed unless the user explicitly asks (then `git add -f`).
3. **Link the source of truth.** If a plan/tracker/ROADMAP holds full status, point to it. The continuation file is a pointer plus the volatile bits, not a copy.
4. **Self-stamp.** Header records save date, branch, and HEAD sha — this is what `session-resume` verifies against.
5. **Fill the required sections** (below).
6. **Save the file.** Do not stage, do not commit.

### Required sections

| Section | Must answer |
|---------|-------------|
| Stamp | Save date · branch · HEAD sha · pushed y/n |
| Where we stopped | Done **and verified** vs merely planned |
| ▶ Next action | The ONE exact next step **and its entry point** (file / task #) — never just "continue" |
| Conversation context | Decisions made and alternatives rejected **in chat only** — the highest-value section |
| Non-obvious learnings | Gotchas and dead-ends not visible in code or commits |
| Working-tree state | Uncommitted/untracked files and what they are mid-change · stashes · open PRs + review state · background processes · in-flight task list |
| How to resume | What to read first (1–3 links) · how memory/context loads next session |
| Environment & commands | dev / test / build commands used this session + key versions; mark one as the **baseline command** for resume to re-run |
| Blockers / human steps | Anything waiting on a person or external system, and what to do |

### Template

The quick template from the old draft, updated to the new sections and stamp header. Lives inline in SKILL.md (no separate format file — YAGNI).

### Common mistakes (updated list)

- Vague narrative instead of the exact next action + entry point.
- Duplicating the full plan/status — link the tracker; keep only volatile bits.
- Creating a second continuation file instead of updating the existing one.
- Omitting conversation context and non-obvious learnings — the parts git can't recover.
- **Committing the continuation file** — never, unless the user explicitly says to.
- Leaking secrets/PII into the file.

## `session-resume` — specification

New skill.

### Frontmatter

- `name: session-resume`
- `description`: triggers on "resume the session", "pick up where we left off", "continue from where we stopped", "where were we", "load the continuation file". Disambiguation clause: not for mid-session checkpoints (that's `grounding`) or recalling stored facts (that's `repo-memory`).

### Procedure

1. **Locate** `.claude/CONTINUE.md`; also check legacy root `CONTINUE.md` / `HANDOFF.md`. If none exists, say so plainly and fall back to `git log` + repo memory — never invent a prior state.
2. **Verify against reality** before acting:
   - Recorded branch still exists? Currently checked out?
   - HEAD moved past the recorded sha? Summarize intervening commits.
   - Recorded dirty files still dirty? Stashes still present?
   - Recorded PRs merged/closed in the interim?
   - Staleness: warn if the save is >7 days old.
   - Report any drift to the user **before** acting on the next action.
3. **Re-hydrate fully:**
   - Load repo memory (`.claude/memory/MEMORY.md` + relevant entries).
   - Re-read the linked plan/tracker docs from "How to resume".
   - Re-run the recorded **baseline command** (test/build) to confirm the starting state still passes; report the result either way.
4. **Brief** the user: where we were · what changed since · the next action. Short — seconds to read.
5. **Delete the continuation file** — only after the brief is delivered and verification passed. If verification failed or drift is severe, leave the file in place and tell the user why.
6. **Act:** start on the recorded next action.

### Common mistakes

- Acting on the next action before reporting drift.
- Deleting the file when verification failed.
- Pretending to resume when no continuation file exists.
- Re-reading the entire codebase instead of trusting the file's pointers.

## Rollout

1. Rename `skills/session-handoff/` → `skills/session-save/`; rewrite SKILL.md per this spec.
2. Add `skills/session-resume/SKILL.md`.
3. `marketplace.json`: replace the session-handoff entry with two entries.
4. `onboarding/skills-list.md`: replace the session-handoff row with two rows.
5. Bump version → **0.4.7** in both `marketplace.json` and `.claude-plugin/plugin.json`.
6. Quality bar: test each skill against one real use case before merge — this working session itself is the test case for `session-save`; a fresh session consuming its output tests `session-resume`.
7. Open a PR (no direct push to main); no AI attribution in commits or PR description.

## Out of scope

- Hook automation (SessionStart detection, PreCompact auto-save) — rejected for now; could be revisited later.
- Archiving past continuation files.
- Cross-machine or teammate-shared continuation files (the file is gitignored and local by design).
