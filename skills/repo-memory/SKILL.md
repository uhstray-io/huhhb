---
name: repo-memory
description: Use when the user says "remember", "don't forget", "save that", "keep that in mind", "recall", "what do we know about", "look that up", or any request to persist or retrieve project knowledge — stores memories in .claude/memory/ using the Claude Code memory format, committed to git so the whole team shares context.
---

# repo-memory

Repo-local memory using the official Claude Code memory format. Stored in `.claude/memory/` at the project root and committed to git — shared across the team, no external service required.

## First Run (Setup)

If `.claude/memory/` does not exist:

```bash
mkdir -p .claude/memory
```

Create `.claude/memory/MEMORY.md`:

```markdown
# Memory Index

- entries below -
```

Check whether CLAUDE.md already contains a `## Repo Memory` section:

```bash
grep -q "## Repo Memory" CLAUDE.md && echo "already set up" || echo "needs setup"
```

If it already exists, skip the append — setup is complete. If not, append this block:

```markdown
## Repo Memory

Claude stores project knowledge in `.claude/memory/` (committed to git).
At the start of every session, read `.claude/memory/MEMORY.md` to load context.
Use `/repo-memory` to save or retrieve memories.

### Recalling Information

Before answering questions about project decisions, conventions, or context,
check `.claude/memory/` first — read `MEMORY.md` for the index, then open
relevant files. This is the team's shared knowledge base.

### When to Save

| What | Type |
|------|------|
| Architectural decisions and their rationale | `project` |
| Team conventions, what to avoid or repeat | `feedback` |
| Links to external systems, dashboards, docs | `reference` |
| Personal preferences (add user_*.md to .gitignore if private) | `user` |
| Chosen libraries/frameworks and why alternatives were rejected | `project` |
| Things that were tried and didn't work (anti-patterns for this codebase) | `feedback` |
| Preferred naming conventions, code style, and formatting rules | `feedback` |
| Things that Claude got wrong multiple timesand required correction | `feedback` |
| External API docs, service dashboards, internal wikis | `reference` |
| Environment setup notes (non-obvious deps, quirks, build steps) | `reference` |
| Domain knowledge the user has that I shouldn't re-explain | `user` |





### What NOT to Save
- Code patterns readable from the codebase
- Git history (git log / git blame are authoritative)
- Ephemeral task state or in-progress work
- Anything already in this CLAUDE.md
```

Tell the user: commit `.claude/memory/` to share context with the team. Add `user_*.md` to `.gitignore` for personal-only memories.

## Session Start

Read `.claude/memory/MEMORY.md` if it exists to load project context.

## Saving a Memory

**Step 1** — Write `.claude/memory/<slug>.md`:

```markdown
---
name: short-kebab-slug
description: One-line summary used for discovery
metadata:
  node_type: memory
  type: project | feedback | reference | user
---

Lead with the fact or rule.
For feedback/project: add **Why:** and **How to apply:** lines.
Link related memories with [[their-slug]].
```

**Step 2** — Add one line to `.claude/memory/MEMORY.md`:

```
- [Title](filename.md) — one-line hook (under 150 chars)
```

Keep `MEMORY.md` under 200 lines — it loads every session.

## Updating a Memory

Read the file first, then Edit it. Overwrite stale entries rather than accumulating contradictions.

## Searching Memory

Read `MEMORY.md` for the index, then open specific files. For full-text search:

```bash
grep -rl "keyword" .claude/memory/
```
