# LESSONS.md — constraints learned from accepted work

Author: Joseph A. Wisneski IV

One continuous, append-only record of what merged work taught, so the next plan starts where the
last one ended. Failures and the rules they earned live in `docs/MISTAKES.md`; this file holds
constraints learned from work that was accepted. Entry format: `~/.claude/docs/lessons-format.md`.
A session that plans work reads this file and the `docs/MISTAKES.md` Index before cutting it.

### L-001 · 2026-11-17 · hooks

- **ACCEPTED:** PR #64, grounding nudges only on typed prompts (HUHHB-161).
- **DERIVED:** `UserPromptSubmit` fires on turns Claude Code starts by itself, not only on what a
  person types. A background-task turn arrives with a `prompt` that begins with
  `<task-notification>` (observed in the hook payload of a live headless session, 2026-11-17).
  Session transcripts record cross-session messages and CI monitor events as prompts with their
  own leading tags (`<cross-session-message …>`, `<ci-monitor-event>`). A hook that means "the
  person did something" must check the prompt's leading tag; the event alone does not say a
  person is present, and the time since the previous prompt does not say they came back.
- **APPLIES TO:** any `UserPromptSubmit` hook under `hooks/`, and any rule keyed to prompt
  timing or prompt count.

### L-002 · 2026-11-20 · skill bench

- **ACCEPTED:** PR #65, the `prune-tests` skill, forked from `caldoai/skills`, with its bench
  scenarios (HUHHB-167).
- **DERIVED:** Write a bench scenario only for a rule the model does not already follow, and find
  that out before writing the rest. Run each candidate prompt once with the skill unreachable (an
  empty working directory, the skill not installed) and keep the ones that fail. For
  `prune-tests`, the clean baseline on `claude-opus-5-5` passed both prompts that only asked for
  tests to be classified (a duplicate, a guard on removed code, a mocked unit, a derived expected
  value, a private-state assert). On the two prompts that also need production code removed
  because it existed only for a pruned test, the baseline passed 3 of 6 runs over two bench runs
  (`9dca0501`, `55f605c2`) and the skill arm 12 of 12; one unchanged prompt's baseline went from
  0 of 2 to 2 of 2.
- **APPLIES TO:** `tests/bench/<skill>.json` for any new or imported skill, and any plan that
  estimates what a skill adds.

### L-003 · 2026-11-22 · skill bench

- **ACCEPTED:** PR #66, the `humanizer` skill, forked from `blader/humanizer`, with its bench
  scenarios (HUHHB-170).
- **DERIVED:** One failing baseline run does not show that a scenario separates the two arms.
  Three `humanizer` prompts each failed their one clean baseline run before the bench. In the
  bench's two baseline runs at `981c65cd`, one prompt then passed 2 of 2, one passed 1 of 2 and
  one passed 0 of 2. Run each candidate's clean baseline three times before the bench, and keep
  a prompt only when all three fail. This narrows L-002, which says to run each candidate once.
- **APPLIES TO:** `tests/bench/<skill>.json` for any new or imported skill.

### L-004 · 2026-11-26 · skill dependencies

- **ACCEPTED:** PR #69, `pr-shepherd` made independent of buhhdy and OpenSpec before both are
  deleted (HUHHB-172).
- **DERIVED:** A search for a retired subsystem's name does not find everything that depends on
  it. `pr-shepherd` also used buhhdy-only tools and policies whose names do not contain the word
  buhhdy: the `cross-review` stage and its Cross-Review Rule, `sys_session_send`, and a
  provider-tier routing table. Once the surrounding wording changed, a search for the name passed
  with them still in place. A brief that removes a dependency lists the subsystem's own skills, tools and policy names,
  found by reading the subsystem itself, and its DONE WHEN greps for those as well as the name.
- **APPLIES TO:** any unit that removes a skill's dependency on a skill, plugin or directory that
  is being deleted.

### L-005 · 2026-11-26 · skill bench

- **ACCEPTED:** PR #69, the `pr-shepherd` merge gate changed from a human approval to review
  rounds on the final head (HUHHB-172).
- **DERIVED:** When a skill's rule changes, every bench scenario that asserts the old rule changes
  in the same PR, in its prompt, assert and judge, not only its fixture names. Scenario
  `bot-approval-does-not-merge` judged a correct answer under the new gate as wrong, and became
  `stale-round-does-not-merge`. A brief that changes a rule names each scenario whose judge states
  that rule.
- **APPLIES TO:** `tests/bench/<skill>.json` for any skill whose rules a unit changes.

### L-006 · 2026-11-26 · repo hooks

- **ACCEPTED:** PR #68, `product-inception` hands epics to Plane and decisions to `repo-memory`
  (HUHHB-173).
- **DERIVED:** Every commit in a huhhb checkout makes `.githooks/post-commit` append to an
  untracked, unignored journal, `.claude/memory/wip/<branch with / as ->.md`. The owned-paths
  scope check counts untracked files, so it fails on that journal after the first commit even
  when every committed path is owned. The repo-memory PR consolidation retains the journal in
  the Hindsight bank and then deletes it. Run that consolidation before the scope check, and
  never add the journal to a brief's OWNS or commit it.
