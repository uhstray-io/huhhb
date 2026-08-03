# Memory skill migration — MemPalace → two-store

**Status:** partly executed · **Date:** 2026-08-02 · **Last updated:** 2026-08-02

**What has since landed, and what has not:**

| Phase | State |
|---|---|
| 1. Stop shipping the MemPalace MCP server | **not done** — `.claude-plugin/.mcp.json` still registers `memory` → `uvx mempalace-mcp` |
| 2. Remove the four MemPalace skills | **not done** — descriptions marked LEGACY (`a7d2a4a`) but the skills ship |
| 3. Close the trigger gap | **partly** — `memory-onboarding` removed, so its share of the surface is freed; unmeasured |
| 4. Fix the surviving diagnostic skill | **obsolete** — `memory-onboarding` was deleted outright (ADR-0002) rather than repaired. Its checks moved to `memory-setup` Phase 5, `evolve-status`, and `repo-kickstart` |
| 5. Documentation reconciliation | **done** — `f2b739e`, `a7d2a4a`, `31e9f09`, `3a9eb2b`. Its checklist below is left unticked deliberately: those boxes describe the removal-time doc pass (phases 1–2), which has not run |
| 6. buhhdy | **still out of scope** — being removed from this repo entirely |

Also landed outside this plan: `two-store-memory-setup` renamed to `memory-setup`;
`repo-memory` repurposed as the ADR skill; `plans/architecture/` established as the ADR
store; `fix-memory` authored. See `plans/architecture/2026/2026-08.md` ADR-0001..0004.

Phases 1 and 2 below remain the live work.

---

## Why

MemPalace was retired from routing on 2026-08-01 (see
[`project-two-store-memory-supersedes-mempalace.md`](../../.claude/memory/project-two-store-memory-supersedes-mempalace.md)).
Documentation now says so, but the **code still ships it**. The gap between what the
docs claim and what the plugin installs is the actual problem this plan closes.

Four skills and one MCP registration still front MemPalace:

| Artifact | Lines | Ours or vendored |
|---|---|---|
| `skills/memory/SKILL.md` | 49 | **vendored** — synced by `scripts/sync-mempalace.sh` + `patch-mempalace.sh` |
| `skills/memory-search/SKILL.md` | 21 | ours |
| `skills/memory-mine/SKILL.md` | 28 | ours |
| `skills/memory-status/SKILL.md` | 20 | ours |
| `.claude-plugin/.mcp.json` | — | **registers `memory` → `uvx mempalace-mcp` for every installer** |

Plus: 4 `marketplace.json` entries, 4 rows in `onboarding/skills-list.md`,
`scripts/sync-mempalace.sh`, `scripts/patch-mempalace.sh`, and references in
`tests/test_evolve.test.ts`, `scripts/evolve/evals.ts`, `hooks/stop-hook.sh`.

### The two facts that decide the approach

**1. The MCP registration is the real cost.** `.claude-plugin/.mcp.json` ships a server
named `memory` pointing at `uvx mempalace-mcp` to *everyone* who installs huhhb. A
generic name plus a retired backend means every installer carries a tool surface the
project no longer routes to. This is the highest-value item and it is independent of
what happens to the skills.

**2. `skills/memory/SKILL.md` cannot simply be rewritten.** AGENTS.md:145 marks it
vendored — "synced via `./scripts/sync-mempalace.sh`… do not edit directly; refine
upstream." Rewriting it to front Hindsight would either be silently reverted by the next
sync, or require abandoning the vendoring relationship. Any option that involves editing
that file must say which.

---

## Options

### A. Retire — remove the four skills and the MCP registration *(recommended)*

Delete the four skills, their manifest entries and list rows, the MCP registration, and
both sync scripts.

- **For:** removes the docs-versus-code gap entirely; stops shipping a retired backend to
  every installer; resolves the vendoring constraint by ending the relationship rather
  than working around it; the replacement skills already exist and are better specified.
