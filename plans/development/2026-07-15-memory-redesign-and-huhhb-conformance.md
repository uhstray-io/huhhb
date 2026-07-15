# Memory Redesign + huhhb Conformance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Retire buhhdy's bespoke `buhhdy/memory/` store in favour of the hierarchy **user (MemPalace) → team (Honcho/evolve) → buhhdy config defaults (`config.yaml` + `MODEL-MANIFEST.md`)**, make `repo-kickstart` idempotent + registry-free, and finish huhhb's own conformance (AGENTS.md becomes complete; CLAUDE.md becomes a one-line pointer).

**Architecture:** buhhdy config is the always-present defaults floor; MemPalace (user prefs) and Honcho (team prefs) are optional overlays consulted only if present, with precedence user → team → config. No conformance registry/tracking — conformance is applied on-demand per repo. Repo registrations are dropped entirely.

**Tech Stack:** Markdown + YAML (buhhdy config/docs/skills), the `memory` (MemPalace) MCP for the user-pref migration, Node/TS lint (`node scripts/skill-lint.ts`), `openspec validate`.

**Delivery:** two PRs off `main` — **PR-1 (Part A, memory redesign)** and **PR-2 (Part B, huhhb conformance)** — because Part B's AGENTS.md Repo-Memory section documents the model Part A establishes (B depends on A landing first). Each cross-reviewed per house rules.

---

## File Structure (what each task touches)

**Part A — memory redesign**
- `buhhdy/MODEL-MANIFEST.md` — absorb the 4 calibration records unique to `providers.md`.
- `buhhdy/memory/providers.md`, `subscriptions.md`, `repos.md`, `MEMORY.md` — **deleted** (dir removed).
- `buhhdy/config.yaml` — rewrite the `## Memory (four systems)` block, roster-preflight read, Subscription Tier Interview source, and the calibration-notes pointer.
- `buhhdy/README.md` — update the Structure section (no more `memory/`).
- `skills/repo-kickstart/SKILL.md` + `reference.md` — step 4: drop the buhhdy-registry write.
- `skills/repo-memory/SKILL.md:118` — remove the incidental `buhhdy/memory/MEMORY.md` example.
- MemPalace (via `memory` skill) — new home for the 2 subscription records.

**Part B — huhhb conformance**
- `AGENTS.md` — absorb CLAUDE.md-unique content (Key Files, Marketplace Manifest, Onboarding, Repo-Memory detail — reflecting the new model).
- `CLAUDE.md` — slim to a one-line pointer.
- `plans/memory.md` — seed one observational entry.
- `KICKSTART.md` — confirm the branch-protection one-time-admin commands are present (already added by the fleet audit); emit for the human.

---

# PART A — buhhdy memory redesign  (→ PR-1)

### Task A1: Preserve provider calibration, retire `providers.md`

**Files:** Modify `buhhdy/MODEL-MANIFEST.md`; Delete `buhhdy/memory/providers.md`.

- [ ] **Step 1 — extract the 4 unique records.** From `buhhdy/memory/providers.md`, the records dated **2026-06-01, 2026-07-09, 2026-07-14, 2026-10-16** are NOT in `MODEL-MANIFEST.md` (verified). Read each in full.
- [ ] **Step 2 — fold them into `MODEL-MANIFEST.md`.** Add them as dated `**Updated <date>:**` calibration entries in the manifest's existing dated-directives block (top of file), matching the existing entry style. Preserve their `statement`/`evidence` substance verbatim (e.g. the 2026-10-16 gemini-2.5 shutdown-window fact, the 2026-06-01 gemini-2.0-flash-lite shutdown).
- [ ] **Step 3 — verify no calibration fact is lost.** Run:
```bash
for d in 2026-06-01 2026-07-09 2026-07-14 2026-10-16; do echo -n "$d in manifest: "; grep -q "$d" buhhdy/MODEL-MANIFEST.md && echo yes || echo MISSING; done
```
Expected: all `yes`.
- [ ] **Step 4 — delete `providers.md`.** `git rm buhhdy/memory/providers.md`.
- [ ] **Step 5 — commit.** `git add -A && git commit -m "refactor(buhhdy): fold provider calibration into MODEL-MANIFEST, retire providers.md"`

### Task A2: Migrate subscription records to user memory (MemPalace)

**Files:** MemPalace (via `memory` skill); Delete `buhhdy/memory/subscriptions.md`.