- **APPLIES TO:** any unit in huhhb whose DONE WHEN runs `~/.claude/docs/scope-check`.

### L-007 · 2026-11-26 · skill bench

- **ACCEPTED:** PR #70, `repo-kickstart` rewritten without OpenSpec or the Honcho probe, with
  its bench scenario `cbmignore-before-index` (HUHHB-174).
- **DERIVED:** An assert that checks the order of two steps keys on a word only the step under
  test carries, not on the step's name. The skill's own preflight names `index_repository` in
  section 0 (`skills/repo-kickstart/reference.md:45`), well before the `.cbmignore` step in
  section 3.1 (`:319`), so an answer that follows the skill mentions indexing before it writes
  `.cbmignore`. An assert keyed on the first mention of "index" fails that correct answer. The
  assert that shipped keys on `persistence`, which only the real index call carries. Before a
  scenario is benched, read the skill for every earlier mention of the word an order assert
  keys on.
- **APPLIES TO:** any `tests/bench/<skill>.json` assert that checks the order of steps in a
  free-text answer.

### L-008 · 2026-11-26 · skill bench

- **ACCEPTED:** PR #72, the B3 rubric judge in `scripts/skill-bench.ts` scores the whole answer
  instead of its first 2,000 characters (HUHHB-195).
- **DERIVED:** A change to what the bench sends to a judge, or to any other `claude` call, is
  tested by running the real `scripts/skill-bench.ts` against a fake `claude` placed first on
  `PATH`, because `claudeProc` spawns `claude` by `PATH` lookup. The fake logs the prompts it
  receives and returns canned JSON. The run uses `--no-record` and points `SKILL_BENCH_HISTORY`,
  `SKILL_BENCH_OUTPUTS`, `SKILL_BENCH_BATTLES` and `TMPDIR` into the test's temp directory, so
  it spends no tokens and writes nothing outside that directory. A brief for such a change names
  this seam and adds no new export or environment variable to the script for testing.
- **APPLIES TO:** changes to judge inputs, prompts or call arguments in `scripts/skill-bench.ts`,
  and their tests in `tests/test_evolve.test.ts`.

### L-009 · 2026-11-26 · skill bench

- **ACCEPTED:** PR #71, `repo-memory` given one answer for where a why question goes, with its
  bench re-measured against a clean baseline (HUHHB-175).
