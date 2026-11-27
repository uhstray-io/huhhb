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
| 1.1 | PR body listed test cases and lockfiles from memory; both lists were wrong | Unverified claim | 9 | `hooks/pr-claim-check.sh` (Bash `gh` path only; deny until acknowledged) |
| 1.2 | Scenario note gave a cause for a baseline difference that no run had isolated; a controlled run contradicted it | Unverified claim | 2 | `Convention` |
| 1.3 | A re-judge reported as the bench's judge scored whole answers; the bench judged only the first 2,000 characters | Unverified claim | 1 | `Convention` (this case: `tests/test_evolve.test.ts`, PR #72) |
| 2.1 | PR #60 merged with 4 CodeRabbit findings unanswered | Process | 1 | `hooks/pr-merge-guard.sh` (deny until acknowledged; fails open) |
| 2.2 | PR #77 was merged by another admin before its two review rounds ran on the final head | Process | 1 | `Convention` (the `main` ruleset requires a PR with 0 approvals; any ruleset change is Joseph's) |
| 3.1 | Grounding spec accepted "merges count as work" as rare; merging `dev` is routine, so the only line nudge was a false positive | Design assumption | 1 | `tests/test_grounding_hook.test.ts` (merge and fast-forward cases) |
| 4.1 | Skill-disabled baseline read the skill file from disk, so a failing baseline was reported as passing | Test passed for the wrong reason | 3 | `Convention` (bench fix: HUHHB-168) |
| 4.2 | A baseline started in an empty directory still read the skill by absolute path; supersedes the working-directory clause of 4.1 | Test passed for the wrong reason | 1 | `Convention` (bench fix: HUHHB-168) |
| 5.1 | PR #65 was returned four times: its bench asserts and written claims were settled during review, not before it | Process | 1 | `Convention` |
| 5.2 | PR #67 was returned three times; each return found another state the skill acted on without reading it | Process | 2 | `Convention` |
| 6.1 | A bench trigger probe named the README, and its session rewrote the file's first paragraph in the working tree | Test wrote outside its own folder | 1 | `Convention` |

## 1. Asserting something without verifying it

### 1.1 PR body described the test suite and lockfile list from memory

**Occurrences: 9** — 2026-11-13, 2026-11-13, 2026-11-13, 2026-11-13, 2026-11-20, 2026-11-22, 2026-11-26, 2026-11-26, 2026-11-26

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

**Occurrence 5 — 2026-11-20.** PR #65's body and Plane item HUHHB-169 said the
body of `onboarding/skills-list.md` was 11,999 characters on `main` and 11,956
after the change. `node scripts/skill-lint.ts`
reports 12000 at `fceb9829` and 11957 at `cba5172f`. The numbers came from a
one-line script written in the session that stripped the frontmatter its own
way, one character differently from the lint. The guard fired and was
acknowledged: the counts were re-run before posting, with the same script. A
count is verified by the tool that enforces the limit, not by a re-run of the
script that produced it. The PR body and the Plane item are corrected. The
commit message of `8934ee20` says "one character under the 12,000 character S6
cap", from the same count, and stands as written.

**Occurrence 6 — 2026-11-22.** PR #66's body said the lint line for `humanizer`
read "body 6,988 characters". That was true at `5be8400e`. Commit `bec09ca0`
then shortened one sentence of the skill by 19 characters, and the body was
edited and posted again without the lint being run again:
`node scripts/skill-lint.ts` reports 6969 at `bec09ca0`. The guard fired and
was acknowledged for the section being added; the Verification list written at
the earlier head was carried over unread. Every number in a PR body is run
again at the head the body is posted against, not only the lines being added.
The body is corrected.

**Occurrence 7 — 2026-11-26.** PR #70's lesson L-007 and its body cited
`skills/repo-kickstart/reference.md:44` for the preflight line that names
`index_repository`. The line is 45; line 44 is blank. The number came from a
`sed -n 44,46p` whose output began with the blank line, which went unnoticed,
and was written into a committed file without a `grep -n` for the line itself.
The guard fired on the body and was acknowledged; the citation was taken as
already checked because a command had shown the text nearby. The `pr-reviewer`
round on `a15eb780` found it. A cited line number is read from a command that
prints the number beside the text, such as `grep -n`, not counted from a
printed range. L-007 and the body are corrected before merge.

