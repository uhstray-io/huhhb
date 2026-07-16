# repo-memory hook suite — implementation plan (2026-07-16)

Grilled and confirmed 2026-07-16. Goal: turn repo-memory's write lint
from prose into a gate, and make capture survive sessions that never end
cleanly — commit-time capture, PR-time consolidation, no nudges.

## Why (decisions from the grill)

- repo-memory is DECIDED memory with no automatic capture path (unlike
  evolve's Stop-hook digest or MemPalace's deliberate filing) — without a
  mechanical writer, nothing lands unless someone remembers.
- Stop hooks rarely fire in practice (sessions over-run), so capture
  anchors to commits; consolidation anchors to PR creation.
- Per-commit records would flood the store and duplicate git history
  (forbidden by the skill's What-NOT-to-Save) — so per-commit lines are
  STAGING, consolidated into one outcome record per PR.

## Components

### 1. Write-lint gate (plugin PreToolUse — Claude Code sessions)
- Matcher: Write/Edit tool calls targeting `.claude/memory/**`.
- BLOCK (high precision): an Edit changing the body/`statement` of an
  existing record carrying `kind:` metadata. Whitelist the two permitted
  metadata-only flips: `status: superseded-by:<date>`, `promote:
  candidate` → `promote: done:<date>`.
- WARN (heuristic): imperative openers ("Always…", "Never…", "You
  must…"), references to Merge Authorization / routing rules /
  permissions in a record body, missing `kind:`/metadata shape on
  agent-record paths. Hook feedback tells the agent to quarantine or
  rephrase; the write is not denied.
- Escape hatch: an explicit in-session human instruction ("override the
  memory lint") downgrades a block to a warn. Silent for `MEMORY.md` and
  human-curated memories (no `kind:`).
- Implementation: `hooks/repo-memory-lint.ts` (Node stdlib, erasable TS),
  wired in `.claude-plugin/plugin.json`. Extension (same script, second
  entry point): a `.githooks/pre-commit` variant runs the identical
  mechanical checks over staged `.claude/memory/` files so non-Claude
  vendors get the same gate at commit time.

### 2. Per-commit capture (git post-commit — all vendors + humans)
- `.githooks/post-commit` (committed; repo-kickstart runs
  `git config core.hooksPath .githooks` at adoption; memory-onboarding
  project scope verifies the setting).
- Appends 1–2 outcome-framed lines per commit to the branch's staging
  journal `.claude/memory/wip/<branch-slug>.md`: date · branch ·
  conventional-commit subject (already outcome language) · files-changed
  count. Purely mechanical — no model call, composed from git facts so it
  cannot fail the observational lint.
- Skips: commits touching only `.claude/memory/` (no self-capture),
  merge commits, detached HEAD.

### 3. PR-creation consolidation (plugin PostToolUse + pr-shepherd fallback)
- Matcher: Bash tool calls running `gh pr create`. The hook does NOT do
  the work — its feedback instructs the session to: read the branch's
  staging journal → consolidate and `/simplify` → write ONE PR outcome
  record via the repo-memory module (agent Record Contract, `kind:
  outcome`, evidence = PR number + commit range) → delete the staging
  journal in the same commit.
- Fallback: pr-shepherd's post-merge close-out checks for a leftover
  `.claude/memory/wip/<branch-slug>.md` (PRs created by non-Claude
  vendors) and performs the same consolidation there — one line added to
  its close-out checklist.

## Implementation order

1. `hooks/repo-memory-lint.ts` + plugin.json wiring + `tests/` coverage
   (lint gate is the only component with real logic — test block vs warn
   vs whitelist paths against fixtures, including the quarantine record
   from memory-onboarding's GREEN fixtures).
2. `.githooks/post-commit` + repo-kickstart line (`core.hooksPath`) +
   memory-onboarding P-item verifying it.
3. PostToolUse `gh pr create` matcher + pr-shepherd close-out fallback
   line.
4. repo-memory SKILL.md gains a short "Hooks" section pointing at all
   three (contract stays in the skill; hooks enforce it).
5. G0 lint + offline suite + a bench scenario asserting the lint gate's
   block/warn split; version bump per the new lifecycle rules (this is a
   big feature → minor with patch carry-over).

## Out of scope

- Honcho/MemPalace writes (other strata own their capture).
- Auto-drafting judgment content — consolidation stays an agent action
  triggered by the hook, never shell-side text generation.
- Retrofitting journals for historical branches.