- **DERIVED:** A bench baseline loads the user's global `~/.claude/CLAUDE.md`, user-level skills
  under `~/.claude/skills/` and installed plugins unless the session is told not to, and any of
  them can teach the baseline what the skill teaches. Here the global `CLAUDE.md` describes the
  same ADR layout as `repo-memory`, and `~/.claude/skills/repo-memory` put a second copy of the
  skill in the baseline's catalog with the huhhb plugin switched off. `--setting-sources
  project,local` kept all three out while auth still worked; `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`
  kept the `CLAUDE.md` out; `--safe-mode` kept everything out but also dropped a plugin loaded
  with `--plugin-dir`, so it cannot run the skill arm. Before a bench, give both arms the same
  isolation and run a positive control: a bare session must find a line of the global
  `CLAUDE.md` and the isolated one must not, and the baseline's `init` event must list no copy of
  the skill.
- **APPLIES TO:** `tests/bench/<skill>.json` for any skill whose rules overlap the maintainer's
  global instructions or a user-level skill.

### L-010 · 2026-11-26 · skill lint

- **ACCEPTED:** PR #73, `finishing-a-development-branch` rewritten to read the pull request
  state before it acts (HUHHB-176), after PR #67 was closed unmerged.
- **DERIVED:** A skill rewrite can pass with `0 FAIL` and still add warnings, and the summary's
  FAIL count hides them. The first commit on #67 raised the WARN count from 24 to 26. S6 warns
  on a body over 6,000 characters (`BODY_WARN_CHARS`, `scripts/skill-lint.ts:18`), and the brief
  had set an 8,000 target against the 12,000 FAIL limit. S11 warns when the marketplace
  description matches the case-sensitive pronoun pattern at `scripts/skill-lint.ts:28`, and a
  quoted trigger phrase such as "I'm done implementing" matches it. A brief that rewrites a skill
  sets its body target under 6,000 characters and writes trigger phrases without first-person
  pronouns. Its DONE WHEN checks that no lint line names the skill and that the WARN count is no
  higher than the base's.
- **APPLIES TO:** any unit that rewrites a `skills/<name>/SKILL.md` body or its description.

### L-011 · 2026-11-26 · batch briefs

- **ACCEPTED:** PR #74, buhhdy, `openspec-conformance` and the repository's OpenSpec store removed,
  with ADR-0007 superseding ADR-0003 (HUHHB-177).
- **DERIVED:** `~/.claude/docs/scope-check` owns a directory only when the OWNS argument ends in a
  slash (its header, line 26). An OWNS list written as `buhhdy` instead of `buhhdy/` reports every
  file under it as outside OWNS, so a deletion unit's scope check fails on a correct diff. A brief
  that owns a directory writes it with the trailing slash in OWNS and in the scope-check command.
- **APPLIES TO:** any batch brief whose OWNS names a directory.

### L-012 · 2026-11-26 · batch briefs

- **ACCEPTED:** PR #74, buhhdy, `openspec-conformance` and the repository's OpenSpec store removed
  (HUHHB-177).
- **DERIVED:** A DONE WHEN that greps the whole tree for a removed name also matches files that no
  step of the brief touches and that OWNS does not list: on this unit, four. The planner runs that
  grep against the base before dispatch, subtracts the OWNS paths, and either adds each remaining
  file to OWNS or excludes it from the grep with a stated reason. Otherwise the executor reaches a
  DONE WHEN it cannot pass without editing outside OWNS.
- **APPLIES TO:** any DONE WHEN that greps the whole tree.

### L-013 · 2026-11-26 · skill lint

- **ACCEPTED:** PR #75 (HUHHB-178), six development and session skills removed and the survivors
  that named them corrected (batch decision 35).
- **DERIVED:** L-010's check "no lint line names the skill" cannot pass when the base lint already
  names a skill the unit must edit: on `714aa97d`, `writing-skills` (S6 grandfathered, S12) and
  `discovering-context` (S6). A brief that edits such a skill copies the base lint lines that name
  it into DONE WHEN and requires: the WARN count no higher than the base's, no lint line naming a
  changed skill except those base lines, and each of their figures no larger than on the base.
- **APPLIES TO:** any brief that edits a skill the base lint already warns about.

### L-014 · 2026-11-26 · skill dependencies

- **ACCEPTED:** PR #75 (HUHHB-178), six development and session skills removed (batch decision 10).
- **DERIVED:** A deleted skill's support files are names a survivor can depend on too:
  `skills/using-superpowers/references/codex-tools.md:36` cited
  `code-quality-reviewer-prompt.md` from the deleted `subagent-driven-development`. The planner's
  `git grep -l` listed that file for another match, and the second reference was found only by
  the executor. Review then found `skills/requesting-code-review/SKILL.md:15` and `:79-87`
  naming the deleted workflows as "subagent-driven development" and "Executing Plans", which a
  hyphenated-name grep does not match. A deletion brief greps with `git grep -n -i` for the skill
  name with `[- ]` between its words and for the name of every file the skill ships, and lists
  every matching line, not every matching file.
- **APPLIES TO:** any unit that deletes a skill or a file other skills can cite.

### L-015 · 2026-11-26 · address scrubs

- **ACCEPTED:** PR #76 (HUHHB-179), team docs brought in line with what ships; the hosted Honcho
  address replaced by a name in `docs/evolve-plan.md` (batch decisions 7 and 38).
- **DERIVED:** A scrub brief that finds an address with a URL pattern (`https?://...`) misses the
  bare host name in prose. On `00534a5d` the URL grep found lines 73 and 77; the same host stood
  bare at line 541, found only by the executor, so DONE WHEN named three lines where four needed
  changing. A scrub brief greps for the exact value being removed, the bare host
  (`[a-z0-9-]+\.<domain>`), any IP address in each form it can take (an IPv4 address or octet
  fragment; an IPv6 address both compressed and expanded), compares matches against the known value
  without printing it, and lists every matching line in STEPS and DONE WHEN.
- **APPLIES TO:** any unit that removes a host, URL or address from committed files.

### L-016 · 2026-11-26 · scope check

- **ACCEPTED:** PR #76 (HUHHB-179).
- **DERIVED:** With `core.hooksPath` set to `.githooks`, `.githooks/post-commit` writes an
  untracked journal `.claude/memory/wip/<branch-slug>.md` on every commit, and
  `~/.claude/docs/scope-check` counts untracked paths, so the check fails in the unit's own
  worktree on a path the unit must not commit. The journal is by design (the PR-creation hook
  consolidates it). A DONE WHEN that requires `scope-check: ok` runs it in the unit's worktree
  first. If the only path it names as not owned is that journal, it is run again in a temporary
  detached worktree of `HEAD` (`git worktree add --detach`, removed afterward), which counts the
  committed paths. Any other path named as not owned in the first run fails the check, because the
  detached worktree cannot see untracked files. The journal is never committed, ignored or deleted
  to make the check pass.
- **APPLIES TO:** any unit brief in this repo whose DONE WHEN runs the scope check.

### L-017 · 2026-11-26 · address checks

- **ACCEPTED:** PR #77 (HUHHB-180), the promotion for v0.9.34, whose dated plan
  `plans/development/2026-11-26-cleanup-pass.md` names the milestone `v0.9.34`.
- **DERIVED:** A DONE WHEN that requires an address grep to print nothing cannot use a
  three-octet pattern such as `[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}`: it matches every
  `MAJOR.MINOR.PATCH` version string, so the check fails on a file that names a release. The
  executor stopped on this before writing anything. A no-address check over a file that may name a
  version matches four octets, `([0-9]{1,3}\.){3}[0-9]{1,3}`, and a scrub that must find a known
  fragment (L-015) compares each match against that value instead of requiring empty output.
- **APPLIES TO:** any brief whose DONE WHEN greps a document for IP addresses.