**Occurrence 8 — 2026-11-26.** PR #72's body said the fake `claude` in the new
test returns an answer of 2,071 characters. It is 2,094 (`tests/test_evolve.test.ts:1702`,
23 + 2,050 + 21). The owner did count 2,094 before posting, and put the `sed`
that corrected the draft in the same Bash command as the call that opened the
PR. The guard denies the whole command, so the `sed` never ran. The command was
re-run with `CLAIMS_VERIFIED=1` in front of the posting call only, and the
uncorrected draft went out; the later body edit posted the same file. The
`pr-reviewer` round on `e9121595` found it. A fix to a draft is a command of its
own, and the draft is read back (a `grep` for the corrected text) before the
guarded call posts it. The body is corrected before merge.

**Occurrence 9 — 2026-11-26.** On PR #73, the owner's reply to CodeRabbit's
bench comment said this skill "has no scenario file under `tests/bench/`". The
sentence was written while composing the four thread replies, and the call that
posted them carried `CLAIMS_VERIFIED=1` for the other three, which had been
checked. The claim was checked only after it was posted (`ls tests/bench/ | grep
-i finishing` printed nothing), so it happened to be true. The guard denies a
command, not a sentence: one acknowledgement covered several texts, and a claim
added while writing them was never put to the check. Each posting call carries
text whose every claim was checked before that call, and a reply written in the
same command as others is checked on its own.

### 1.2 A scenario note stated why two baselines differed, from runs that isolated nothing

**Occurrences: 2** — 2026-11-20, 2026-11-20

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

**Occurrence 2 — 2026-11-20.** Same PR and same commit (`b0ea909d`), in
`docs/LESSONS.md` L-002: "A scenario copied from the skill's own worked example
is the likeliest to pass at baseline." The first scenario is that worked
example, and its clean baseline has the worst record in the PR (1 of 2 in each
bench run that measured it). The same entry said, one sentence earlier, that
this scenario's baseline had failed in 2 of 3 runs. The rule did not fire
because it was framed around a cause for one difference, and a general
statement about which scenarios pass did not register as the same thing. It
is: a generalisation from bench results needs the same isolating run, or it
is left out. An independent review found it before merge, and it is removed.

### 1.3 A re-judge reported as the bench's judge scored text the bench's judge never saw

**Occurrences: 1** — 2026-11-26

