// repo-memory PR-consolidation trigger (PostToolUse Bash payload on stdin).
// Kept in a file — NOT a `node -` heredoc — so stdin stays available for
// the hook payload; `node -` would consume stdin for the program source
// and the payload read would see EOF (silent no-op on every PR).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const cmd = String(payload?.tool_input?.command ?? "");
if (!/(^|[;&|]\s*)gh\s+pr\s+create\b/.test(cmd)) process.exit(0);

let branch = "";
try {
  branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
} catch {
  process.exit(0);
}
if (!branch) process.exit(0);

const journal = `.claude/memory/wip/${branch.replace(/\//g, "-")}.md`;
if (!existsSync(journal)) process.exit(0);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `repo-memory PR consolidation: a staging journal exists at ${journal} for this branch. ` +
        `Per the repo-memory skill's Hooks section: read it, consolidate and /simplify its per-commit lines ` +
        `into ONE PR outcome record (agent Record Contract, kind: outcome, evidence = the PR number + commit range) ` +
        `saved via the repo-memory skill's save flow, then delete the journal in the same commit. Do this now.`,
    },
  }),
);
