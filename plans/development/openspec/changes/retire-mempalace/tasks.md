## 1. Stop shipping the MCP server

Independently shippable, and deliberately first: it is the highest-value item and
does not depend on what happens to the skills.

- [ ] 1.1 Grep `hooks/`, `scripts/evolve/` and `buhhdy/` for invocations of the
      `memory` MCP tools by name. Read each hit — some are strata *descriptions*
      that stay true, not calls that break. Record which is which before editing
      anything
- [ ] 1.2 Remove the `memory` server entry from `.claude-plugin/.mcp.json`
- [ ] 1.3 Determine whether an empty `{"mcpServers":{}}` is valid for the plugin
      loader or whether the file must be deleted — verify against the loader, do
      not assume
- [ ] 1.4 **Gate:** install the plugin from this branch into a scratch profile,
      start a session, and confirm no `memory` MCP server is registered and no
      tool call fails — proves *A retired store is absent from a fresh install*
      and *A scratch-profile session completes without a failed tool call*

## 2. Remove the four skills

- [ ] 2.1 Delete `skills/memory/`, `skills/memory-search/`, `skills/memory-mine/`
      and `skills/memory-status/`
- [ ] 2.2 Delete `scripts/sync-mempalace.sh` and `scripts/patch-mempalace.sh` in
      the same commit as the skills — the vendored `skills/memory/SKILL.md` is
      recoverable from either git or the sync script, and removing them together
      keeps that true until the moment both are gone
- [ ] 2.3 Remove the four `marketplace.json` entries and the four
      `onboarding/skills-list.md` rows, including the "MemPalace (retired from
      routing)" section header
- [ ] 2.4 Update `AGENTS.md`: drop the vendored-memory-skill rule (keep the
      caveman vendoring rule) and drop both scripts from Key Files
- [ ] 2.5 Fix `tests/test_evolve.test.ts`, `scripts/evolve/evals.ts` and
      `hooks/stop-hook.sh` where they name the removed skills, using the
      call-versus-description determination from 1.1
- [ ] 2.6 **Gate:** `node scripts/skill-lint.ts` reports 49 skills with 0 FAIL and
      no new baseline debt; `node --test tests/*.test.ts` is no worse than before
      — proves *Removing a store leaves no dangling invocation*

## 3. Reconcile the freed trigger surface

Four `memory-*` skills disappearing at once frees the phrasings they matched.
Confirm the survivors claim them rather than assuming it.

- [ ] 3.1 Decide, per freed phrasing — "remember this", "what do we know about",
      "search my memory", "memory status" — which surviving skill should own it,
      and add it to that skill's positive triggers and to the negative triggers
      of the skills that should not match
- [ ] 3.2 Note the `.claude/skills/` contamination in the result: ~50 untracked
      auto-loading BMAD skills are present, so any activation number taken now is
      provisional and must be labelled as such
- [ ] 3.3 **Gate:** `node scripts/skill-bench.ts memory-setup` measures trigger
      precision and recall, reported with the contamination caveat attached —
      proves *A freed phrasing routes to the surviving owner* and *Contaminated
      activation measurements are reported as such*

## 4. Reconcile the documentation

- [ ] 4.1 `README.md` — delete the "Legacy memory skills" subsection and the
      pointer to the superseded migration plan
- [ ] 4.2 `KICKSTART.md` — drop the legacy `mempalace` prerequisite bullet
- [ ] 4.3 `AGENTS.md` — the "retired from routing" note becomes "removed in
      `<version>`"; keep the link to the supersedes record as history
- [ ] 4.4 Supersede rather than edit `.claude/memory/project-mempalace-architecture.md`,
      per the repo-memory Record Contract
- [ ] 4.5 Bump the version in **both** `marketplace.json` and
      `.claude-plugin/plugin.json` — a removal of shipped surface is a minor bump
      with the patch value carried over
- [ ] 4.6 **Gate:** `git grep -i mempalace` returns only historical plans under
      `plans/development/`, superseded memory records, and changelog entries — no
      live documentation and no shipped code, with `buhhdy/` excluded as
      deliberately out of scope — proves *A search for the retired store finds
      only history* and *Documentation and shipped code agree on what is live*

## 5. Close out

- [ ] 5.1 Confirm the out-of-scope boundary held: `buhhdy/config.yaml`,
      `buhhdy/README.md` and `buhhdy/skills/core-workflows/SKILL.md` still name
      MemPalace and are deliberately untouched — record this in the PR body so a
      reviewer does not read it as an oversight
- [ ] 5.2 Verify no user-facing destruction occurred: MemPalace remains
      installable via `uv tool install mempalace` and no local data was touched —
      proves *Local data survives the removal*
- [ ] 5.3 **Gate:** `openspec validate retire-mempalace --store huhhb` passes and
      every scenario in `specs/memory-routing/spec.md` has been exercised by a
      gate above
