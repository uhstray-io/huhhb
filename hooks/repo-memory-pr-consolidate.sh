#!/usr/bin/env sh
# huhhb PostToolUse (Bash) hook — PR-creation consolidation trigger for
# repo-memory's per-commit staging journals.
#
# Parses the payload's tool_input.command (never the whole payload — text
# output mentioning "gh pr create" must not false-trigger); when a
# `gh pr create` actually ran and the current branch has a staging
# journal, emits JSON-safe additionalContext instructing the session to
# consolidate it into ONE PR outcome record. Advisory; the agent does the
# judgment work. Degrades to a no-op without node.

command -v node >/dev/null 2>&1 || exit 0

node - <<'JS'
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
let payload;
try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
const cmd = String(payload?.tool_input?.command ?? "");
if (!/(^|[;&|]\s*)gh\s+pr\s+create\b/.test(cmd)) process.exit(0);
let branch = "";
try {
  branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
} catch { process.exit(0); }
if (!branch) process.exit(0);
const journal = `.claude/memory/wip/${branch.replace(/\//g, "-")}.md`;
if (!existsSync(journal)) process.exit(0);
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext:
      `repo-memory PR consolidation: a staging journal exists at ${journal} for this branch. ` +
      `Per the repo-memory skill's Hooks section: read it, consolidate and /simplify its per-commit lines ` +
      `into ONE PR outcome record (agent Record Contract, kind: outcome, evidence = the PR number + commit range) ` +
      `saved via the repo-memory skill's save flow, then delete the journal in the same commit. Do this now.`,
  },
}));
JS
exit 0
