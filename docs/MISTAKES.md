# MISTAKES.md — recorded failures and the rules they earned

Author: Joseph A. Wisneski IV

A running record of mistakes made while building huhhb, kept so they are not
repeated and so the ones that *can* be enforced mechanically get enforced
instead of remembered.

**Every entry names where it is enforced.** A rule that lives only in this file
is the weakest kind — it depends on someone reading it at the right moment. The
goal for each entry is to move it out of "convention" and into a pre-commit
hook, a test, CI, or a policy. The `Enforced by` column is the honest status,
not the aspiration.

Entries are appended, never rewritten. If a rule turns out to be wrong,
supersede it with a new entry and link both. A repeat increments the original
entry's `Occurrences` count and adds a dated note; it never opens a second entry.

## Index

| # | Summary | Class | Count | Enforced by |
|---|---|---|---|---|
| 1.1 | PR body listed test cases and lockfiles from memory; both lists were wrong | Unverified claim | 4 | `hooks/pr-claim-check.sh` (Bash `gh` path only; deny until acknowledged) |
| 1.2 | Scenario note gave a cause for a baseline difference that no run had isolated; a controlled run contradicted it | Unverified claim | 1 | `Convention` |
| 2.1 | PR #60 merged with 4 CodeRabbit findings unanswered | Process | 1 | `hooks/pr-merge-guard.sh` (deny until acknowledged; fails open) |
| 3.1 | Grounding spec accepted "merges count as work" as rare; merging `dev` is routine, so the only line nudge was a false positive | Design assumption | 1 | `tests/test_grounding_hook.test.ts` (merge and fast-forward cases) |
| 4.1 | Skill-disabled baseline read the skill file from disk, so a failing baseline was reported as passing | Test passed for the wrong reason | 1 | `Convention` (bench fix: HUHHB-168) |

## 1. Asserting something without verifying it

### 1.1 PR body described the test suite and lockfile list from memory

**Occurrences: 4** — 2026-11-13, 2026-11-13, 2026-11-13, 2026-11-13

**What happened.** Opening PR #59 (grounding line threshold, HUHHB-156), the
body listed the 10 cases in `tests/test_grounding_hook.test.ts` and the
lockfiles the hook excludes, both written from the session's earlier summary
rather than from the files. `grep -n '^test(' tests/test_grounding_hook.test.ts`
showed the list was wrong: it named an "env override" test that does not exist,
split lockfile and binary exclusion into two tests when they are one, and
omitted the added+deleted, non-descendant-commit and idle-return cases.
`hooks/grounding-check.sh:77-80` excludes 11 lockfiles; the body named 8
(missing `bun.lockb`, `Gemfile.lock`, `composer.lock`). The body was corrected
with `gh pr edit` within a minute, but it was public on GitHub before that.

**Root cause.** The PR body was treated as a summary of known work rather than
a set of factual claims about files. Every list in it came from conversation
memory, which had been compressed across a session handoff.

**The rule.** Every enumerable claim in a PR body or commit message — test
names, file lists, flags, counts — is generated from or checked against the
source (`grep`, `git diff --stat`, `node --test` output) before `gh pr create`,
not after.

**Enforced by.** `hooks/pr-claim-check.sh` — a PreToolUse (Bash) hook that denies the post until the `gh` call is re-run with `CLAIMS_VERIFIED=1` in front of it. Tested by `tests/test_pr_claim_check.test.ts`. Covers the Bash `gh` path only: text posted through GitHub MCP tools, or into Plane, is still Convention.

**Occurrence 2 — 2026-11-13.** Same PR, about 40 minutes later: a reply to a
CodeRabbit finding said `hooks/` held "14 `.sh` scripts". `git ls-files` shows
11 `.sh`, 4 `.ps1`, 1 `.js`. The reply was edited within a minute. The rule
did not fire because it was framed around PR bodies, and a review reply did
not register as the same kind of public claim. It is: any text posted to
GitHub falls under the rule.