**What happened.** The `repo-memory` bench at `6787edac` (PR #71, HUHHB-175)
gave the write scenario a judge median of 3 of 5, below the gate of 4. For
evidence, the owner session took the judge prompt from
`scripts/skill-bench.ts`, filled it with the scenario's rubric and each kept
answer, and ran it three times per answer: both kept answers scored 5, 5 and
5. The owner reported this to the batch coordinator as a re-run of "the
bench's own judge template". The coordinator relayed it to Joseph without
checking it, and Joseph accepted the failing gate as measured on that evidence
(batch decision 24). The final-head review of PR #71 then found that the bench
judges `r.result.slice(0, 2000)` (`scripts/skill-bench.ts:837`), while the
re-judge passed each answer whole. In the kept answer for the shipped skill,
the consequences start at character 2138, the first "Negative" at 2335,
`INDEX.md` at 2919 and `DECISIONS.md` at 3318. Everything the rubric
penalises an answer for leaving out lies past the cut. Joseph revisited the
decision (batch decision 25).

**Root cause.** The owner copied the template and the call in `judge()`
(`scripts/skill-bench.ts:221`) and did not read its caller at line 837, which
clips the answer before it reaches `judge()`. Reproducing the measurement was
taken to mean reproducing the function that scores, not the input that reaches
it. The coordinator took the owner's description of the method as the check.

**The rule.** A check offered as a reproduction of a bench gate feeds the
scorer exactly what the bench feeds it. Read the whole path from a run's
output to the scorer, every slice, filter and transform included, and say in
the report which of them the check applied. A check that differs in any input
is reported as a different measurement, never as the bench's. A session that
relays such a check to Joseph reads that path itself first.

**Enforced by.** `Convention`. Since PR #72 (HUHHB-195) the B3 judge scores the
whole answer, and `test_the_b3_judge_receives_the_whole_answer` in
`tests/test_evolve.test.ts` checks it. That closes this case only.

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

### 2.2 PR #77 merged before its required review rounds ran on the final head

**Occurrences: 1** — 2026-11-27

**What happened.** PR #77 promoted the cleanup-pass integration branch into
`main` (v0.9.34, HUHHB-180). As a promotion it needed two review rounds on its
final head, the last asking for no changes. The second round on `4fb601ce`
asked for changes (PR comment, 2026-11-27T03:08:50Z). The fix was pushed as
`e1902072` and answered at 03:10:56Z, and the rounds on `e1902072` were held
while Joseph decided whether `repo-kickstart` needed a new bench run. During
that hold, another repo admin merged the PR at 04:47:52Z as `316a723c`, after
merging #48 into `main` first. No review round ran on `e1902072`. Lint, tests,
the tag and the release all passed on `316a723c`, and Joseph accepted the merge
as it stands, with no post-merge review and no revert (batch decision 44).

**Root cause.** The rule that the PR was not ready lived only in the batch's
handoff files and in the owner's session. On GitHub the PR was open and not a
draft, its `test` check passed (no check is required on `main`), and the `main`
ruleset was satisfied: it requires a pull request with
`required_approving_review_count: 0`. The last
comment on the PR was the answer to the round's findings, so the PR looked
finished to anyone outside the batch.

**The rule.** When a review round asks for changes, or a PR is held on a
decision, its owner converts it to a draft (`gh pr ready <n> --undo`) and says
in a PR comment what it is waiting for. It is marked ready (`gh pr ready <n>`)
when every requested change is pushed and no decision is pending, before the
next round is requested. The state a merger sees on GitHub then matches the state of the
review. A PR is not made a draft only to wait for its first round: CodeRabbit
does not review drafts in this repo (`.coderabbit.yaml:11`), and the Plane
GitHub integration moves a draft PR's work item to Backlog (`AGENTS.md:249`).

**Enforced by.** `Convention`. The `main` ruleset requires a pull request with
zero approvals; changing the ruleset is Joseph's decision.

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

**Occurrences: 3** — 2026-11-20, 2026-11-22, 2026-11-26

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

**Occurrence 2 — 2026-11-22.** Adding `humanizer`, three candidate prompts were
each run twice as a baseline: from an empty directory, with
`--disallowedTools Skill`, before the skill existed in this repo. The `init`
event of all six runs listed `humanizer:humanizer`. The upstream skill was
installed on the machine as its own plugin (`humanizer@humanizer`, 4.0.0), so
it was in the catalog under another plugin's name. No run opened a skill file
(each made no tool call), but all six were voided, and the prompts were run
again with that plugin switched off for the session:
`--settings '{"enabledPlugins":{"humanizer@humanizer":false}}'`. The rule did
not fire because its catalog check was made after the runs, not before them,
and because this repo not shipping the skill yet was taken to mean no
installed plugin did.

**Occurrence 3 — 2026-11-26.** Rewriting the `repo-kickstart` bench
(HUHHB-174), the baseline pre-check ran each of two candidate prompts three
times through a throwaway `claude` wrapper that started every session in an
empty scratch directory, with `--disallowedTools Skill` and the installed
`huhhb@huhhb` plugin switched off. A probe through the same wrapper found no
kickstart skill in the baseline's catalog. The baseline still passed 5 of the 6
runs, and its answers cited `skills/repo-kickstart/SKILL.md:101-109` and
`reference.md:624-669`, read from this worktree by absolute path, and the
installed 0.8.34 copy in the plugin cache. The prompts name the skill, and the
session went looking for it. The rule did not prevent it because its "not on
disk under the working directory" clause was taken to mean that an empty
working directory was enough. The void step did fire: the answers were read
before any verdict was used, all six runs were voided, and they were repeated
under the rule in 4.2.

### 4.2 A baseline started in an empty directory still read the skill by absolute path

**Occurrences: 1** — 2026-11-26

**What happened.** Recorded as occurrence 3 of 4.1: the `repo-kickstart`
baseline started in an empty directory, with the skill out of its catalog,
read `skills/repo-kickstart/` from a worktree elsewhere on disk and from the
plugin cache, and passed 5 of 6 runs. With no way to read the skill, the same
two prompts passed 2 of 6: one prompt 2 of 3, the other 0 of 3.

**Root cause.** A baseline session that has Bash, Read, Glob or Grep can read
any path the user can, and a prompt that names the skill sends it looking.
Switching the plugin off and starting in an empty directory take the skill out
of the catalog and out of the working directory, not off the disk, which holds
it in every checkout of this repo and in the plugin cache. An MCP server is a
second route: `codebase-memory-mcp` has this repo indexed.

**The rule.** A baseline counts only if it cannot read the skill at all. Run
the baseline arm with no built-in tools (`--tools ""`) and no MCP servers
(`--strict-mcp-config`), so it answers from what the model knows, and write
every bench prompt so that it can be answered without tools. This supersedes
the "not on disk under the working directory" clause of the rule in 4.1; that
entry's catalog check and its void step still apply. The note on the scenario
in `tests/bench/repo-kickstart.json` records the method.

**Enforced by.** `Convention`. The bench does not do it itself (HUHHB-168).

## 5. Opening a PR before its checks were settled

### 5.1 PR #65 was returned four times over its bench scenarios and its claims

**Occurrences: 1** — 2026-11-20

**What happened.** PR #65 (`prune-tests`, HUHHB-167) was returned by review
four times. Round 1 (CodeRabbit, `b0ea909d`): bench gate B8 failing, the
asserts passed an answer that deleted nothing, and the first prompt lacked a
premise its rubric used. Round 2 (CodeRabbit, `b0adffdc`): the second assert
accepted an answer that deleted a parameter the kept tests need. Round 3 (the
`pr-reviewer` agent, `cba5172f`, CodeRabbit being rate limited): a wrong
sentence in L-002 and a missing PR number there, counts off by one in the PR
body, a stale line in `AGENTS.md`, rubrics grading text the judge never sees,
and two more gaps in the same assert. Round 4 (`2782b34f`): the `pr-reviewer`
agent found four errors in the prose the round 3 correction had added, and
CodeRabbit found one more gap in the same assert. The bench ran three times,
at `8934ee20`, `9dca0501` and `55f605c2`, 23 to 25 paid sessions each; the
second and third runs were needed because an assert had changed. Joseph
approved a fourth and then a fifth correction, each limited to prose.

**Root cause.** The scenarios were designed while the PR was open. An assert
that greps a free-text answer was written, benched, and only then tested
against answers built to defeat it, and that last step was done by the
reviewers. The written claims had the same order: explanations and counts went
into the notes, the lesson and the PR body as the runs came in, and were not
re-read against the final numbers.

**The rule.** Before a PR that adds bench scenarios is opened: replay each
assert against answers written to defeat it (keeps everything, deletes too
much, names the right things in other words, annotates what it keeps), fix
what that finds, and only then run the bench, once. Before the PR is opened
and after every later bench run, re-read each claim in the notes, the lesson
and the PR body against the history rows. A correction made after a return
removes or shortens text where it can; a sentence it adds is checked like any
new claim.

**Enforced by.** `Convention`.

### 5.2 PR #67 was returned three times because the skill acted on state it had not read

**Occurrences: 2** — 2026-11-26, 2026-11-26

**What happened.** PR #67 (`finishing-a-development-branch`, HUHHB-176) was
returned three times, each time for a state the skill's text assumed. Return 1
(an owner correction before the PR opened, on `73efff5e`): the discard path did
not handle an open pull request or a worktree with uncommitted changes, and the
brief's own targets raised two lint warnings. Return 2 (CodeRabbit review
6077397952 on `b21398bb`): a push with an upstream already set did not check
`@{u}`, a `CLOSED` pull request was not handled, a `MERGED` one went to cleanup
without checking that `HEAD` was in the base, and cleanup failed on the main
checkout. Return 3 (the `pr-reviewer` agent on `6d63e9f9`): Option 1 pushed
before it read the pull request state, which recreates a branch GitHub deletes
on merge (`gh api repos/uhstray-io/huhhb --jq .delete_branch_on_merge` prints
`true`), and the checkout test read the current directory while its step said
to run from outside the worktree. Each fix patched the path its return named.
Joseph recut the unit (batch decision 28), and #67 was closed unmerged.

