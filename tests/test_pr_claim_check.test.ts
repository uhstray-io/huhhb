// Offline tests for the PR claim-check hook (hooks/pr-claim-check.sh): denies posting text to GitHub
// until the gh call is prefixed with CLAIMS_VERIFIED=1.
// Run: node --test tests/test_pr_claim_check.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const HOOK = resolve(import.meta.dirname, "../hooks/pr-claim-check.sh");

function run(command: string, description = "") {
  const r = spawnSync("sh", [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command, description } }),
  });
  assert.equal(r.status, 0, r.stderr.toString());
  const out = r.stdout.toString();
  return out ? JSON.parse(out) : null; // stdout must stay valid JSON
}

function denies(cmd: string, description = "") {
  const out = run(cmd, description);
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
  denies("cat > b.md <<'EOF'\nbody\nEOF\ngh pr create --body-file b.md"); // gh at a line start
  denies('echo "$(gh pr comment 5 -b x)"');
  denies("echo `gh pr comment 5 -b x`");
  denies("GH_REPO=o/r gh pr create --body-file body.md"); // only CLAIMS_VERIFIED=1 lets a post through
});

test("denies gh api writes to comments, each write form on its own", () => {
  denies("gh api -X POST repos/o/r/pulls/59/comments/1/replies --input body.json");
  denies("gh api -X PATCH repos/o/r/issues/comments/6 --input c.json");
  denies("gh api --method POST repos/o/r/issues/59/comments --input body.json");
  denies("gh api repos/o/r/issues/59/comments -f body=hi");
  denies("gh api repos/o/r/issues/59/comments -F body=@c.md");
  denies("gh api repos/o/r/issues/59/comments --field body=hi");
  denies("gh api repos/o/r/issues/59/comments --raw-field body=hi");
  denies('gh api -X POST "repos/o/r/issues/59/comments" --input b.json');
  denies('gh api -H "Accept: application/vnd.github+json" -X POST repos/o/r/issues/59/comments --input b.json');
  // a GET mentioned in the body text is not a read
  denies("gh api -X POST repos/o/r/pulls/60/comments/9/replies -f body='Fixed: an explicit -X GET is now a read'");
  denies("gh api repos/o/r/issues/60/comments -f body='use --method GET for reads'");
  denies('gh api repos/o/r/issues/60/comments -f body="use --method GET for reads"');
  // a \ line continuation keeps the call together
  denies("gh api repos/o/r/pulls/60/comments/123/replies \\\n  -f body='Fixed in abc'");
  denies("gh api \\\n  -X POST \\\n  repos/o/r/issues/5/comments \\\n  --input b.json");
});

test("the acknowledgement only counts as the gh call's own prefix", () => {
  allows("CLAIMS_VERIFIED=1 gh pr create --base main --body-file body.md");
  allows("cd /repo && CLAIMS_VERIFIED=1 gh api -X POST repos/o/r/issues/59/comments -f body=hi");
  denies("gh pr create --body 'Fixes the CLAIMS_VERIFIED=1 typo'");
  denies("gh api repos/o/r/issues/59/comments -f body='re-run with CLAIMS_VERIFIED=1'");
  denies("gh pr create -b x", "Open PR (CLAIMS_VERIFIED=1 next)");
  denies("NOT_CLAIMS_VERIFIED=1 gh pr create -b x");
  denies("CLAIMS_VERIFIED=10 gh pr create -b x");
  // each line is its own gh call: acknowledging one does not cover the next
  denies("CLAIMS_VERIFIED=1 gh api repos/o/r/pulls/5 --jq .head.sha\ngh pr comment 5 -b x");
  denies("CLAIMS_VERIFIED=1 gh api -X POST repos/o/r/issues/5/comments -f body=a\ngh api -X POST repos/o/r/issues/6/comments -f body=b");
  allows("gh api repos/o/r/pulls/5 --jq .head.sha\nCLAIMS_VERIFIED=1 gh pr comment 5 -b x");
});

test("allows reads, unrelated commands, and mentions inside text", () => {
  allows("gh api repos/o/r/pulls/59/comments --jq '.[].body'");
  allows('gh api "repos/o/r/pulls/59/comments" --jq ".[].body"');
  allows("gh api repos/o/r/pulls/5/comments --method GET -f per_page=100");
  allows("gh api repos/o/r/pulls/5/comments > c.json && grep -F 'x' c.json");
  allows("gh api -X POST repos/o/r/pulls/5/requested_reviewers -f reviewers[]=x"); // not a comments endpoint
  allows("gh pr view 59 --json body");
  allows("gh pr checks 59");
  allows("git status --short");
  allows('git commit -m "hook fires on gh pr create and gh pr comment"');
  allows('git commit -m "feat(hooks): gate posts (gh pr create) until checked"');
});

test("silent on an empty payload", () => {
  const r = spawnSync("sh", [HOOK], { input: "" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString(), "");
});
