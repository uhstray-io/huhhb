> **Test harness.** RED/GREEN runs use the repo's own A/B harness —
> `tests/bench/<skill>.json` scenarios executed by `node scripts/skill-bench.ts <skill>`,
> which compares skill-enabled against a skill-disabled baseline. Dispatched subagents
> are NOT used. Baseline transcripts land in the session scratchpad and their verbatim
> rationalizations are the only permitted source for the rationalization tables in
> tasks 2.4 and 3.5.

## 1. RED — baselines before any authoring (Iron Law)

- [ ] 1.1 Write the three `explaining-changes` pressure scenarios: (a) a change that
      invites edit-log framing, (b) a change that invites vague summary, (c) a
      value-only change that must still produce a delta diagram
- [ ] 1.2 Write the three `user-kickstart` pressure scenarios: (a) "set up how Claude
      talks to me" must run the skill, (b) "audit the CLAUDE.md files in this repo" must
      route to `claude-md-improver` and NOT start an interview, (c) time pressure —
      "I'm in a hurry, just write it" — must not skip the diff gate
- [ ] 1.3 Run all six WITHOUT the skill/section present (baseline/RED); capture
      transcripts and the verbatim vague, report-framed, and gate-skipping
      rationalizations to the scratchpad
- [ ] 1.4 Validation gate: confirm every scenario actually failed at baseline; any that
      passed without the skill is not a test and is rewritten or dropped before
      authoring begins

## 2. Canonical anatomy owner (voice-profile-routing, part 1)

- [ ] 2.1 Author `skills/user-kickstart/reference.md` §Anatomy: the five sections
      (identity, voice defaults, patterns to use, anti-patterns, context shifts) with a
      rendered example block, marked as the canonical definition
- [ ] 2.2 Author `reference.md` §Banned phrases: the single shared list — vagueness bans
      (*the codebase*, *various files*, *several changes*, *the system*, *improved error
      handling*, *refactored the logic*, *updated the config*, *better performance*,
      *cleaner*, *more robust*, *some edge cases*) and AI-tell bans (`Moreover`,
      `Furthermore`, `Additionally`, `In conclusion`, `Successfully…`, `Let me…`,
      `I'll now…`, emoji) — marked as the owner copy that `explaining-changes` cites
- [ ] 2.3 Author `reference.md` §Routing: the three-part test, the CLAUDE.md-vs-`personal`
      table, the project-bank carve-out, and the never-retain list restated from the
      user's two-store policy
- [ ] 2.4 Author `reference.md` §Block template: the `BEGIN`/`END` marker pair verbatim,
      the 60-line cap, and the backup/diff/marker-scope write contract
- [ ] 2.5 Author `reference.md` §Interview: the ten questions with their per-answer
      destination tagging, and §Evidence: the five bounded sources with their limits
- [ ] 2.6 Validation gate: re-read §Banned phrases against §Anatomy's example block and
      confirm no rule contradicts its adjacent example — proves
      `explaining-changes-voice` scenario "The paired example is present and normative"
      has a consistent source to cite

## 3. explaining-changes voice (GREEN)

- [ ] 3.1 Add `## 7. Voice` to `skills/explaining-changes/principles.md`: identity, voice
      defaults, patterns to use, anti-patterns (citing `user-kickstart/reference.md` by
      plain relative path, never an `@`-link, and not copying the list), context shifts
      by change type, the secret carve-out, and the ordered override chain
- [ ] 3.2 Add the normative ✗ report / ✗ vague / ✓ accepted paired example to §7
- [ ] 3.3 Invert `principles.md` §3: diagram default-on, skip only when nothing to draw
      and say so, before → after with the changed node marked; keep ASCII, single-level,
      ≤6 nodes, prose-introduced
- [ ] 3.4 Raise the ceiling to five sentences in `principles.md` §4 **and**
      `SKILL.md` §"Default depth" and §"Core ruleset (summary)"; add the §Voice summary
      line to `SKILL.md`
- [ ] 3.5 Add §7's red-flags list, every entry traced to a verbatim rationalization from
      the 1.3 transcripts
- [ ] 3.6 Re-run scenarios 1.1(a)–(c) WITH §7 (GREEN); close any new rationalization
      loophole and re-test until clean
- [ ] 3.7 Validation gate: confirm both files state five sentences and neither retains
      four — proves `explaining-changes-voice` scenario "The ceiling is consistent
      across both files"
