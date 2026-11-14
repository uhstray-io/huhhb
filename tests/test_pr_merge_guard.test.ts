// Offline tests for the merge guard hook (hooks/pr-merge-guard.sh): denies `gh pr merge` while the PR
// has unresolved review threads whose last comment is not the merging user's. `gh` is a PATH stub.
// Run: node --test tests/test_pr_merge_guard.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOOK = resolve(import.meta.dirname, "../hooks/pr-merge-guard.sh");
const HAS_JQ = spawnSync("sh", ["-c", "command -v jq"]).status === 0;

// Stub gh. Logs "<cwd>|<args>" per call to $FAKE_LOG.
//   pr view --json number …        -> 7 (the current branch's PR)
//   pr view <selector> --json …    -> 9
//   api graphql …                  -> exit 1 if FAKE_FAIL=1; else the --jq filter applied to $FAKE_JSON
//                                     when set, else $FAKE_OPEN
function stub() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "huhhb-merge-guard-")));
  const gh = join(dir, "gh");
  writeFileSync(gh, `#!/bin/sh
printf '%s|%s\\n' "$PWD" "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "pr view") [ "$3" = "--json" ] && echo 7 || echo 9 ;;
  "api graphql")
    [ "$FAKE_FAIL" = 1 ] && exit 1
    if [ -n "$FAKE_JSON" ]; then
      while [ $# -gt 0 ]; do [ "$1" = "--jq" ] && { printf '%s' "$FAKE_JSON" | jq -r "$2"; exit; }; shift; done
    fi
    echo "$FAKE_OPEN" ;;
  *) exit 1 ;;
esac
`);
  chmodSync(gh, 0o755);
  return { dir, log: join(dir, "calls.log") };
}

function run(command: string, opts: { open?: string; fail?: string; json?: string } = {}) {
  const s = stub();
  writeFileSync(s.log, "");
  const r = spawnSync("sh", [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", cwd: s.dir, tool_input: { command } }),
    env: {
      PATH: `${s.dir}:${process.env.PATH}`, FAKE_LOG: s.log,
      FAKE_OPEN: opts.open ?? "0", FAKE_FAIL: opts.fail ?? "0", FAKE_JSON: opts.json ?? "",
    },
  });
  assert.equal(r.status, 0, r.stderr.toString());
  const out = r.stdout.toString();
  return { out: out ? JSON.parse(out) : null, calls: readFileSync(s.log, "utf8"), dir: s.dir };
}
const denied = (o: { out: any }) => o.out?.hookSpecificOutput?.permissionDecision === "deny";

test("denies a merge while review threads are unanswered", () => {
  const r = run("gh pr merge 60 --merge", { open: "4" });
  assert.ok(denied(r));
  assert.match(r.out.hookSpecificOutput.permissionDecisionReason, /PR #60 has 4 unresolved review thread/);
  assert.match(r.out.hookSpecificOutput.permissionDecisionReason, /REVIEW_ANSWERED=1/);
  assert.match(r.calls, /-F n=60/);
});

test("allows a merge when every thread is resolved or answered", () => {
  assert.equal(run("gh pr merge 60 --merge", { open: "0" }).out, null);
});

test("finds the PR wherever the selector sits", () => {
  for (const cmd of [
    "gh pr merge --merge 62",
    "gh pr merge --merge --delete-branch 62",
    "gh pr merge --auto --merge 62",
    "gh pr merge https://github.com/o/r/pull/62 --merge",
    "gh pr merge --body 'merging 3 fixes' --merge 62",
    "gh pr merge -t 'Ship 3' --match-head-commit abc123 62 --merge",
  ]) {
    const r = run(cmd, { open: "1" });
    assert.ok(denied(r), cmd);
    assert.match(r.calls, /-F n=62/, cmd);
  }
});

test("a branch selector is resolved with gh pr view", () => {
  const r = run("gh pr merge my-branch --merge", { open: "1" });
  assert.match(r.calls, /pr view my-branch --json number/);
  assert.match(r.calls, /-F n=9/);
});

test("with no selector, asks gh for the current branch's PR", () => {
  const r = run("cd /repo && gh pr merge --merge", { open: "1" });
  assert.ok(denied(r));
  assert.match(r.calls, /pr view --json number/);
  assert.match(r.calls, /-F n=7/);
});

test("-R queries that repository", () => {
  const r = run("gh pr merge -R uhstray-io/other 5 --merge", { open: "1" });
  assert.match(r.calls, /-F owner=uhstray-io -F name=other -F n=5/);
});

test("gh runs in the session's directory", () => {
  const r = run("gh pr merge 60 --merge", { open: "0" });
  assert.match(r.calls, new RegExp(`^${r.dir}\\|api graphql`, "m"));
});

test("every merge in the command is checked", () => {
  const r = run("gh pr merge 61 --merge && gh pr merge 62 --merge", { open: "0" });
  assert.match(r.calls, /-F n=61/);
  assert.match(r.calls, /-F n=62/);
  const acked = run("REVIEW_ANSWERED=1 gh pr merge 61 --merge && gh pr merge 62 --merge", { open: "2" });
  assert.ok(denied(acked), "the unacknowledged second merge is still checked");
  assert.doesNotMatch(acked.calls, /-F n=61/);
});

test("the acknowledgement prefix lets the merge through without a query", () => {
  const r = run("REVIEW_ANSWERED=1 gh pr merge 60 --merge", { open: "4" });
  assert.equal(r.out, null);
  assert.equal(r.calls, "");
});

test("fails open when gh cannot answer", () => {
  assert.equal(run("gh pr merge 60 --merge", { fail: "1" }).out, null);
});

test("ignores other commands and mere mentions", () => {
  for (const cmd of ["gh pr view 60", "git status", 'git commit -m "run gh pr merge after review"']) {
    const r = run(cmd, { open: "4" });
    assert.equal(r.out, null, cmd);
    assert.equal(r.calls, "", cmd);
  }
});

test("counts only unresolved threads whose last comment is not the merger's", { skip: !HAS_JQ && "jq not installed" }, () => {
  const thread = (resolved: boolean, last: string | null) =>
    ({ isResolved: resolved, comments: { nodes: [{ author: last === null ? null : { login: last } }] } });
  const data = (...nodes: object[]) =>
    JSON.stringify({ data: { viewer: { login: "me" }, repository: { pullRequest: { reviewThreads: { nodes } } } } });
  const one = run("gh pr merge 60 --merge", { json: data(thread(true, "bot"), thread(false, "me"), thread(false, "bot")) });
  assert.match(one.out?.hookSpecificOutput?.permissionDecisionReason ?? "", /has 1 unresolved/);
  assert.equal(run("gh pr merge 60 --merge", { json: data(thread(false, "me"), thread(true, "bot")) }).out, null);
  assert.ok(denied(run("gh pr merge 60 --merge", { json: data(thread(false, null)) })), "a deleted author still counts");
  assert.match(one.calls, /comments\(last: 1\)/, "the last comment decides who answered");
});
