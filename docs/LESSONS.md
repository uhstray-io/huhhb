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
