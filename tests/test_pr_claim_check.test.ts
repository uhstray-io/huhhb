// Offline tests for the PR claim-check hook (hooks/pr-claim-check.sh): denies posting text to GitHub
// until the command carries CLAIMS_VERIFIED=1.
// Run: node --test tests/test_pr_claim_check.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const HOOK = resolve(import.meta.dirname, "../hooks/pr-claim-check.sh");

function run(command: string) {
  const r = spawnSync("sh", [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } }),
  });
  assert.equal(r.status, 0, r.stderr.toString());
  const out = r.stdout.toString();
  return out ? JSON.parse(out) : null; // stdout must stay valid JSON
}

function denies(cmd: string) {
  const out = run(cmd);
  assert.equal(out?.hookSpecificOutput?.permissionDecision, "deny", cmd);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /CLAIMS_VERIFIED=1/, cmd);
}
const allows = (cmd: string) => assert.equal(run(cmd), null, cmd);

test("denies PR text being created, edited, commented or reviewed", () => {
  denies('gh pr create --base main --title "feat: x [HUHHB-1]" --body-file body.md');
  denies("gh pr edit 59 --body-file body.md");
  denies("gh pr comment 59 --body-file -");
  denies('gh pr review 59 --comment -b "looks good"');
  denies("cd /repo && gh pr comment 59 --body-file c.md");
  denies("GH_REPO=o/r gh pr create --body-file body.md"); // only CLAIMS_VERIFIED=1 lets a post through
});

test("denies gh api writes to comments, including quoted endpoints and headers", () => {
  denies("gh api -X POST repos/o/r/pulls/59/comments/1/replies -f body='Fixed in abc'");
  denies("gh api -X PATCH repos/o/r/issues/comments/6 -F body=@c.md");
  denies("gh api --method POST repos/o/r/issues/59/comments -f body=hi");
  denies('gh api -X POST "repos/o/r/issues/59/comments" -f body=hi');
  denies('gh api -H "Accept: application/vnd.github+json" -X POST repos/o/r/issues/59/comments -f body=hi');
});

test("lets the acknowledged re-run through", () => {
  allows("CLAIMS_VERIFIED=1 gh pr create --base main --body-file body.md");
  allows("cd /repo && CLAIMS_VERIFIED=1 gh api -X POST repos/o/r/issues/59/comments -f body=hi");
});

test("allows reads, unrelated commands, and mere mentions", () => {
  allows("gh api repos/o/r/pulls/59/comments --jq '.[].body'");
  allows('gh api "repos/o/r/pulls/59/comments" --jq ".[].body"');
  allows("gh pr view 59 --json body");
  allows("gh pr checks 59");
  allows("git status --short");
  allows('git commit -m "hook fires on gh pr create and gh pr comment"');
});

test("silent on an empty payload", () => {
  const r = spawnSync("sh", [HOOK], { input: "" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString(), "");
});