- [ ] **Step 1 — verify MemPalace is initialized.** Invoke the `memory` (or `mempalace:status`) skill / `mempalace_status`. If NOT initialized or unreachable → **HALT this task, do not delete `subscriptions.md`**, report to the human (they must set up MemPalace or choose to keep subscriptions in config as a documented default). The two records must not be lost.
- [ ] **Step 2 — store both records as user preferences** via the memory skill's save flow (never a raw file write). Content to store (both records from `subscriptions.md`, verbatim substance):
  - `2026-07-09` / all-providers: Claude Max (~$125/mo flat); Codex/ChatGPT team-business; Gemini team-business (keeps legacy gemini CLI access); OpenCode = metered OpenRouter credits (no subscription).
  - `2026-07-08` / anthropic: claude-fable-5 is outside Claude Max — separate ANTHROPIC_API_KEY, per-token ($10/$50 per MTok).
  Tag them as user-scoped subscription/billing preferences so the Subscription Tier Interview can retrieve them.
- [ ] **Step 3 — verify retrieval.** Search MemPalace for the stored subscription record; confirm both tiers + the Fable billing fact come back.
- [ ] **Step 4 — delete `subscriptions.md`.** `git rm buhhdy/memory/subscriptions.md`.
- [ ] **Step 5 — commit.** `git commit -m "refactor(buhhdy): move subscription tiers to user memory (MemPalace), retire subscriptions.md"`

### Task A3: Rewire `buhhdy/config.yaml` to the new hierarchy

**Files:** Modify `buhhdy/config.yaml` (roster preflight ~L61; Subscription Tier Interview ~L70/78/98/102; `## Memory (four systems)` block ~L114+; calibration pointer ~L228).

- [ ] **Step 1 — roster preflight (~L61).** Replace the "read buhhdy-global memory: the bundle's `memory/MEMORY.md` index plus each listed store's ACTIVE records" instruction with: read the applicable overlays if present — **user memory (MemPalace) → team memory (Honcho/evolve)** — falling back to the config defaults (`MODEL-MANIFEST.md` + this file). Keep the "act in the same turn" discipline.
- [ ] **Step 2 — Subscription Tier Interview (~L70–L102).** Change "system of record" from `memory/subscriptions.md` to **user memory (MemPalace)**: quote the latest user-memory subscription record for read-then-confirm; on change, write back through the memory skill. Remove every `memory/subscriptions.md` mention (L70, L78, L98, L102). If MemPalace is absent, the interview cold-asks (existing fallback) — state that explicitly.
- [ ] **Step 3 — `## Memory (four systems)` block (~L114+).** Rewrite to the three-tier model: **1) user (MemPalace) — user preferences; 2) team (Honcho/evolve) — team preferences; 3) buhhdy config (`config.yaml` + `MODEL-MANIFEST.md`) — provider-mapping defaults, always present.** State resolution precedence user → team → config, and that user/team are optional overlays (degrade gracefully when unconfigured). Remove the `buhhdy-global (memory/…)` stratum and all references to `providers.md`/`subscriptions.md`/`repos.md`/`MEMORY.md`.
- [ ] **Step 4 — calibration-notes pointer (~L228).** Remove the "these dated notes now also exist as structured records in `memory/providers.md`… the calibration-refresh skill owns retiring this embedded copy" clause. The embedded calibration notes in `config.yaml` STAY (they are now the source, alongside `MODEL-MANIFEST.md`). Point NEW calibration confirmations at `MODEL-MANIFEST.md`.
- [ ] **Step 5 — verify no dangling references.** Run:
```bash
grep -n 'memory/MEMORY\|memory/providers\|memory/subscriptions\|memory/repos\|buhhdy-global' buhhdy/config.yaml || echo "clean ✅"
```
Expected: `clean ✅`.
- [ ] **Step 6 — commit.** `git commit -m "refactor(buhhdy): config.yaml memory model → user→team→config hierarchy"`

### Task A4: Delete the store remainder + update README

**Files:** Delete `buhhdy/memory/repos.md`, `buhhdy/memory/MEMORY.md` (dir now empty → removed); Modify `buhhdy/README.md`.

