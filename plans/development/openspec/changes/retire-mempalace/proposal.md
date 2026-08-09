## Why

The docs say MemPalace is retired from routing. The code still ships it.

`.claude-plugin/.mcp.json` registers an MCP server named `memory` pointing at
`uvx mempalace-mcp` for **everyone who installs huhhb** — a generic name fronting
a backend this project stopped routing to on 2026-08-01. Four `memory-*` skills
ship alongside it, competing for trigger matching against the current system on
exactly the phrasings a user types when they mean it ("remember this", "what do
we know about", "memory status").

The gap between what the documentation claims and what the plugin installs is the
problem. Documentation reconciliation already landed; the removal did not.

## What Changes

- **BREAKING** (for the plugin surface, not for user data): remove the `memory`
  server from `.claude-plugin/.mcp.json`. Every installer stops receiving a tool
  surface pointing at a retired backend.
- **BREAKING**: delete `skills/memory/`, `skills/memory-search/`,
  `skills/memory-mine/`, `skills/memory-status/`, their four `marketplace.json`
  entries and four `onboarding/skills-list.md` rows.
- Delete `scripts/sync-mempalace.sh` and `scripts/patch-mempalace.sh`, ending the
  vendoring relationship rather than working around it. `skills/memory/SKILL.md`
  is vendored and cannot be rewritten in place — AGENTS.md marks it "do not edit
  directly; refine upstream" — so removal is what resolves the constraint.
- Update `AGENTS.md` (drop the vendored-memory-skill rule, keep the caveman one;
  drop both scripts from Key Files) and `KICKSTART.md` / `README.md` where they
  still name MemPalace as live.
- Reconcile the survivors' trigger lists so the freed `memory-*` surface is
  claimed deliberately rather than by accident.

**No user data is touched.** This is a marketplace change, not a machine change:
MemPalace stays independently installable (`uv tool install mempalace`) with its
own CLI, and its data lives outside this repo. Removing a skill destroys nothing.

## Capabilities

### New Capabilities

- `memory-routing`: which memory stores this plugin ships, which it routes to,
  and the invariant that those two sets are the same — the property whose absence
  is this change's entire motivation.

### Modified Capabilities

None. This store currently holds no main specs.

## Impact

- `.claude-plugin/.mcp.json` — the highest-value line, and independent of what
  happens to the skills. It is deliberately sequenced first so it can ship alone.
- `.claude-plugin/plugin.json`, `marketplace.json`, `onboarding/skills-list.md` —
  manifest and listing entries.
- `hooks/stop-hook.sh`, `scripts/evolve/evals.ts`, `tests/test_evolve.test.ts` —
  these name the removed skills. **Each must be read before editing**: some
  references are strata descriptions that remain true, not calls that break.
- `skill-lint` count drops from 53 to 49.
- **Out of scope, deliberately**: `buhhdy/` still names MemPalace as the
  user-memory system of record in `config.yaml`, `README.md` and
  `core-workflows/SKILL.md`. buhhdy is being removed from this repo with its
  practices carried elsewhere; those fixes belong to that migration.

## Rollback Plan

Every step is a `git revert` away, and nothing outside the repo changes.

- **MCP registration** — restore the four-line block in `.claude-plugin/.mcp.json`.
  Reinstalling the plugin re-registers the server; no state to migrate.
- **Skills** — restore from git. The vendored `skills/memory/SKILL.md` is
  recoverable either from history or by re-running the sync script, which is why
  the scripts are deleted in the same commit as the skills rather than earlier.
- **Manifest entries** — revert alongside their skills; `skill-lint` returning to
  53 with 0 FAIL is the proof the revert was complete.

The one non-reverting risk is a **dangling call**: a removed server plus a
surviving invocation is a runtime failure strictly worse than the status quo.
Phase 1 greps `hooks/`, `scripts/evolve/` and `buhhdy/` for `memory` MCP tool
calls by name before the registration is removed, and the phase gate is a
scratch-profile install proving no server is registered and no tool call fails.
