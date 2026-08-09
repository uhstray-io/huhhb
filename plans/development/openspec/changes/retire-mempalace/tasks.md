## 1. Make the server opt-in

- [x] 1.1 Re-confirm the grep before editing: every named `mempalace_*` tool
      invocation lives inside the four `memory-*` skills. `hooks/stop-hook.sh`
      calls the **CLI** (`mempalace status`, already guarded
      `2>/dev/null || true`); `scripts/evolve/evals.ts` hits are fixture
      transcript strings. Neither breaks when the registration goes
- [x] 1.2 Remove the `memory` server entry from **both** places that register it:
      `.claude-plugin/.mcp.json` **and** `.claude-plugin/plugin.json`, whose
      `mcpServers` key duplicates it exactly. Neither this change's proposal nor
      the 2026-08-02 migration plan named the second one — removing only
      `.mcp.json` would have left the server shipping
- [x] 1.3 Determine whether an empty `{"mcpServers":{}}` is valid for the plugin
      loader or whether the file must be deleted — verify against the loader, do
      not assume
      → Both are valid, verified against installed plugins rather than inferred:
      `mempalace`'s own plugin ships `.mcp.json` with an empty `mcpServers` and
      loads; `caveman` ships no such file at all. **Deleted** rather than
      emptied: `plugin.json` already supports `mcpServers`, so an empty
      `.mcp.json` would be a file that exists to say nothing, and removing it
      leaves exactly one place to register a server if that ever changes
- [x] 1.4 **Gate:** a fresh profile registers no `memory` server — proves *A
      retired store's server is absent from a fresh install*
      → **partially verified.** The shipped manifest registers nothing in either
      place, and the regression test now asserts that. A scratch-profile install
      was not run — same constraint as every live gate on this branch

## 2. Give the surviving skills a stated prerequisite

This is what keeps step 1 from creating the dangling call it exists to avoid.
Their **descriptions** are already correct (`a7d2a4a`) and are not re-edited —
only the bodies gain the prerequisite.

- [x] 2.1 Add a short prerequisite block to each of `skills/memory/`,
      `memory-search/`, `memory-mine/`, `memory-status/`: the tools require the
      `memory` MCP server, which is opt-in since this change, plus the exact
      config block to add
- [x] 2.2 Write the opt-in block once, in one place, and have the four skills
      point at it — four copies of a config snippet is four things to keep in
      sync, and this repo has already had a "canonical source" drift out of the
      repository entirely
- [x] 2.3 State the failure legibly: invoked without the server, the skill should
      report the missing prerequisite and how to add it, not surface an
      unexplained missing tool
- [x] 2.4 **Gate:** each of the four names the prerequisite and resolves to the
      single opt-in block; `node scripts/skill-lint.ts` reports **53** skills,
      0 FAIL (the count is unchanged — nothing is removed) — proves *A legacy
      skill names what it needs* and *Invoking a legacy skill without its server
      fails legibly*
      → 53 skills / 0 FAIL, 232 tests pass. All four point at the single
      `skills/memory/reference.md`. `patch-mempalace.sh` re-applies the block to
      the vendored skill — verified idempotent, and verified to restore it
      byte-identically after a simulated sync stripped it

## 3. Free the trigger surface — the work `a7d2a4a` was believed to have done

`a7d2a4a` rewrote the four descriptions in `marketplace.json`. The `SKILL.md`
frontmatter still carries the originals, and the frontmatter is what an agent is
handed at session start — so the retirement is currently a claim the runtime does
not honour. This phase is a rewrite, not a confirmation.

- [x] 3.1 Verify once more which surface governs matching before editing: compare
      this session's skill list against both copies. The list showed the
      frontmatter text verbatim; do not take that on trust from this task
      → confirmed: the list shows `memory-mine` as "Mine a project directory…
      Triggers on 'mine this project'" — frontmatter verbatim, no trace of the
      marketplace LEGACY wording
- [x] 3.2 Rewrite the frontmatter `description` of `memory`, `memory-search`,
      `memory-mine` and `memory-status` to match their `marketplace.json`
      entries — LEGACY marker first, then the redirect by name. `memory` must
      also lose its "auto-triggers at session start" claim, which is the single
      most aggressive line in the four
      → **deviation, deliberate.** Copying the marketplace text verbatim would
      have added three new S4 WARNs (no trigger phrasing) and left the retired
      skills unreachable *by name*, which the spec requires. So one corrected
      description was written and applied to BOTH surfaces: LEGACY marker,
      explicit "Use when MemPalace is named explicitly", redirect, opt-in note.
      Also avoided a YAML hazard — `memory`'s marketplace text contained ": ",
      invalid in an unquoted scalar
- [x] 3.3 `skills/memory/SKILL.md` is overwritten by `sync-mempalace.sh`, so
      extend `patch-mempalace.sh` to re-apply its description and prerequisite
      after a sync. The other three are ours and need no patch
      → the script reads the description from `marketplace.json` rather than
      hardcoding it, so the two surfaces cannot drift again by construction.
      Verified: byte-identical restoration after a simulated sync that reset the
      description, the name, the branding and stripped the block