- [ ] **Step 1 — delete the registry + index.** `git rm buhhdy/memory/repos.md buhhdy/memory/MEMORY.md`. Confirm `buhhdy/memory/` no longer exists.
- [ ] **Step 2 — update `buhhdy/README.md` Structure section** — remove the `memory/` tree entry; if the README describes buhhdy-global memory, replace with a one-line pointer to the config's Memory section (user → team → config).
- [ ] **Step 3 — verify.** `grep -rn 'buhhdy/memory' buhhdy/README.md || echo clean`. Expected: `clean`.
- [ ] **Step 4 — commit.** `git commit -m "refactor(buhhdy): remove bespoke buhhdy/memory store (registry + index)"`

### Task A5: `repo-kickstart` — drop the registry write (registry-free, on-demand)

**Files:** Modify `skills/repo-kickstart/SKILL.md` (step 4), `skills/repo-kickstart/reference.md` (§4 memory), `skills/repo-memory/SKILL.md:118`. Bump `marketplace.json` + `.claude-plugin/plugin.json`.

- [ ] **Step 1 — SKILL.md step 4.** Remove the "buhhdy global registry — append a repo-registration record" bullet entirely. Memory step becomes two strata: **plans/memory.md** (per-project observational seed) and **Honcho (team, optional; env-scoped, skip if unconfigured)**. State explicitly: repo-kickstart does NOT track or register conformance anywhere; it is an idempotent on-demand conform.
- [ ] **Step 2 — reference.md §4.** Delete the "buhhdy global registry — append a repo-registration record / resolve `$HUHHB_HOME` → plugin root → `./buhhdy/memory/`" subsection and its idempotency-matrix row + any rationalization/red-flag line about the registry. Keep the plans/memory.md and Honcho subsections.
- [ ] **Step 3 — repo-memory/SKILL.md:118.** Remove the incidental example "(…the same contract governs buhhdy's own global store, `buhhdy/memory/MEMORY.md`.)" — buhhdy no longer has that store.
- [ ] **Step 4 — bump versions** in `marketplace.json` and `.claude-plugin/plugin.json` to the next patch (0.5.11 → 0.5.12), same value in both.
- [ ] **Step 5 — verify lint + no registry remnants.** Run:
```bash
node scripts/skill-lint.ts 2>&1 | grep -E 'repo-kickstart|FAIL |skills —'
grep -rn 'buhhdy/memory\|global registry\|repo-registration record' skills/repo-kickstart/ || echo "clean ✅"
```
Expected: 0 FAIL; `clean ✅`.
- [ ] **Step 6 — commit.** `git commit -m "feat(repo-kickstart): drop conformance registry — idempotent, registry-free, on-demand"`

### Task A6: Part-A verification + cross-review + PR-1

- [ ] **Step 1 — full lint + tests.** `node scripts/skill-lint.ts` (0 FAIL, no version drift); `node --test tests/test_openspec_conformance.test.ts` (4/4); `node --test tests/test_evolve.test.ts` (90/90).
- [ ] **Step 2 — no orphaned refs anywhere.** `grep -rIn 'buhhdy/memory' . --exclude-dir=node_modules --exclude-dir=.git` → only historical mentions in docs/plans if any; no live reads. Report anything found.
- [ ] **Step 3 — cross-review** the diff with a different-vendor sub-agent per house rules.
- [ ] **Step 4 — open PR-1** off `main`, description carries: the new hierarchy, what moved where (providers→MODEL-MANIFEST, subscriptions→MemPalace, repos/MEMORY deleted), and a "decisions made" note.

---

# PART B — finish huhhb conformance  (→ PR-2, after PR-1)

### Task B1: Complete `AGENTS.md` with CLAUDE.md-unique content

**Files:** Modify `AGENTS.md`. Reference (read-only): `CLAUDE.md`.

