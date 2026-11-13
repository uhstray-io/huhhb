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
| 1.1 | PR body listed test cases and lockfiles from memory; both lists were wrong | Unverified claim | 1 | Convention |

## 1. Asserting something without verifying it

### 1.1 PR body described the test suite and lockfile list from memory

**Occurrences: 1** — 2026-11-13

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

**Enforced by.** Convention