- [~] 3.4 Add the current-system phrasings ("remember this", "what do we know
      about", "search my memory", "memory status") to the negative-trigger lists
      of the retired skills, and the positive lists of whichever current skill
      owns each
      → **partly unactionable as written, and it surfaced a real defect.** The
      four retired skills have **no bench fixtures**, so there are no negative
      lists to edit; creating four would need live baselines. And "remember
      this" / "what do we know about" route to hindsight, which is MCP tools
      governed by the routing policy — not a skill with a positive list.
      What WAS actionable: `memory-status`'s notice redirects health questions
      to `memory-setup`, which listed "is my memory set up right" as a
      **negative** — orphaned since ADR-0002 deleted `memory-onboarding`, which
      owned it. Claimed by nobody, refused by three. Moved to memory-setup's
      positives with "memory status", so the redirect lands somewhere that
      accepts it
- [x] 3.5 Note the measurement caveat with any number produced: ~50 untracked
      auto-loading skills in `.claude/skills/` contaminate every trigger figure
- [ ] 3.6 **Gate:** both copies of all four descriptions agree; a reload shows
      the LEGACY text in the session's skill list; a trigger run shows current
      phrasings routing to the current system and the retired skills reachable
      only by name, reported with the contamination caveat — proves *A
      current-system phrasing routes to the current system* and *A retired skill
      is reachable by name*
      → **partially verified.** Both copies agree (checked mechanically); lint
      53/0 FAIL with no new WARNs; 232 tests pass; openspec 20/20. NOT verified:
      a reload showing the LEGACY text in a live skill list, and a trigger run —
      the latter costs real money and every figure it produced would carry the
      `.claude/skills/` contamination caveat anyway

## 3b. Record the wider defect without absorbing it

- [x] 3b.1 Record the measurement for whoever picks it up: **28 of 51 skills**
      carry semantically different descriptions between `marketplace.json` and
      their frontmatter (6 more differ cosmetically, 17 agree). Frontmatter is
      routinely the longer of the two, several exceeding the 500-character cap
      `skill-lint` S4 enforces — on the marketplace copy
- [x] 3b.2 Record that **S4 and S11 check `entry.description` from
      `marketplace.json`, not the frontmatter that loads**, so the house
      description rules are enforced against a copy the runtime never reads
- [x] 3b.3 Route both to `skill-retrofit`, which owns per-skill debt burndown —
      **do not fix them here**. A 28-skill sweep inside a MemPalace change is how
      a scoped change becomes unreviewable
- [x] 3b.4 **Gate:** the finding is written where the retrofit will see it, and
      this change still touches only the four memory skills

## 4. Reconcile the documentation

- [x] 4.1 `AGENTS.md` — MemPalace is opt-in, not shipped; the routing policy
      states which stores are registered, which are opt-in, which are current
- [x] 4.2 `README.md` and `KICKSTART.md` — same distinction wherever they
      describe what an installer receives
- [x] 4.3 `.claude/memory/project-two-store-memory-supersedes-mempalace.md` —
      this change **agrees** with that record ("retired from routing, not
      deleted"), so it is confirmed rather than superseded. Append the opt-in
      detail so it stays accurate about *how* MemPalace is now reached
      → appended a dated amendment rather than editing the body — `.claude/memory/`
      is retired for new writes, and the record's judgement was right. It corrects
      two of its own statements: "still shipped, still installed" (skills yes,
      server no) and "descriptions still advertise themselves" (fixed, and worse
      than it recorded — the LEGACY rewrite was invisible for eight days)
- [x] 4.4 Bump the version in **both** `marketplace.json` and
      `.claude-plugin/plugin.json` — **0.8.22 → 0.8.24**, applied.
      → Not the minor bump the task originally computed. This is an iteration
      over a large volume of patch-level work, not a new feature tier, so the
      patch counter carries it. 0.8.23 was free too; 0.8.24 was chosen
      deliberately for the volume, and skipping a number has precedent here —
      the tag series already jumps v0.8.20 → v0.8.22.
      → AGENTS.md puts the bump at PR-open; applied now because `origin/main`
      is at 0.8.22 with nothing else in flight to race it, and pr-shepherd
      re-bumps at merge if main moves first. That reconciliation is exactly
      what the policy anticipates.
- [x] 4.5 **Gate:** the manifest, the routing policy and the skill descriptions
      agree on which stores are registered, opt-in and current — proves *The
      manifest and the docs tell the same story*
      → verified mechanically: plugin registers nothing in either place; all
      three docs use the same "opt-in" vocabulary and link to the one block;
      all four descriptions say opt-in; lint 53/0 FAIL (S7 proves every link
      resolves), 232 tests, openspec 20/20

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
