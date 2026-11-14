// Offline tests for the merge guard hook (hooks/pr-merge-guard.sh): denies `gh pr merge` while the PR
// has unresolved review threads whose last comment is not the merging user's. `gh` is a PATH stub.
// Run: node --test tests/test_pr_merge_guard.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOOK = resolve(import.meta.dirname, "../hooks/pr-merge-guard.sh");

// Stub gh: `pr view` prints PR 7; `api graphql` prints $FAKE_OPEN (the unanswered-thread count) or fails
// when FAKE_FAIL=1. Every call is logged to $FAKE_LOG.
function stub() {
  const dir = mkdtempSync(join(tmpdir(), "huhhb-merge-guard-"));
  const gh = join(dir, "gh");
  writeFileSync(gh, `#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "pr view") echo 7 ;;
  "api graphql") [ "$FAKE_FAIL" = 1 ] && exit 1; echo "$FAKE_OPEN" ;;
  *) exit 1 ;;
esac
`);
  chmodSync(gh, 0o755);
  return { dir, log: join(dir, "calls.log") };
}

function run(command: string, open = "0", fail = "0") {
  const s = stub();
  writeFileSync(s.log, "");
  const r = spawnSync("sh", [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", cwd: s.dir, tool_input: { command } }),
    env: { PATH: `${s.dir}:${process.env.PATH}`, FAKE_OPEN: open, FAKE_FAIL: fail, FAKE_LOG: s.log },
  });
  assert.equal(r.status, 0, r.stderr.toString());
  const out = r.stdout.toString();
  return { out: out ? JSON.parse(out) : null, calls: readFileSync(s.log, "utf8") };
}

test("denies a merge while review threads are unanswered", () => {
  const { out, calls } = run("gh pr merge 60 --merge", "4");
  assert.equal(out?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /4 unresolved review thread/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /REVIEW_ANSWERED=1/);
  assert.match(calls, /-F n=60/, "queries the PR named in the command");
});

test("allows a merge when every thread is resolved or answered", () => {
  assert.equal(run("gh pr merge 60 --merge", "0").out, null);
});

test("with no PR number, asks gh for the current branch's PR", () => {
  const { out, calls } = run("cd /repo && gh pr merge --merge", "1");
  assert.equal(out?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(calls, /pr view --json number/);
  assert.match(calls, /-F n=7/);
});

test("the acknowledgement prefix lets the merge through without a query", () => {
  const { out, calls } = run("REVIEW_ANSWERED=1 gh pr merge 60 --merge", "4");
  assert.equal(out, null);
  assert.equal(calls, "");
});

test("fails open when gh cannot answer", () => {
  assert.equal(run("gh pr merge 60 --merge", "", "1").out, null);
});

test("ignores other commands and mere mentions", () => {
  for (const cmd of ["gh pr view 60", "git status", 'git commit -m "run gh pr merge after review"']) {
    const { out, calls } = run(cmd, "4");
    assert.equal(out, null, cmd);
    assert.equal(calls, "", cmd);
  }
});
