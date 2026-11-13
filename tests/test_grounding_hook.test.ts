// Offline tests for the grounding nudge hook (hooks/grounding-check.sh): line-volume trigger.
// Run: node --test tests/test_grounding_hook.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOOK = resolve(import.meta.dirname, "../hooks/grounding-check.sh");
const SID = "test-session";

const GIT_ENV = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid",
  GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid",
};

function git(cwd: string, ...args: string[]) {
  const r = spawnSync("git", ["-c", "init.defaultBranch=main", ...args], { cwd, env: { ...process.env, ...GIT_ENV } });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.toString().trim();
}

const lines = (n: number, tag = "x") => Array.from({ length: n }, (_, i) => `${tag}${i}`).join("\n") + "\n";

// One sandbox per test: isolated HOME (no real marker), isolated TMPDIR (state file), a repo.
function sandbox(threshold = 10) {
  const root = mkdtempSync(join(tmpdir(), "huhhb-grounding-test-"));
  const home = join(root, "home"); const tmp = join(root, "tmp"); const repo = join(root, "repo");
  for (const d of [home, tmp, repo]) spawnSync("mkdir", ["-p", d]);
  git(repo, "init", "-q");
  writeFileSync(join(repo, "a.txt"), "seed\n");
  git(repo, "add", "-A"); git(repo, "commit", "-qm", "seed");
  const env = {
    PATH: process.env.PATH ?? "", HOME: home, TMPDIR: tmp, ...GIT_ENV,
    HUHHB_GROUNDING: "1", HUHHB_GROUNDING_LINES: String(threshold),
    HUHHB_GROUNDING_IDLE_MIN: "99999", HUHHB_GROUNDING_COOLDOWN_MIN: "0",
  };
  const run = (cwd = repo, extra: Record<string, string> = {}) => {
    const r = spawnSync("sh", [HOOK], {
      input: JSON.stringify({ session_id: SID, cwd, hook_event_name: "UserPromptSubmit", prompt: "hi" }),
      env: { ...env, ...extra },
    });
    assert.equal(r.status, 0, r.stderr.toString());
    return r.stdout.toString();
  };
  return { root, repo, run, state: join(tmp, `huhhb-grounding-${SID}`) };
}

test("under threshold stays quiet; crossing it nudges with the count", () => {
  const s = sandbox(10);
  assert.equal(s.run(), "", "first prompt only takes the baseline");
  writeFileSync(join(s.repo, "b.txt"), lines(5));
  assert.equal(s.run(), "");
  writeFileSync(join(s.repo, "c.txt"), lines(10));
  const out = s.run();
  assert.match(out, /"additionalContext"/);
  assert.match(out, /15 lines changed/);
  assert.match(out, /threshold 10/);
});

test("added + deleted both count", () => {
  const s = sandbox(10);
  writeFileSync(join(s.repo, "a.txt"), lines(6));
  git(s.repo, "add", "-A"); git(s.repo, "commit", "-qm", "six");
  s.run();
  writeFileSync(join(s.repo, "a.txt"), lines(6, "y")); // 6 deleted + 6 added
  assert.match(s.run(), /12 lines changed/);
});

test("lockfiles and binary files are excluded", () => {
  const s = sandbox(10);
  s.run();
  spawnSync("mkdir", ["-p", join(s.repo, "sub")]);
  writeFileSync(join(s.repo, "package-lock.json"), lines(500));
  writeFileSync(join(s.repo, "sub", "yarn.lock"), lines(500));
  writeFileSync(join(s.repo, "blob.bin"), Buffer.from("\0\n".repeat(500)));
  assert.equal(s.run(), "");
});

test("untracked files marked -diff in .gitattributes are excluded", () => {
  const s = sandbox(10);
  writeFileSync(join(s.repo, ".gitattributes"), "*.gen -diff\n");
  git(s.repo, "add", "-A"); git(s.repo, "commit", "-qm", "attrs");
  s.run();
  writeFileSync(join(s.repo, "big.gen"), lines(500));
  assert.equal(s.run(), "");
});

test("committing work does not change the count", () => {
  const s = sandbox(10);
  s.run();
  writeFileSync(join(s.repo, "b.txt"), lines(6));
  assert.equal(s.run(), "");
  git(s.repo, "add", "-A"); git(s.repo, "commit", "-qm", "b");
  assert.equal(s.run(), "", "still 6 after commit");
  writeFileSync(join(s.repo, "c.txt"), lines(4));
  assert.match(s.run(), /10 lines changed/);
});

test("uncommitted work present at session start is not counted", () => {
  const s = sandbox(10);
  writeFileSync(join(s.repo, "pre.txt"), lines(50));
  assert.equal(s.run(), "");
  assert.equal(s.run(), "");
  writeFileSync(join(s.repo, "b.txt"), lines(10));
  assert.match(s.run(), /10 lines changed/);
});

test("non-git cwd never nudges on lines", () => {
  const s = sandbox(1);
  const plain = join(s.root, "home");
  writeFileSync(join(plain, "f.txt"), lines(100));
  assert.equal(s.run(plain), "");
  assert.equal(s.run(plain), "");
});

test("reset=1 from the skill restarts the count", () => {
  const s = sandbox(10);
  s.run();
  writeFileSync(join(s.repo, "b.txt"), lines(12));
  assert.match(s.run(), /12 lines changed/);
  appendFileSync(s.state, "reset=1\n");
  assert.equal(s.run(), "", "reset re-baselines");
  writeFileSync(join(s.repo, "c.txt"), lines(5));
  assert.equal(s.run(), "", "only 5 since reset");
});

test("reset=1 survives a prompt outside git until a baseline is set", () => {
  const s = sandbox(10);
  s.run();
  writeFileSync(join(s.repo, "b.txt"), lines(12));
  appendFileSync(s.state, "reset=1\n");
  assert.equal(s.run(join(s.root, "home")), "", "non-git prompt");
  assert.equal(s.run(), "", "reset still applied back in the repo");
});

test("switching to a non-descendant commit re-baselines instead of nudging", () => {
  const s = sandbox(10);
  const seed = git(s.repo, "rev-parse", "HEAD");
  writeFileSync(join(s.repo, "b.txt"), lines(3));
  git(s.repo, "add", "-A"); git(s.repo, "commit", "-qm", "b");
  s.run();
  git(s.repo, "checkout", "-qb", "other", seed);
  writeFileSync(join(s.repo, "big.txt"), lines(100));
  git(s.repo, "add", "-A"); git(s.repo, "commit", "-qm", "big");
  assert.equal(s.run(), "");
  writeFileSync(join(s.repo, "c.txt"), lines(10));
  assert.match(s.run(), /10 lines changed/);
});

test("idle-return nudge still fires", () => {
  const s = sandbox(10000);
  s.run();
  assert.match(s.run(s.repo, { HUHHB_GROUNDING_IDLE_MIN: "0" }), /idle gap/);
});

test("lines= in the marker file sets the threshold", () => {
  const s = sandbox(10);
  spawnSync("mkdir", ["-p", join(s.root, "home", ".claude")]);
  writeFileSync(join(s.root, "home", ".claude", "grounding.on"), "interval_min=5\nlines=3\n");
  s.run(s.repo, { HUHHB_GROUNDING_LINES: "" });
  writeFileSync(join(s.repo, "b.txt"), lines(3));
  assert.match(s.run(s.repo, { HUHHB_GROUNDING_LINES: "" }), /threshold 3/);
});