**Occurrence 3 — 2026-11-13.** Same PR: a comment answering the independent
review cited the JSON escape as `grounding-check.sh:140`. `grep -n '^esc='`
shows line 141; two earlier commits in the session had each added a line above
it. Corrected within a minute. The rule did not fire because the line number
was carried from the reviewer's report (written against an older layout) and
treated as already checked. A line number from another agent's report is not
verified until re-read at the head being described.

**Guard proposal (count reached 3).** A PreToolUse hook on Bash matching
`gh pr (create|edit|comment)` and `gh api .*/comments`. It injects, at the
moment of posting, a one-line check: every `file:line`, count and list in the
body came from a command run against the current head in this session. The
rule failed each time at exactly that moment, so the reminder belongs there,
not in a document read earlier. Until that hook exists, `Enforced by` stays
Convention.

**Guard built — 2026-11-13.** The proposed hook shipped as `hooks/pr-claim-check.sh`
(HUHHB-157). It fires on `gh pr create|edit|comment|review`, and on `gh api` calls
to a comments endpoint only when they write (`-X POST|PATCH|PUT`, `--method`, or
`-f`/`-F` fields), so reading comments stays quiet. It denies the call, with the
check as the reason, until the same command is re-run prefixed with
`CLAIMS_VERIFIED=1`. A first, advisory version was dropped in review: PreToolUse
`additionalContext` is added alongside the tool result, so the reminder arrived
only after the text had been posted. A hook cannot check the text's claims; it
can only force the check to happen before posting.

**Occurrence 4 — 2026-11-13.** Not GitHub this time: the first description of
Plane item HUHHB-158 said two affected sessions had both been resumed. The
transcript of one (`9e5565da`) shows no resume; it had been waiting on a question
for eight hours and the nudge fired on the answer. Corrected about a minute
later, before the PR was opened. The guard did not apply, because it only
watches `gh` commands; the rule did not fire because the second session was
assumed to match the first without reading its transcript. Any tracked text,
Plane included, falls under the rule.

### 1.2 A scenario note stated why two baselines differed, from runs that isolated nothing

**Occurrences: 1** — 2026-11-20

**What happened.** In `tests/bench/prune-tests.json` at `b0ea909d`, the note on
the second scenario said its baseline passed because the prompt calls the two
files "the whole project", "which tells the baseline the methods have no other
caller; the first scenario does not say that, and its baseline leaves the
exports in". That was pushed in PR #65. The two scenarios also differ in
language, in helper names and in how the request is scoped. A review comment
then asked for the first scenario to say "the whole project" too. Run that
way, with nothing else changed, its clean baseline still named only
`tests/session.test.ts` in 3 of 3 runs, so the wording was not the cause.

**Root cause.** Two measurements that differed in several ways were explained
by the one difference that came to mind first, and the explanation was written
into a committed file as fact.

**The rule.** A note or PR text gives a cause for a bench difference only
after a run that changes that one factor and nothing else. Without that run,
write the measurements and "not known why".

**Enforced by.** `Convention`.

## 2. Merging before the review was finished

### 2.1 PR #60 merged with four review findings unanswered

**Occurrences: 1** — 2026-11-14

**What happened.** CodeRabbit reviewed PR #60 at `3e3c434b` and posted four
inline findings. Before merging `1d3437e0` I checked only the comments on the
final commit and CodeRabbit's check-run there, which said "Review rate limited",
and I treated the independent reviewer's approval as the whole review. The PR
merged as `0da180d5` with those four threads unanswered. One was a real gap that
shipped in v0.8.29: `gh api …/comments --input body.json` posts without an
explicit method and passed the claim-check hook. A GraphQL query run during the
merge printed `4` unresolved threads, and nothing stopped on it.