**Root cause.** Brief 05 listed the actions for each option but not the state
each action depends on, so the executor wrote actions and the reviewers
supplied the states one return at a time. The unit also rebuilt a post-merge
cleanup that `pr-shepherd` already owns, which doubled the paths whose state
could be wrong. As in 5.1, the replay against hostile states (a deleted remote
branch, a closed pull request, the main checkout, a run from another
directory) was done by the reviewers instead of before the PR opened.

**The rule.** Before a brief for a skill that runs git or gh commands is
dispatched, list for each command the state it depends on (the upstream, the
pull request state, which checkout it runs in, whether the remote branch
exists) and the read that establishes it, and order the skill so every read
comes before the first write. Before the PR opens, replay the text against each
hostile state and record the line that answers it. A step another skill already
owns is pointed to, not rewritten. This widens the rule of 5.1 (replay before
review) from bench asserts to skill instructions.

**Enforced by.** `Convention`.

**Occurrence 2 — 2026-11-26.** The recut, PR #73, was returned twice for the
same kind of fault. Return 1 (CodeRabbit review 6081463266 on `68034cc9`):
discard ran `orca worktree rm --force` without first reading or showing the
worktree's uncommitted, untracked and ignored files. Return 2 (the
`pr-reviewer` agent on `414566e2`): after the worktree was removed from outside
it, the branch check `git show-ref --verify --quiet refs/heads/<branch>` named
no directory; run outside a repository it exits 128, which the text read as
"branch not found", so `git branch -D` was skipped. The rule did not prevent
either. The recut's brief listed the state reads for pushing and for the pull
request, but not for deleting, and no replay ran a step from the directory the
previous step leaves it in. A step that runs after its checkout is gone names
the directory it runs in (`git -C <path>`), and an exit code that means "error"
is never read as "absent".

