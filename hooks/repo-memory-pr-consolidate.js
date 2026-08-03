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
        `repo-memory PR consolidation: a staging journal exists at ${journal} for branch ${branch}. ` +
        `Per the repo-memory skill's Hooks section (PR consolidation): FIRST recall this repo's Hindsight bank ` +
        `(bank_id per repo-kickstart reference section 0 — NOT a bare directory name) for an existing ` +
        `outcome naming branch ${branch}. If one exists, stop: it is already retained, do not write a second. ` +
        `Otherwise read the journal, consolidate and /simplify its per-commit lines into ONE self-contained ` +
        `paragraph naming branch ${branch} and the PR number, stating the outcome labelled plainly ` +
        `worked / dead end / corrected, the root cause of anything that failed, and any constraint discovered ` +
        `— in domain language, never identifiers or file paths. Store it with sync_retain, not retain. ` +
        `Delete the journal ONLY after sync_retain returns status completed; if it fails or the bank is ` +
        `unreachable, KEEP the journal and report that, so the post-merge close-out can retry. Do this now.`,
    },
  }),
);