**Root cause.** "Every finding answered" was checked per commit, not per PR.
Findings posted on an intermediate commit are invisible to a check scoped to the
final commit, and a rate-limited status on the final commit hid the fact that
the reviewer had run on an earlier one.

**The rule.** Before merging, list every unresolved review thread on the PR,
whatever commit it was posted on, and confirm each has a fix pushed or a reply
with the reason. A count printed in the same command as the merge is not a check.

**Enforced by.** `hooks/pr-merge-guard.sh`, a PreToolUse (Bash) hook that denies
`gh pr merge` while any unresolved thread's last comment is not the merging
user's, until re-run with `REVIEW_ANSWERED=1`. Tested by
`tests/test_pr_merge_guard.test.ts`. Fails open when `gh` cannot answer.

## 3. Accepting a limit without measuring how often it happens

### 3.1 Grounding hook counted merged-in work as the session's own

**Occurrences: 1** — 2026-11-16

**What happened.** The line-threshold spec
(`docs/superpowers/specs/2026-11-12-grounding-line-threshold-design.md:61-62`)
listed "a `git pull` or `git merge` of others' commits keeps the baseline an
ancestor, so those lines count" as a known limit, accepted because the nudge is
advisory. The first and only line-count nudge it produced, on 2026-11-16 in
`agent-cloud/local-mode-1b`, reported 17,456 changed lines. The session's own
work was one 103-line commit. The other 17,353 lines came from
`3fcf1baf Merge dev into fix/local-mode-from-inventory-1b`, measured with
`git diff --shortstat 3fcf1baf^1 3fcf1baf`.

**Root cause.** The limit was judged rare without checking the workflow it
would run in. Merging `dev` into a feature branch is routine here:
`git log --all --merges --since=2026-11-01` in agent-cloud shows 32
"Merge (origin/)dev into <branch>" commits, so the "rare" case is on the main path.

**The rule.** Before accepting a known limit as rare, check how often the
repo's own workflow hits it, with a command or the transcripts, and write
that number next to the limit. If the case is on the normal path, it is a
bug, not a limit.

**Enforced by.** For this instance: `tests/test_grounding_hook.test.ts` cases
that merge and fast-forward another branch's commits and expect no nudge. The
general rule: `Convention`.

## 4. A test that passed for the wrong reason

### 4.1 The skill-disabled baseline read the skill file from disk

**Occurrences: 1** — 2026-11-20

**What happened.** Adding `prune-tests`, the RED step ran each scenario in
`tests/bench/prune-tests.json` once the way `scripts/skill-bench.ts` runs its
baseline arm: `claude -p <prompt> --disallowedTools Skill`, from the repo root,
with the branch loaded as a plugin. All three asserts passed, and the session
reported "the baseline passed all three scenarios". A second round with
`--output-format stream-json` showed why: in 3 of 3 runs the baseline's only
tool call was `ls skills/prune-tests/ && cat skills/prune-tests/SKILL.md`.
Re-run from an empty directory with the skill not installed, the baseline
failed the scenario that asks for test-only production code to be removed
(its last line named `tests/session.test.ts` and not `src/session.ts`) and
passed the other two.

**Root cause.** `--disallowedTools Skill` removes the tool, not the skill. The
skill stays in the session's catalog, and the bench starts `claude` in its own
working directory, which is this repo, so `skills/<name>/SKILL.md` is one
`cat` away. A session that sees a matching skill it cannot invoke reads the
file instead. The baseline arm then measures the skill, and a skill that works
looks obsolete (standard C4, E3).

**The rule.** A baseline counts only if the skill is unreachable in it: not
listed in the catalog and not on disk under the working directory. Before
reading a baseline verdict, look at the baseline run's tool calls; one that
opens the skill's own files voids the run. Until the bench does this itself,
run both arms from an empty directory and load the skill arm with
`--plugin-dir`.

**Enforced by.** `Convention`. The bench does not check it (HUHHB-168). The note on the
first scenario in `tests/bench/prune-tests.json` records the measurement.