## 6. A test that wrote outside its own folder

### 6.1 A bench trigger probe rewrote the first paragraph of the README

**Occurrences: 1** — 2026-11-22

**What happened.** The first `humanizer` bench run (at `981c65cd`) had four
positive trigger prompts that carried no text of their own. One was "remove the
AI tells from the intro of our README". The bench runs each trigger prompt as a
full `claude -p` session. A wrapper started those sessions in an empty scratch
directory and loaded the branch with `--plugin-dir` set to this worktree. After
the run, `git status` showed `README.md` modified: its first paragraph had been
rewritten. `git restore README.md` put it back before anything was committed.
`~/.claude/CLAUDE.md` kept its earlier modification time, and no open PR had
been updated. Trigger recall on that run was 2 of 4.

**Root cause.** A trigger probe is a real session with write tools, and the
prompt named a file that the session's own directory did not have. Two things
pointed the session at this worktree: the `--plugin-dir` argument, and the
scratch directory's own path, which spells out the worktree's path with dashes
for slashes. Which one it followed is not known, because the bench keeps no
transcript of a probe.

**The rule.** A bench prompt names nothing outside itself: the text to work on
is in the prompt. The plugin under test is loaded from a throwaway copy
(`git archive HEAD` into a scratch directory), never from the working tree.
After every bench run, `git status` must show `tests/bench/history.jsonl` as the
only file the run changed, and that is checked before the rows are read.

**Enforced by.** `Convention`.