- **Against:** anyone with MemPalace data loses the in-plugin path to it. Mitigated —
  MemPalace remains independently installable (`uv tool install mempalace`) with its own
  CLI, and the data lives outside this repo. Nothing is destroyed by removing a skill.
- **Note:** users' local MemPalace installs and data are untouched. This is a
  *marketplace* change, not a machine change.

### B. Deprecate in place — keep the skills, drop the MCP registration

Leave the four skills with a deprecation banner; remove only the `.mcp.json` entry so the
server is opt-in.

- **For:** smallest diff; preserves an in-plugin read path for existing data.
- **Against:** keeps four skills competing for trigger matching against `repo-memory`,
  `memory-onboarding` and `memory-setup` — the `memory-*` prefix is exactly
  what a user types when they mean the current system. Leaves the vendoring constraint
  unresolved and the docs-versus-code gap only half closed.

### C. Repoint — rewrite the four skills to front the two stores

- **Against, decisively:** the ground is already covered. `memory-setup`
  (install/repair/verify), `memory-onboarding` (health), `repo-memory` (repo-scoped) and
  `repo-kickstart` (per-repo init) exist and are specified. Repointing would create four
  more skills competing for the same triggers — the duplicate-source-of-truth failure the
  two-store architecture was adopted to avoid. It also requires editing a vendored file.

**Recommendation: A**, with the `.mcp.json` removal split out so it can land first and
alone if the skill removal needs more discussion.

---

## Phases

Each phase ends with a validation gate. Phase 1 is independently shippable.

### 1. Stop shipping the MemPalace MCP server

- [ ] 1.1 Remove the `memory` server from `.claude-plugin/.mcp.json`
- [ ] 1.2 Check whether `.mcp.json` becoming empty (`{"mcpServers":{}}`) is valid for the
      plugin loader, or whether the file should be deleted — verify, do not assume
- [ ] 1.3 Grep `hooks/`, `scripts/evolve/`, `buhhdy/` for anything invoking the `memory`
      MCP tools by name; a dangling call is worse than a registered server
- [ ] 1.4 **Gate:** install the plugin from the branch into a scratch profile, start a
      session, confirm no `memory` MCP server is registered and no tool call fails

### 2. Remove the four skills

- [ ] 2.1 Delete `skills/memory/`, `skills/memory-search/`, `skills/memory-mine/`,
      `skills/memory-status/`
- [ ] 2.2 Remove their four `marketplace.json` entries and four
      `onboarding/skills-list.md` rows (including the "MemPalace (retired from routing)"
      section header)
- [ ] 2.3 Delete `scripts/sync-mempalace.sh` and `scripts/patch-mempalace.sh`
- [ ] 2.4 Update `AGENTS.md`:145 — remove the vendored-memory-skill rule; keep the
      caveman vendoring rule
- [ ] 2.5 Update `AGENTS.md`:185 Key Files — drop both scripts
- [ ] 2.6 Fix `tests/test_evolve.test.ts`, `scripts/evolve/evals.ts`,
      `hooks/stop-hook.sh`, `tests/bench/memory-onboarding.json` where they name the
      removed skills. **Read each first** — some references are strata descriptions that
      remain true, not calls that break
- [ ] 2.7 **Gate:** `node scripts/skill-lint.ts` reports 49 skills, 0 FAIL, no new
      baseline debt; `node --test tests/*.test.ts` no worse than before

### 3. Close the trigger gap

Removing four `memory-*` skills frees trigger surface. Confirm the survivors claim it.

- [ ] 3.1 Add "remember this", "what do we know about", "search my memory",
      "memory status" to the negative-trigger lists of whichever survivor should NOT
      match, and the positive list of whichever should
- [ ] 3.2 **Gate:** `node scripts/skill-bench.ts memory-setup` — trigger precision
      and recall both 1.0, measured, with the pre-existing `.claude/skills/` BMAD
      contamination noted in the result

### 4. Fix the surviving diagnostic skill — OBSOLETE, DO NOT EXECUTE

