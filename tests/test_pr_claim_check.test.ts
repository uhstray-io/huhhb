// Offline tests for the PR claim-check hook (hooks/pr-claim-check.sh): fires before text is posted to GitHub.
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
  if (out) JSON.parse(out); // stdout must stay valid JSON
  return out;
}

const fires = (cmd: string) => assert.match(run(cmd), /"additionalContext":"pr-claim-check/, cmd);
const quiet = (cmd: string) => assert.equal(run(cmd), "", cmd);

test("fires before PR text is created, edited, commented or reviewed", () => {
  fires('gh pr create --base main --title "feat: x [HUHHB-1]" --body-file body.md');
  fires("gh pr edit 59 --body-file body.md");
  fires("gh pr comment 59 --body-file -");
  fires('gh pr review 59 --comment -b "looks good"');
});

test("fires on gh api writes to comments", () => {
  fires("gh api -X POST repos/o/r/pulls/59/comments/1/replies -f body='Fixed in abc'");
  fires("gh api -X PATCH repos/o/r/issues/comments/6 -F body=@c.md");
  fires("gh api --method POST repos/o/r/issues/59/comments -f body=hi");
});

test("stays quiet on reads and unrelated commands", () => {
  quiet("gh api repos/o/r/pulls/59/comments --jq '.[].body'");
  quiet("gh pr view 59 --json body");
  quiet("gh pr checks 59");
  quiet("git status --short");
});

test("silent on an empty payload", () => {
  const r = spawnSync("sh", [HOOK], { input: "" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString(), "");
});