- [ ] 3.8 Commit

## 4. user-kickstart skill (user-voice-profile, GREEN)

- [ ] 4.1 Author `skills/user-kickstart/SKILL.md`: frontmatter with `name` and a
      single-line `description` of triggers and symptoms ONLY — no phase list, no phase
      count, no mention of interviewing/auditing/routing as procedure, no `triggers:`
      field
- [ ] 4.2 Author the `SKILL.md` body: the five ordered phases as a skeleton, the four
      named handoffs, the three gates, and plain-relative-path citations into
      `reference.md` for the questions, sources, routing test, and write contract
- [ ] 4.3 Wire phase 5 to the `reference.md` write contract (backup path reported,
      marker-scoped replacement, diff before write, `sync_retain` batch shown for
      approval with its count)
- [ ] 4.4 Verify the `SKILL.md` body is under `skill-lint`'s 6000-character
      `BODY_WARN_CHARS` threshold; move prose to `reference.md` if it is not
- [ ] 4.5 Add the rationalization table and red-flags list for the three discipline
      rules, every row traced to a verbatim rationalization from the 1.3 transcripts
- [ ] 4.6 Re-run scenarios 1.2(a)–(c) WITH the skill (GREEN); close loopholes, re-test
- [ ] 4.7 Validation gate: run scenario 1.2(b) and confirm the skill names
      `claude-md-improver` without starting an interview — proves `user-voice-profile`
      scenario "A repo-audit request is routed away"
- [ ] 4.8 Commit

## 5. Registration and gates

- [ ] 5.1 Add the `user-kickstart` entry to `marketplace.json` as existing skills are
      registered (name, path, description, category, tags, version)
- [ ] 5.2 Add the `user-kickstart` line to `onboarding/skills-list.md`
- [ ] 5.3 Author `tests/bench/user-kickstart.json` from the 1.2 scenarios, including an
      explicit `budget` block and a `triggers` object whose `negative` array carries
      phrasings belonging to `claude-md-improver`, `/revise-claude-md`, `update-config`,
      and `two-store-memory-setup`
- [ ] 5.4 Author `tests/bench/explaining-changes.json` from the 1.1 scenarios with its
      own `budget` block (new file; none exists today)
- [ ] 5.5 Run `node scripts/skill-lint.ts`; fix any new failure, add nothing to
      `scripts/skill-lint-baseline.json`
- [ ] 5.6 Run `node scripts/skill-bench.ts user-kickstart`; confirm it beats the
      skill-disabled baseline and that trigger precision and recall are both 1.0
- [ ] 5.7 Validation gate: `skill-lint` reports zero new failures and both registration
      files contain the skill — proves `user-voice-profile` scenario "Registration is
      complete before merge"
- [ ] 5.8 Commit

## 6. Verification and close-out

- [ ] 6.1 Idempotency proof on a scratch copy of `~/.claude/CLAUDE.md` containing the
      existing two-store routing block: run the write twice with identical answers,
      diff both results, confirm byte-identical and the routing block untouched —
      proves `voice-profile-routing` scenarios "A second identical run changes nothing"
      and "An existing unrelated block survives a re-run"
- [ ] 6.2 Cap proof: force a 70-line resolved rule set on the scratch copy, confirm the
      write is blocked and a prune is requested — proves "An oversized block blocks the
      write"
- [ ] 6.3 Audit-honesty proof: run the audit against a **genuinely** unauthenticated
      real `gh` — `env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=<empty dir>` — and
      confirm the PR source is reported unreachable with authentication named as the
      reason, and that the remaining sources are not presented as complete coverage.
      Proves "An unreachable source is reported, not hidden".
      **Do not shim `gh`.** A fake binary earlier on `PATH` was detected, traced to the
      real one, and routed around; the skill was correct and the test measured nothing.
- [ ] 6.4 Run `openspec validate voice-anatomy-layer --store huhhb`
- [ ] 6.5 Run `evolve-map`; confirm `user-kickstart` registers with no unflagged overlap
      against `claude-md-improver`, `memory-onboarding`, `onboarding`, or
      `two-store-memory-setup`
- [ ] 6.6 Open the PR with pressure-test and idempotency evidence; after human merge,
      archive this change (`openspec archive voice-anatomy-layer --store huhhb`)