> **This entire phase is obsolete.** `memory-onboarding` was deleted outright (ADR-0002)
> rather than repaired; its checks moved to `memory-setup` Phase 5, `evolve-status`, and
> `repo-kickstart`'s verification checklist. The tasks below are kept as the record of what
> was planned and why it was dropped. Every one of them references a skill that no longer
> exists — none can be run.

`memory-onboarding` is the "is my memory set up right?" entry point and it currently
diagnoses the **wrong system**. Its matrix is M1 MemPalace / M2 evolve+Honcho / M3
capture hooks / M4 buhhdy config floor — there is **no row for either of the two stores**,
so the skill can report a clean bill of health on a machine where the current memory
architecture is absent or broken. This is a functional gap, not a stale label, which is
why it is here rather than in the documentation sweep.

- [ ] 4.1 Capture a RED baseline first — run the skill on a machine with the two stores
      deliberately broken and confirm it reports healthy. That failure is the test
- [ ] 4.2 Replace M1 (MemPalace) with two rows: the code graph (indexed, containment root
      set, `auto_index` on) and the experience store (reachable, bank exists, `sync_retain`
      round-trips). Reuse `memory-setup`'s own checks — orchestrate, never
      reimplement, which is this skill's stated contract
- [ ] 4.3 Drop "four-strata" from the description and body; the count changes and a
      hardcoded number goes stale on the next stratum change
- [ ] 4.4 M4 (buhhdy config floor) depends on the buhhdy removal — coordinate, do not
      guess. If buhhdy is gone, the row goes with it
- [~] 4.5 **OBSOLETE** (skill deleted; fixture removed with it) — was: update `tests/bench/memory-onboarding.json`, which still asserted MemPalace
      behaviour
- [ ] 4.6 **Gate:** re-run 4.1's broken-machine scenario and confirm it now reports the
      failure; `node scripts/skill-bench.ts memory-setup` beats its skill-disabled
      baseline

### 5. Documentation reconciliation

- [ ] 5.1 README — delete the "Legacy memory skills" subsection and the pointer to this
      plan
- [ ] 5.2 `KICKSTART.md` — drop the legacy `mempalace` prerequisite bullet
- [ ] 5.3 `AGENTS.md`:243 — the "retired from routing" note becomes "removed in
      `<version>`"; keep the link to the supersedes memory as history
- [ ] 5.4 `.claude/memory/` — supersede rather than delete
      `project-mempalace-architecture.md`, per the repo-memory Record Contract
      (supersede-never-edit)
- [ ] 5.5 **Gate:** `git grep -i mempalace` returns only historical plans under
      `plans/development/` and superseded memory records — no live docs, no code

### 6. Out of scope for this plan

- [ ] 6.1 **buhhdy** — `config.yaml`, `README.md` and `core-workflows/SKILL.md` still
      name MemPalace as the user-memory system of record and probe for it in the roster
      preflight. **Deliberately untouched:** buhhdy is being removed from this repo, with
      its practices carried to another project. Any memory-reference fix there belongs to
      that migration, not this one

---

## Risks

- **Someone is using the skills.** Low but non-zero. Removal is reversible from git, and
  MemPalace itself stays installable and installed; only the in-plugin path goes.
- **A dangling MCP call.** Phase 1.3 exists specifically for this. A removed server plus
  a surviving call is a runtime failure, which is worse than the status quo.
- **Trigger vacuum.** Four skills owning "memory" phrasings disappear at once. Phase 3
  measures rather than assumes the survivors pick them up.
- **Bench contamination.** Trigger numbers remain provisional while `.claude/skills/`
  holds ~50 auto-loading BMAD skills, untracked and unignored. Note it in results; do not
  present a contaminated measurement as clean.

## Verification

Done when: `git grep -i mempalace` is limited to historical plans and superseded memory
records; `skill-lint` is 0 FAIL at 49 skills; a scratch-profile install registers no
`memory` MCP server; and `memory-setup` measures 1.0 trigger precision and recall.
