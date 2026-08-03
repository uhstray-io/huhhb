# Proposal: voice-anatomy-layer

## Why

`skills/explaining-changes/` specifies *when* to narrate (three checkpoints), *how
long* (≤4 sentences), and *whether to draw* (only when structure or flow changed) —
but almost nothing about *how the prose reads*. Its one voice rule, "educate, don't
report," is a slogan with no enforceable surface. In practice the narration drifts
into edit-log reporting ("I updated flush.ts") and vague summary ("the system now
handles failures more robustly"), and the conditional diagram gate suppresses the
diagram on most increments — which is the single feature the user relies on to scan
a change quickly.

Separately, `~/.claude/CLAUDE.md` is the highest-leverage prompt surface a user owns
and there is no skill that establishes one deliberately. `claude-md-management:claude-md-improver`
audits *project* CLAUDE.md files against a coverage rubric; `/revise-claude-md` folds
session learnings into repo files. Neither interviews the user, neither addresses
voice, and neither respects the two-store routing policy — so preferences, rationale,
and history all land in always-loaded context that has no size discipline.

The five-section voice anatomy (identity / voice defaults / patterns / anti-patterns /
context shifts) gives both problems the same enforceable shape.

## What Changes

- `skills/explaining-changes/principles.md`: new **§7 Voice** carrying the five
  sections tuned to narration — identity (the engineer who just made the change,
  pairing over the user's shoulder), voice defaults (present tense for new behavior,
  lead with the behavior change, no hedging on the verified), patterns to use,
  anti-patterns, and context shifts by change type.
- `skills/explaining-changes/principles.md` §3 **inverted**: the diagram becomes
  default-on at every checkpoint where structure, control flow, data shape, or file
  relationships moved. It is skipped only when there is nothing to draw, and the skip
  is stated in the sentence rather than silently taken. Diagrams render **before →
  after** with the changed node marked, not end-state only.
- `skills/explaining-changes/principles.md` §7 adds a **specificity mandate**: named
  file paths, symbols, values, and patterns instead of generalizations, with an
  explicit reconciliation showing that specifics are the *subject* of the sentence and
  never the object of "I edited".
- `skills/explaining-changes/SKILL.md`: §Voice summary block; brevity ceiling raised
  once, explicitly, from ≤4 to ≤5 sentences to pay for specificity plus a
  per-checkpoint diagram.
- New skill `skills/user-kickstart/` (SKILL.md + reference.md): a cold interview
  establishing voice and standing goals, a draft, an evidence audit of that draft
  against real artifacts, a resolution pass on contradictions, and an idempotent
  write into a delimited managed block in `~/.claude/CLAUDE.md`.
- `skills/user-kickstart/reference.md` is the **canonical owner** of the voice anatomy
  and the shared banned-phrase list; `explaining-changes` keeps its narration-specific
  defaults inline and cites reference.md for the shared list.
- `marketplace.json`, `onboarding/skills-list.md`: register `user-kickstart`.
- `tests/bench/user-kickstart.json` (new, required G1) and
  `tests/bench/explaining-changes.json` (new; none exists today).

## Capabilities

### New Capabilities

- `explaining-changes-voice`: the narration voice anatomy, the inverted diagram rule,
  the specificity mandate, the report-vs-specific reconciliation, and the override
  chain (user voice block > `caveman` > skill defaults, with `training` yielding).
- `user-voice-profile`: the `user-kickstart` skill — trigger scope and handoffs,
  the five-phase workflow, interview coverage, and the bounded evidence audit.
- `voice-profile-routing`: the three-part test deciding CLAUDE.md vs the hindsight
  `personal` bank, the 60-line block budget, and the managed-block write mechanics
  (backup, marker-scoped replacement, idempotent re-run).

### Modified Capabilities

None — the store has no archived baseline specs; all three are new.

## Impact

- Skills-and-docs only. No scripts, no runtime dependencies, no npm surface.
- `explaining-changes` behavior changes for anyone with the skill active: more
  diagrams, more specific prose, one more sentence of ceiling. The three checkpoints,
  the chat/CLI-only rule, and the `caveman-commit` / `training` interplay are
  unchanged.
- `user-kickstart` writes to `~/.claude/CLAUDE.md` — outside the repo, on the user's
  machine — and calls `mcp__hindsight__sync_retain` against the `personal` bank. Both
  are gated on an explicit diff approval.
- First cross-skill file citation in `skills/`: `explaining-changes/principles.md`
  points at `user-kickstart/reference.md` for the shared banned-phrase list. Valid —
  the plugin ships as one unit — but it is a new pattern in this tree.
- No change to `claude-md-improver`, `/revise-claude-md`, `update-config`,
  `memory-onboarding`, or `memory-setup`; `user-kickstart` routes to each of
  them by name rather than absorbing their scope.

## Rollback Plan

Revert the PR. Every artifact is markdown under `skills/`, `tests/bench/`,
`marketplace.json`, and `onboarding/`; nothing migrates and nothing persists outside
git except what a user chose to write on their own machine. Those two effects revert
independently and without this repo: the CLAUDE.md block is deleted by removing the
text between its `BEGIN`/`END` markers (the marker line says so), and any
`personal`-bank memories are removed with `mcp__hindsight__invalidate_memory`. The
pre-write backup at `~/.claude/CLAUDE.md.bak-<timestamp>` restores the prior file
wholesale.