- [ ] **Step 1 — diff the two for content (not just headers).** CLAUDE.md sections with content not fully in AGENTS.md: **Key Files** (the annotated file map), **Marketplace Manifest** (the `marketplace.json` schema example), **Onboarding** (the welcome-flow note), and the **Repo Memory** detail tables (When to Save / What NOT to Save).
- [ ] **Step 2 — add a `## Key Files` section to AGENTS.md** (port CLAUDE.md's annotated list; verify each path still exists on disk before including — drop/paths-correct any stale entries).
- [ ] **Step 3 — add a `## Marketplace Manifest` section** (port the `marketplace.json` schema example).
- [ ] **Step 4 — add a brief `## Onboarding` line** (port CLAUDE.md's onboarding note).
- [ ] **Step 5 — reconcile the `## Repo Memory` section** so AGENTS.md carries the When-to-Save / What-NOT-to-Save tables AND states the **new memory model** (user→team→config; `.claude/memory/` = repo-memory per-project; no buhhdy/memory store). This is the one section that must reflect Part A.
- [ ] **Step 6 — verify** AGENTS.md now supersedes CLAUDE.md: every CLAUDE.md heading's substance is present in AGENTS.md. List any intentional omissions.
- [ ] **Step 7 — commit.** `git commit -m "docs: complete AGENTS.md as the canonical agent instructions"`

### Task B2: Slim `CLAUDE.md` to a one-line pointer

**Files:** Modify `CLAUDE.md`.

- [ ] **Step 1 — replace the body** with the pointer (keep the `# CLAUDE.md` heading):
```markdown
# CLAUDE.md

See **[AGENTS.md](AGENTS.md)** — the canonical agent operating instructions for this repo. Claude Code reads this file; it is intentionally a pointer so there is a single source of truth.
```
- [ ] **Step 2 — verify no unique content was lost.** For each former CLAUDE.md section, confirm its substance is in AGENTS.md (from B1). Run `node scripts/skill-lint.ts` (broken-link check passes; the `[AGENTS.md](AGENTS.md)` link resolves).
- [ ] **Step 3 — commit.** `git commit -m "docs: slim CLAUDE.md to a one-line pointer to AGENTS.md"`

### Task B3: Seed `plans/memory.md`

**Files:** Modify `plans/memory.md`.

- [ ] **Step 1 — append one observational log entry** under `## Log` (observational only — facts/dates/outcomes, no instructions):
```markdown
- 2026-07-15 — memory model set: user (MemPalace) → team (Honcho) → buhhdy config defaults; buhhdy/memory store retired (providers→MODEL-MANIFEST, subscriptions→MemPalace, registry dropped). repo-kickstart is now idempotent + registry-free. huhhb: CLAUDE.md slimmed to a pointer, AGENTS.md canonical.
```
- [ ] **Step 2 — commit.** `git commit -m "docs(plans): seed memory-model + conformance observation"`

### Task B4: Branch protection — emit commands (no autonomous config)

**Files:** Read `KICKSTART.md` (commands already added by the fleet audit); Verify `plans/development/00-implementation-plan.md` records the gap (it does).

- [ ] **Step 1 — confirm** `KICKSTART.md#branch-protection-one-time-admin` has the exact `gh api … --input` command and that `00-implementation-plan.md` "Open conformance gaps" records the 404. No write if already present.
- [ ] **Step 2 — emit the commands to the human** (do NOT run them): the `gh api -X PUT repos/uhstray-io/huhhb/branches/main/protection` body enabling required PR reviews. This is the pr-shepherd precondition; the human runs it.

### Task B5: Part-B verification + cross-review + PR-2

- [ ] **Step 1 — lint + validate.** `node scripts/skill-lint.ts` (0 FAIL, version drift clean); `openspec validate --all --store huhhb --no-interactive` (report result).
- [ ] **Step 2 — re-run idempotency check:** a dry-run of repo-kickstart against huhhb now reports **all ✅ / already conforming** (no registry item, since that's dropped) — confirm it's a no-op.
- [ ] **Step 3 — cross-review** the diff (different-vendor sub-agent).
- [ ] **Step 4 — open PR-2** off `main` (after PR-1 merges), description carries the verification checklist + "decisions made during merge" (CLAUDE→AGENTS reconciliation, branch-protection left for human).

---

## Self-Review (author checklist)
- **Spec coverage:** memory hierarchy ✅ (A3), providers→manifest ✅ (A1), subscriptions→MemPalace ✅ (A2), registry dropped ✅ (A4/A5), repo-kickstart registry-free ✅ (A5), CLAUDE→AGENTS ✅ (B1/B2), plans/memory seed ✅ (B3), branch protection ✅ (B4).
- **Data-loss guards:** A1 verifies all 4 calibration dates survive; A2 HALTS rather than delete subscriptions if MemPalace is unavailable.
- **Non-destruction:** every buhhdy/config + doc edit is a rewrite-in-place of the memory model, not a content wipe; deletions are only the retired store files (content migrated first).
- **Open risk:** Task A2 depends on MemPalace being initialized. If it isn't, A2 halts and the human decides (set up MemPalace, or keep subscriptions as a documented config default). Flag before starting A.
