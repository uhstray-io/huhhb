---
name: feedback-use-prs
description: Always open a PR instead of pushing directly to main — CodeRabbit reviews catch real issues
metadata:
  type: feedback
---

Always open a pull request instead of committing directly to main.

**Why:** CodeRabbit reviews have caught real issues (e.g., the Windows/POSIX hook bug in PR #1 that required PRs #2 and #3 to fix). Pushing directly to main bypasses that review layer entirely.

**How to apply:** For any non-trivial change — new hooks, new skills, refactors, plugin.json edits — create a branch, push it, and open a PR. Let CodeRabbit review before merging. Trivial typo/doc fixes can still go direct if truly one-line.
