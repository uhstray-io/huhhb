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

// Slug rule (branch / -> -) is duplicated cross-language in
// .githooks/post-commit — change both together or this hook reconstructs
// a journal path the capture hook never wrote.
const journal = `.claude/memory/wip/${branch.replace(/\//g, "-")}.md`;
if (!existsSync(journal)) process.exit(0);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `repo-memory PR consolidation: a staging journal exists at ${journal} for this branch. ` +
        `Per the repo-memory skill's Hooks section: read it, consolidate and /simplify its per-commit lines ` +
        `into ONE self-contained outcome paragraph, then sync_retain it into this repo's Hindsight bank ` +
        `(bank_id = the repo directory name). The paragraph states the outcome labelled plainly ` +
        `worked / dead end / corrected, the root cause of anything that failed, and any constraint discovered ` +
        `along the way — in domain language, never identifiers or file paths. Use sync_retain, not retain: ` +
        `an "accepted" receipt is not a verified write. Then delete the journal in the same commit. Do this now.`,
    },
  }),
);
