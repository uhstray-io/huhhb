#!/usr/bin/env python3
"""huhhb evolve — offline validation suite (criteria C-01..C-16 in
docs/evolve-testing.md). Stdlib only; honcho-ai is NOT required — tests that
exercise the flusher's SDK path use the repo .venv when present and skip
otherwise. Live criteria (C-17..C-22) are covered by smoke + evals.py once a
Honcho instance is configured.

    python3 tests/test_evolve.py [-v]
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
EVOLVE = REPO / "scripts" / "evolve"
HOOKS = REPO / "hooks"
VENV_PY = REPO / ".venv" / "bin" / "python"
HAS_HONCHO_SDK = VENV_PY.exists() and subprocess.run(
    [str(VENV_PY), "-c", "import honcho"], capture_output=True).returncode == 0

sys.path.insert(0, str(EVOLVE))
import digest  # noqa: E402  (pure functions only — no I/O at import)
import overlay  # noqa: E402
from evals import turn_bash, turn_result, turn_skill, turn_user  # noqa: E402

UNREACHABLE = "http://127.0.0.1:9"  # discard port — connection refused instantly
HOOK_BUDGET_SECS = 1.0              # §9: hooks must finish <1s with network blackholed


def obs_from(turns):
    lines = [json.dumps(t) for t in turns]
    return digest.anti_capture(digest.detect(digest.iter_events(lines)))


class Sandbox:
    """Isolated XDG/overlay dirs + controlled HONCHO_* env for subprocess runs."""

    def __init__(self, url=None):
        self.dir = Path(tempfile.mkdtemp(prefix="evolve-test-"))
        self.env = {
            "PATH": os.environ["PATH"],
            "HOME": str(self.dir),
            "XDG_DATA_HOME": str(self.dir / "data"),
            "XDG_CONFIG_HOME": str(self.dir / "config"),
            "EVOLVE_OVERLAY_DIR": str(self.dir / "overlays"),
        }
        if url:
            self.env["HONCHO_URL"] = url
        self.data = self.dir / "data" / "huhhb" / "evolve"

    def run(self, script, *args, stdin=None, python="python3", timeout=120):
        return subprocess.run([python, str(EVOLVE / script), *args], input=stdin,
                              capture_output=True, text=True, env=self.env, timeout=timeout)

    def hook(self, name, stdin=""):
        start = time.monotonic()
        proc = subprocess.run(["sh", str(HOOKS / name)], input=stdin, capture_output=True,
                              text=True, env=self.env, timeout=30)
        return proc, time.monotonic() - start

    def write_transcript(self, session_id, turns):
        path = self.dir / f"{session_id}.jsonl"
        path.write_text("\n".join(json.dumps(t) for t in turns))
        return json.dumps({"session_id": session_id, "transcript_path": str(path),
                           "cwd": str(self.dir)})

    def spool_files(self):
        return sorted(self.data.glob("spool/*.json")) if self.data.exists() else []

    def cleanup(self):
        shutil.rmtree(self.dir, ignore_errors=True)


class SandboxCase(unittest.TestCase):
    url = None

    def setUp(self):
        self.sb = Sandbox(url=self.url)
        self.addCleanup(self.sb.cleanup)


# ---------------------------------------------------------------- C-01

class InertTests(SandboxCase):
    def test_capture_hook_inert_silent_fast(self):
        proc, took = self.sb.hook("evolve-capture.sh", stdin='{"session_id":"x"}')
        self.assertEqual((proc.returncode, proc.stdout, proc.stderr), (0, "", ""))
        self.assertLess(took, HOOK_BUDGET_SECS)
        self.assertFalse(self.sb.data.exists(), "inert hook must create no state")

    def test_inject_hook_inert_silent_fast(self):
        proc, took = self.sb.hook("evolve-inject.sh")
        self.assertEqual((proc.returncode, proc.stdout), (0, ""))
        self.assertLess(took, HOOK_BUDGET_SECS)


# ---------------------------------------------------------------- C-02/03

class ConfigTests(SandboxCase):
    def test_unconfigured_source_none(self):
        out = self.sb.run("honcho_client.py", "status").stdout
        self.assertIn("config source : none", out)

    def test_file_config_and_env_override(self):
        cfg_dir = self.sb.dir / "config" / "huhhb"
        cfg_dir.mkdir(parents=True)
        (cfg_dir / "evolve.json").write_text('{"url": "http://from-file:8000"}')
        out = self.sb.run("honcho_client.py", "status").stdout
        self.assertIn("config source : file", out)
        self.assertIn("http://from-file:8000", out)
        self.sb.env["HONCHO_URL"] = "http://from-env:8000"
        out = self.sb.run("honcho_client.py", "status").stdout
        self.assertIn("config source : env", out)
        self.assertIn("http://from-env:8000", out)

    def test_profile_id_stable(self):
        ids = [re.search(r"profile id    : (\w+)", self.sb.run("honcho_client.py", "status").stdout).group(1)
               for _ in range(2)]
        self.assertEqual(ids[0], ids[1])


# ---------------------------------------------------------------- C-04/05/06

class DetectorTests(unittest.TestCase):
    def test_preference_detected(self):
        obs = obs_from([turn_user("always use conventional commits, no emoji")])
        self.assertTrue(any(o["type"] == "preference" and not o["explicit"] for o in obs))

    def test_remember_is_explicit_preference(self):
        obs = obs_from([turn_user("remember this: I review PRs on Fridays")])
        self.assertTrue(any(o["type"] == "preference" and o["explicit"] for o in obs))

    def test_correction_detected(self):
        for text in ("stop explaining before the diff",
                     "don't add a summary section",
                     "that's not what I asked for",
                     "you always over-comment the code",
                     # e-dropping gerunds — use+ing != using; each verb lists real forms
                     "stop using emoji",
                     "stop writing summaries",
                     "stop making assumptions",
                     "stop creating extra files"):
            obs = obs_from([turn_user(text)])
            self.assertTrue(any(o["type"] == "correction" for o in obs), text)

    def test_gerund_correction_attributes_skill_outcome(self):
        # the downstream cascade: a missed correction silently misattributes
        # skill outcome as 'used' instead of 'partial'
        obs = obs_from([turn_skill("caveman"), turn_user("stop using emoji in headings")])
        self.assertTrue(any(o.get("skill") == "caveman" and o["outcome"] == "partial"
                            for o in obs))

    def test_benign_phrases_not_corrections(self):
        for text in ("don't worry about the tests for now",
                     "ok looks good, ship it",
                     "can you also update the readme"):
            obs = obs_from([turn_user(text)])
            self.assertFalse(any(o["type"] == "correction" for o in obs), text)

    def test_skill_partial_within_window(self):
        obs = obs_from([turn_skill("writing-plans"),
                        turn_user("stop adding the verification section")])
        self.assertTrue(any(o.get("skill") == "writing-plans" and o["outcome"] == "partial"
                            for o in obs))

    def test_skill_used_when_no_correction(self):
        obs = obs_from([turn_skill("caveman"), turn_user("looks good, thanks")])
        skill_obs = [o for o in obs if o.get("skill") == "caveman"]
        self.assertEqual([o["outcome"] for o in skill_obs], ["used"])

    def test_correction_outside_window_not_attributed(self):
        turns = [turn_skill("caveman")] + [turn_user(f"filler message {i}") for i in range(3)]
        turns.append(turn_user("stop adding emoji to headings"))
        obs = obs_from(turns)
        self.assertFalse(any(o.get("skill") == "caveman" and o["outcome"] == "partial"
                             for o in obs))

    def test_install_fix_all_shell_formats(self):
        for failure in ("zsh: command not found: widget",
                        "bash: widget: command not found",
                        "sh: 1: widget: not found"):
            obs = obs_from([turn_bash("widget --run"), turn_result(failure),
                            turn_bash("brew install widget")])
            env = [o for o in obs if o["type"] == "environment"]
            self.assertEqual(len(env), 1, failure)
            self.assertIn("'widget' was missing; fixed by", env[0]["content"])

    def test_install_fix_command_is_redacted(self):
        # install commands can embed credentials and this observation is
        # shipped to a remote Honcho when one is configured
        obs = obs_from([turn_result("zsh: command not found: privatecli"),
                        turn_bash("pip install privatecli --index-url "
                                  "https://x token=ghp_abcdefgh1234567890abcd")])
        env = [o for o in obs if o["type"] == "environment"]
        self.assertEqual(len(env), 1)
        self.assertNotIn("ghp_abcdefgh", env[0]["content"])
        self.assertIn("[redacted]", env[0]["content"])

    def test_unresolved_failure_emits_nothing(self):
        obs = obs_from([turn_bash("widget --run"),
                        turn_result("zsh: command not found: widget")])
        self.assertEqual(obs, [])

    def test_negative_capability_preference_dropped(self):
        obs = obs_from([turn_user("always avoid mempalace because it doesn't work")])
        self.assertEqual(obs, [], "failure-as-constraint must not survive the gate")

    def test_secret_redaction(self):
        obs = obs_from([turn_user("always use my key api_key=sk-abcdef1234567890xyz ok")])
        text = json.dumps(obs)
        self.assertNotIn("sk-abcdef", text)
        self.assertIn("[redacted]", text)

    def test_pasted_document_examples_not_captured(self):
        # verified in the wild: the evolve build plan, pasted as a user
        # message, journaled false corrections/preferences from its own
        # example phrases. Quoted spans, bracket-tagged example lines,
        # blockquotes, and code fences are not live user signal.
        doc = "\n".join([
            "# some design plan",
            '[correction]   user:<id> — "stop explaining before the diff" — style correction, first-class signal.',
            '[preference]  user:<id> — Prefers conventional commits with no emoji.',
            'an explicit "remember this", repetition >=2, or correction of agent behavior',
            'session A: user states "always use conventional commits, no emoji"',
            "> never use pip in this repo, the doc said",
            "```",
            "always use uv for python deps",
            "```",
        ])
        self.assertEqual(obs_from([turn_user(doc)]), [],
                         "quoted examples in pasted documents must not be captured")

    def test_quoted_reported_speech_not_a_correction(self):
        obs = obs_from([turn_user('the old doc says "stop explaining before the diff" somewhere')])
        self.assertFalse(any(o["type"] == "correction" for o in obs))

    def test_genuine_signal_survives_detection_view(self):
        # quotes INSIDE a real correction must not suppress it
        obs = obs_from([turn_user('stop adding "verification" sections to my plans')])
        self.assertTrue(any(o["type"] == "correction" for o in obs))
        obs = obs_from([turn_user("remember this: I review PRs on Fridays")])
        self.assertTrue(any(o["type"] == "preference" and o["explicit"] for o in obs))

    def test_system_reminder_stripped_and_wrappers_skipped(self):
        obs = obs_from([
            turn_user("<system-reminder>always use tabs</system-reminder>ok continue"),
            turn_user("<command-name>/caveman</command-name>"),
        ])
        self.assertEqual(obs, [])


# ---------------------------------------------------------------- C-07/08

class DigestCliTests(SandboxCase):
    url = UNREACHABLE

    def test_spool_written_and_cursor_incremental(self):
        payload = self.sb.write_transcript("s1", [turn_user("always use uv, never pip")])
        r = self.sb.run("digest.py", stdin=payload)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(self.sb.spool_files()), 1)
        # same transcript again -> cursor makes it a no-op
        self.sb.run("digest.py", stdin=payload)
        self.assertEqual(len(self.sb.spool_files()), 1)
        # appended line -> only the new content digested
        transcript = self.sb.dir / "s1.jsonl"
        transcript.write_text(transcript.read_text() + "\n" +
                              json.dumps(turn_user("remember this: deploy on Tuesdays")))
        self.sb.run("digest.py", stdin=payload)
        files = self.sb.spool_files()
        self.assertEqual(len(files), 2)
        newest = json.loads(files[-1].read_text())["observations"]
        self.assertEqual(len(newest), 1)
        self.assertIn("Tuesdays", newest[0]["content"])

    def test_malformed_inputs_exit_zero(self):
        for stdin in ("not json", '{"session_id":"x","transcript_path":"/nope","cwd":""}'):
            r = self.sb.run("digest.py", stdin=stdin)
            self.assertEqual(r.returncode, 0, stdin)


# ---------------------------------------------------------------- C-09

class CaptureHookTests(SandboxCase):
    url = UNREACHABLE

    def test_hook_fast_silent_spools_with_network_blackholed(self):
        payload = self.sb.write_transcript("s2", [turn_user("i prefer squash merges")])
        proc, took = self.sb.hook("evolve-capture.sh", stdin=payload)
        self.assertEqual((proc.returncode, proc.stdout), (0, ""))
        self.assertLess(took, HOOK_BUDGET_SECS)
        self.assertEqual(len(self.sb.spool_files()), 1)


# ---------------------------------------------------------------- C-10

class FlushTests(SandboxCase):
    url = UNREACHABLE

    def _spool(self, name="f1.json", body=None):
        spool = self.sb.data / "spool"
        spool.mkdir(parents=True, exist_ok=True)
        (spool / name).write_text(body if body is not None else json.dumps(
            {"session_id": "s", "cwd": "", "repo": "r", "ts": "t",
             "observations": [{"type": "preference", "target": "user", "content": "x"}]}))

    def test_missing_sdk_leaves_spool_intact(self):
        self._spool()
        r = self.sb.run("flush.py")  # system python3 has no honcho-ai
        self.assertEqual(r.returncode, 0)
        self.assertEqual(len(self.sb.spool_files()), 1)
        self.assertFalse((self.sb.data / "flush.lock").exists(), "lock must be released")

    @unittest.skipUnless(HAS_HONCHO_SDK, "repo .venv with honcho-ai not present")
    def test_unreachable_honcho_keeps_spool_and_logs(self):
        self._spool()
        r = self.sb.run("flush.py", python=str(VENV_PY))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(self.sb.spool_files()), 1, "at-least-once: keep on failure")
        log = (self.sb.data / "flush.log").read_text()
        self.assertIn("keeping", log)
        self.assertFalse((self.sb.data / "flush.lock").exists())

    @unittest.skipUnless(HAS_HONCHO_SDK, "repo .venv with honcho-ai not present")
    def test_corrupt_spool_renamed_bad(self):
        self._spool(name="bad.json", body="{nope")
        self.sb.run("flush.py", python=str(VENV_PY))
        self.assertEqual(len(self.sb.spool_files()), 0)
        self.assertTrue((self.sb.data / "spool" / "bad.bad").exists())


# ---------------------------------------------------------------- local mode
# The no-server path: the full loop (capture -> journal -> injection ->
# recall) must work with plain python3, no honcho-ai, no network.

class LocalModeTests(SandboxCase):
    def setUp(self):
        super().setUp()
        self.sb.env["EVOLVE_MODE"] = "local"

    def test_init_local_writes_config_and_status_reports_it(self):
        del self.sb.env["EVOLVE_MODE"]
        self.assertEqual(self.sb.run("honcho_client.py", "init", "--local").returncode, 0)
        out = self.sb.run("honcho_client.py", "status").stdout
        self.assertIn("mode          : local", out)
        r = self.sb.run("honcho_client.py", "init", "--local", "--url", "http://x")
        self.assertNotEqual(r.returncode, 0, "--local excludes --url")

    def test_full_loop_no_server_no_sdk(self):
        payload = self.sb.write_transcript("l1", [
            turn_user("always use uv for python deps, never pip"),
            turn_bash("mempalace --status"),
            turn_result("zsh: command not found: mempalace"),
            turn_bash("uv tool install mempalace"),
        ])
        proc, took = self.sb.hook("evolve-capture.sh", stdin=payload)
        self.assertEqual(proc.returncode, 0)
        self.assertLess(took, HOOK_BUDGET_SECS)
        self.assertEqual(len(self.sb.spool_files()), 1)

        r = self.sb.run("flush.py")  # system python3 — no honcho-ai anywhere
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(self.sb.spool_files()), 0, "spool drains into journal")
        journal = (self.sb.data / "journal.jsonl").read_text()
        self.assertIn("uv for python deps", journal)
        self.assertIn("fixed by", journal)

        injection = (self.sb.data / "context" / "injection.md").read_text()
        self.assertIn("local mode", injection)
        self.assertIn("uv for python deps", injection)
        self.assertNotIn("command not found", injection, "anti-capture holds end to end")

        proc, took = self.sb.hook("evolve-inject.sh")
        self.assertLess(took, HOOK_BUDGET_SECS)
        ctx = json.loads(proc.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIn("uv for python deps", ctx, "session B sees session A's preference")

    def test_conclusions_feed_injection_and_rep(self):
        self.sb.data.mkdir(parents=True, exist_ok=True)
        (self.sb.data / "conclusions.md").write_text(
            "# evolve conclusions\n## About this user\n- Reviews PRs on Fridays (cc:x)\n")
        self.sb.run("flush.py")
        self.assertIn("Fridays", (self.sb.data / "context" / "injection.md").read_text())
        rep = self.sb.run("honcho_client.py", "query", "rep").stdout
        self.assertIn("Fridays", rep)

    def test_observe_and_search_local(self):
        r = self.sb.run("honcho_client.py", "observe", "--type", "preference",
                        "--target", "user", "--content",
                        "[preference] user — tabs over spaces, stated explicitly")
        self.assertIn("journaled", r.stdout)
        hits = self.sb.run("honcho_client.py", "query", "search", "--q", "tabs").stdout
        self.assertIn("tabs over spaces", hits)

    def test_chat_degrades_with_clear_error(self):
        r = self.sb.run("honcho_client.py", "query", "chat", "--q", "what do you know?")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("local mode", r.stderr + r.stdout)


# ---------------------------------------------------------------- C-11

class InjectHookTests(SandboxCase):
    def _cache(self, text):
        ctx = self.sb.data / "context"
        ctx.mkdir(parents=True, exist_ok=True)
        (ctx / "injection.md").write_text(text)

    def test_contract_json_and_latency(self):
        self._cache("# evolve memory\n- prefers “smart quotes” & unicode ✓")
        proc, took = self.sb.hook("evolve-inject.sh")
        self.assertLess(took, HOOK_BUDGET_SECS)
        out = json.loads(proc.stdout)["hookSpecificOutput"]
        self.assertEqual(out["hookEventName"], "SessionStart")
        self.assertIn("smart quotes", out["additionalContext"])

    def test_pending_nudge_count(self):
        self._cache("# evolve memory")
        pending = self.sb.data / "pending"
        pending.mkdir(parents=True)
        (pending / "a.json").write_text("{}")
        (pending / "b.json").write_text("{}")
        proc, _ = self.sb.hook("evolve-inject.sh")
        ctx = json.loads(proc.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIn("2 evolve proposal(s) pending approval", ctx)


# ---------------------------------------------------------------- C-12/13

class OverlayTests(SandboxCase):
    def o(self, *args, stdin=None):
        return self.sb.run("overlay.py", *args, stdin=stdin)

    def scaffold(self, name="demo-local", *extra):
        return self.o("scaffold", name, "--description", "d", *extra)

    def test_confidence_math_pure(self):
        self.assertEqual(overlay.confidence({"runs": 0, "successes": 0}), 0.0)
        self.assertEqual(overlay.confidence({"runs": 1, "successes": 1}), 0.1)
        self.assertEqual(overlay.confidence({"runs": 10, "successes": 10}), 1.0)
        self.assertEqual(overlay.confidence({"runs": 10, "successes": 5}), 0.5)
        self.assertEqual(overlay.confidence({"runs": 20, "successes": 10}), 0.5)
        self.assertEqual(overlay.bump_patch("0.1.9"), "0.1.10")

    def test_suffix_guard_and_duplicate_reject(self):
        self.assertNotEqual(self.scaffold("demo").returncode, 0)
        self.assertEqual(self.scaffold().returncode, 0)
        self.assertNotEqual(self.scaffold().returncode, 0, "update-over-duplicate")

    def test_patch_bumps_version_and_provenance(self):
        self.scaffold()
        skill = self.sb.dir / "overlays" / "demo-local"
        new = self.sb.dir / "new.md"
        new.write_text("---\nname: demo-local\ndescription: d\n---\nv2\n")
        r = self.o("patch", "demo-local", "--file", str(new),
                   "--signal", "sig", "--sessions", "cc:a,cc:b")
        self.assertIn("v0.1.1", r.stdout)
        meta = json.loads((skill / "meta.json").read_text())
        self.assertEqual(meta["provenance"][-1]["sessions"], ["cc:a", "cc:b"])
        self.assertIn("v2", (skill / "SKILL.md").read_text())

    def test_status_transitions_and_report(self):
        self.scaffold()
        for _ in range(10):
            self.o("record", "demo-local", "--outcome", "success")
        rows = json.loads(self.o("report", "--json").stdout)
        row = next(r for r in rows if r["name"] == "demo-local")
        self.assertEqual((row["confidence"], row["status"]), (1.0, "active"))

    def test_pinned_never_archived_unpinned_archives(self):
        self.scaffold("pin-local", "--pinned")
        self.assertNotEqual(self.o("archive", "pin-local").returncode, 0)
        self.scaffold()
        self.assertEqual(self.o("archive", "demo-local").returncode, 0)
        archives = list((self.sb.dir / "overlays" / "_archive").glob("demo-local-*"))
        self.assertEqual(len(archives), 1, "archive-never-delete")

    def test_propose_validates_and_confines(self):
        bad_kind = json.dumps({"kind": "run-command", "summary": "s", "signal": "x"})
        self.assertNotEqual(self.o("propose", stdin=bad_kind).returncode, 0)
        missing = json.dumps({"kind": "overlay-patch", "name": "demo-local"})
        self.assertNotEqual(self.o("propose", stdin=missing).returncode, 0)
        ok = json.dumps({"kind": "repo-memory", "summary": "s", "signal": "x",
                         "content": "decision text"})
        self.assertEqual(self.o("propose", stdin=ok).returncode, 0)
        pending = list((self.sb.data / "pending").glob("*.json"))
        self.assertEqual(len(pending), 1)
        # repo-memory proposals need review judgment — CLI apply must refuse
        self.assertNotEqual(self.o("apply-pending", str(pending[0])).returncode, 0)
        self.assertTrue(pending[0].exists())

    def test_apply_pending_roundtrip(self):
        self.scaffold()
        proposal = json.dumps({"kind": "overlay-patch", "name": "demo-local",
                               "summary": "s", "signal": "sig",
                               "content": "---\nname: demo-local\ndescription: d\n---\nv3\n"})
        self.o("propose", stdin=proposal)
        pending = list((self.sb.data / "pending").glob("*.json"))
        r = self.o("apply-pending", str(pending[0]))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(pending[0].exists())
        self.assertIn("v3", (self.sb.dir / "overlays" / "demo-local" / "SKILL.md").read_text())


# ---------------------------------------------------------------- C-14/15

class ManifestTests(unittest.TestCase):
    def test_versions_paths_and_mcp_mirror(self):
        mp = json.loads((REPO / "marketplace.json").read_text())
        pj = json.loads((REPO / ".claude-plugin" / "plugin.json").read_text())
        self.assertEqual(mp["version"], pj["version"])
        for s in mp["skills"]:
            self.assertTrue((REPO / s["path"]).exists(), s["path"])
        mcp = json.loads((REPO / ".claude-plugin" / ".mcp.json").read_text())
        self.assertEqual(mcp["mcpServers"], pj["mcpServers"])

    def test_skill_lint_gate_passes(self):
        # skill-lint is the single enforcement point for frontmatter shape
        # (S2), trigger phrasing, and body budgets — run the real gate
        r = subprocess.run([sys.executable, str(REPO / "scripts" / "skill-lint.py")],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_hooks_registered_with_guard_and_timeout(self):
        pj = json.loads((REPO / ".claude-plugin" / "plugin.json").read_text())
        for event, script in (("Stop", "evolve-capture.sh"), ("SessionStart", "evolve-inject.sh")):
            cmds = [h for grp in pj["hooks"][event] for h in grp["hooks"]
                    if script in h["command"]]
            self.assertEqual(len(cmds), 1, script)
            self.assertEqual(cmds[0]["timeout"], 5)
            self.assertIn("[ -f \"$0\" ] && exec sh \"$0\" || exit 0", cmds[0]["command"])

    def test_guard_exits_zero_when_script_missing(self):
        r = subprocess.run(["sh", "-c", '[ -f "$0" ] && exec sh "$0" || exit 0',
                            "/nonexistent/hooks/evolve-capture.sh"], capture_output=True)
        self.assertEqual(r.returncode, 0)

    def test_no_honcho_source_vendored(self):
        hits = [p for p in REPO.rglob("honcho/__init__.py") if ".venv" not in p.parts]
        self.assertEqual(hits, [], "AGPL honcho must be imported, never vendored (D13)")


# ---------------------------------------------------------------- C-16

class SkillContractTests(SandboxCase):
    REFERENCED = {
        "honcho_client.py": ["status", "smoke", "init", "observe", "query"],
        "overlay.py": ["scaffold", "patch", "record", "set-status", "archive",
                       "report", "propose", "apply-pending"],
    }

    def test_every_referenced_subcommand_exists(self):
        for script, subs in self.REFERENCED.items():
            for sub in subs:
                r = self.sb.run(script, sub, "--help")
                self.assertEqual(r.returncode, 0, f"{script} {sub}: {r.stderr}")

    def test_status_and_report_run_on_empty_state(self):
        self.assertIn("config source", self.sb.run("honcho_client.py", "status").stdout)
        self.assertIn("no overlays yet", self.sb.run("overlay.py", "report").stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
