## 1. Make the server opt-in

- [ ] 1.1 Re-confirm the grep before editing: every named `mempalace_*` tool
      invocation lives inside the four `memory-*` skills. `hooks/stop-hook.sh`
      calls the **CLI** (`mempalace status`, already guarded
      `2>/dev/null || true`); `scripts/evolve/evals.ts` hits are fixture
      transcript strings. Neither breaks when the registration goes
- [ ] 1.2 Remove the `memory` server entry from `.claude-plugin/.mcp.json`
- [ ] 1.3 Determine whether an empty `{"mcpServers":{}}` is valid for the plugin
      loader or whether the file must be deleted — verify against the loader, do
      not assume
- [ ] 1.4 **Gate:** a fresh profile registers no `memory` server — proves *A
      retired store's server is absent from a fresh install*

## 2. Give the surviving skills a stated prerequisite

This is what keeps step 1 from creating the dangling call it exists to avoid.
Their **descriptions** are already correct (`a7d2a4a`) and are not re-edited —
only the bodies gain the prerequisite.

- [ ] 2.1 Add a short prerequisite block to each of `skills/memory/`,
      `memory-search/`, `memory-mine/`, `memory-status/`: the tools require the
      `memory` MCP server, which is opt-in since this change, plus the exact
      config block to add
- [ ] 2.2 Write the opt-in block once, in one place, and have the four skills
      point at it — four copies of a config snippet is four things to keep in
      sync, and this repo has already had a "canonical source" drift out of the
      repository entirely
- [ ] 2.3 State the failure legibly: invoked without the server, the skill should
      report the missing prerequisite and how to add it, not surface an
      unexplained missing tool
- [ ] 2.4 **Gate:** each of the four names the prerequisite and resolves to the
      single opt-in block; `node scripts/skill-lint.ts` reports **53** skills,
      0 FAIL (the count is unchanged — nothing is removed) — proves *A legacy
      skill names what it needs* and *Invoking a legacy skill without its server
      fails legibly*

## 3. Confirm the routing separation still holds

The coexistence this change chooses is only safe while retired skills stay off
current phrasings. That is true today; this phase proves it rather than assuming
it.

- [ ] 3.1 Verify each of the four descriptions still opens with its LEGACY
      marker and routes onward by name. Do **not** rewrite them — confirm and
      record
- [ ] 3.2 Add the current-system phrasings ("remember this", "what do we know
      about", "search my memory", "memory status") to the negative-trigger lists
      of the retired skills, and the positive lists of whichever current skill
      owns each
- [ ] 3.3 Note the measurement caveat with any number produced: ~50 untracked
      auto-loading skills in `.claude/skills/` contaminate every trigger figure
- [ ] 3.4 **Gate:** a trigger run shows current phrasings routing to the current
      system and the retired skills reachable only by name, reported with the
      contamination caveat attached — proves *A current-system phrasing routes to
      the current system* and *A retired skill is reachable by name*

## 4. Reconcile the documentation

- [ ] 4.1 `AGENTS.md` — MemPalace is opt-in, not shipped; the routing policy
      states which stores are registered, which are opt-in, which are current
- [ ] 4.2 `README.md` and `KICKSTART.md` — same distinction wherever they
      describe what an installer receives
- [ ] 4.3 `.claude/memory/project-two-store-memory-supersedes-mempalace.md` —
      this change **agrees** with that record ("retired from routing, not
      deleted"), so it is confirmed rather than superseded. Append the opt-in
      detail so it stays accurate about *how* MemPalace is now reached
- [ ] 4.4 Bump the version in **both** `marketplace.json` and
      `.claude-plugin/plugin.json` at PR-open per AGENTS.md — removing shipped
      surface is a minor bump with the patch value carried over
- [ ] 4.5 **Gate:** the manifest, the routing policy and the skill descriptions
      agree on which stores are registered, opt-in and current — proves *The
      manifest and the docs tell the same story*

## 5. Close out

- [ ] 5.1 Record that the four skills, the sync scripts and the vendoring
      relationship are all deliberately retained, and why — so a reviewer does
      not read their survival as an incomplete retirement
- [ ] 5.2 Record the reverse risk plainly: a user who relied on the shipped
      registration loses their MemPalace tools on update until they add the
      opt-in block. That is the cost this change accepts in exchange for not
      imposing a store on everyone
- [ ] 5.3 Confirm `buhhdy/` was left untouched and say why (removal pending
      elsewhere)
- [ ] 5.4 **Gate:** `node scripts/skill-lint.ts` 0 FAIL at 53 skills,
      `node --test tests/*.test.ts` green, `openspec validate --all --store
      huhhb` green, and every scenario in `specs/memory-routing/spec.md`
      exercised by a gate above
