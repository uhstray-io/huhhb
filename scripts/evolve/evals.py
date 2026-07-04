#!/usr/bin/env python3
"""huhhb evolve — loop-verification evals (E1-E4 from the build plan).

Scripted two-session scenarios; graders check artifacts, not vibes. Requires
a configured, reachable Honcho instance (deriver running). Runs in an
isolated sandbox: dedicated workspace + temp XDG dirs, so real state is
never touched.

  python3 evals.py            # all evals, 3 runs each (deriver nondeterminism)
  python3 evals.py --only e1 --runs 1
  python3 evals.py --with-claude   # also drive `claude -p` headless review
                                   # for the review-dependent halves of E2-E4

Pass bar (plan §7): artifact assertions 3/3, phrasing-sensitive ones 2/3.
Without --with-claude, review-dependent assertions are reported MANUAL with
the exact command to run.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVAL_WORKSPACE = "huhhb-evolve-evals"


def turn_user(text):
    return {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text}]}}


def turn_tool(name, inp):
    return {"type": "assistant", "message": {"role": "assistant",
            "content": [{"type": "tool_use", "name": name, "input": inp}]}}


def turn_result(text):
    return {"type": "user", "message": {"role": "user", "content":
            [{"type": "tool_result", "content": [{"type": "text", "text": text}]}]}}


class Sandbox:
    def __init__(self):
        self.root = Path(tempfile.mkdtemp(prefix="evolve-eval-"))
        self.env = {**os.environ,
                    "XDG_DATA_HOME": str(self.root / "data"),
                    "XDG_CONFIG_HOME": str(self.root / "config"),
                    "EVOLVE_OVERLAY_DIR": str(self.root / "overlays"),
                    "HONCHO_WORKSPACE": EVAL_WORKSPACE}

    def run(self, script, *args, stdin=None):
        return subprocess.run([sys.executable, str(HERE / script), *args],
                              input=stdin, capture_output=True, text=True, env=self.env)

    def capture_session(self, session_id, turns):
        """Session's Stop: digest transcript then flush synchronously."""
        transcript = self.root / f"{session_id}.jsonl"
        transcript.write_text("\n".join(json.dumps(t) for t in turns))
        payload = json.dumps({"session_id": session_id,
                              "transcript_path": str(transcript), "cwd": str(self.root)})
        self.run("digest.py", stdin=payload)
        self.run("flush.py")  # synchronous here — evals want determinism

    def injected_context(self):
        """What session B would see before any user turn."""
        r = subprocess.run(["sh", str(HERE.parent.parent / "hooks" / "evolve-inject.sh")],
                           capture_output=True, text=True, env=self.env)
        if not r.stdout.strip():
            return ""
        return json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]

    def journal(self):
        j = self.root / "data" / "huhhb" / "evolve" / "journal.jsonl"
        return [json.loads(x) for x in j.read_text().splitlines()] if j.exists() else []

    def query(self, *args):
        return self.run("honcho_client.py", "query", *args).stdout

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)


HEADLESS_CMD = ('claude -p "/evolve-review" --allowedTools '
                '"Read,Grep,Glob,Bash(python3 *scripts/evolve/overlay.py propose*),'
                'Bash(python3 *scripts/evolve/honcho_client.py query*),'
                'Bash(python3 *scripts/evolve/honcho_client.py status*)"')


def run_headless_review(sb, enabled):
    if not enabled or not shutil.which("claude"):
        return None
    import shlex
    subprocess.run(shlex.split(HEADLESS_CMD), env=sb.env, capture_output=True, timeout=600)
    pending = sb.root / "data" / "huhhb" / "evolve" / "pending"
    return [json.loads(f.read_text()) for f in pending.glob("*.json")] if pending.exists() else []


# ------------------------------------------------------------------ evals
# Each returns {assertion_name: True/False/"MANUAL"}. Names ending in
# ":phrasing" get the 2/3 bar; everything else needs 3/3.

def e1_cold_preference(sb, with_claude):
    sb.capture_session("e1a", [turn_user(
        "always use conventional commits, no emoji in the subject line")])
    rep = sb.query("rep", "--q", "commit style")
    ctx = sb.injected_context()
    return {
        "conclusion_on_user_peer:phrasing": "conventional commit" in rep.lower(),
        "session_b_injection_contains_it:phrasing": "conventional commit" in ctx.lower(),
    }


def e2_skill_experience(sb, with_claude):
    sb.capture_session("e2a", [
        turn_tool("Skill", {"skill": "writing-plans"}),
        turn_user("stop adding the verification section — I keep deleting it, "
                  "plans should end at the rollout steps"),
    ])
    journal = sb.journal()
    out = {
        "skill_usage_partial_captured": any(
            o.get("skill") == "writing-plans" and o.get("outcome") == "partial" for o in journal),
        "correction_captured": any(o.get("type") == "correction" for o in journal),
    }
    proposals = run_headless_review(sb, with_claude)
    if proposals is None:
        out["review_proposes_overlay_patch"] = "MANUAL"
    else:
        out["review_proposes_overlay_patch"] = any(
            p["kind"].startswith("overlay") and "writing-plans" in p.get("name", "")
            and "verification" in json.dumps(p).lower() for p in proposals)
        out["review_never_touches_hub_skill"] = not any(
            "skills/writing-plans/SKILL.md" in json.dumps(p) for p in proposals)
    return out


def e3_anti_capture(sb, with_claude):
    sb.capture_session("e3a", [
        turn_tool("Bash", {"command": "mempalace --status"}),
        turn_result("zsh: command not found: mempalace"),
        turn_tool("Bash", {"command": "uv tool install mempalace"}),
        turn_result("Installed 1 executable: mempalace"),
    ])
    journal = sb.journal()
    text = json.dumps(journal).lower()
    return {
        "install_fix_captured": any(o.get("type") == "environment"
                                    and "fixed by" in o.get("content", "") for o in journal),
        "zero_negative_capability": not any(
            phrase in text for phrase in ("is broken", "cannot use", "doesn't work"))
            and "command not found" not in json.dumps(
                [o["content"] for o in journal]).lower(),
    }


def e4_routing(sb, with_claude):
    sb.capture_session("e4a", [turn_user(
        "we decided this repo uses uv, never pip — team convention, remember that")])
    proposals = run_headless_review(sb, with_claude)
    if proposals is None:
        return {"review_routes_to_repo_memory": "MANUAL"}
    return {
        "review_routes_to_repo_memory": any(p["kind"] == "repo-memory" for p in proposals),
        "no_overlay_for_project_decision": not any(
            p["kind"].startswith("overlay") and "uv" in json.dumps(p).lower() for p in proposals),
    }


EVALS = {"e1": e1_cold_preference, "e2": e2_skill_experience,
         "e3": e3_anti_capture, "e4": e4_routing}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--only", choices=list(EVALS))
    ap.add_argument("--with-claude", action="store_true")
    args = ap.parse_args()

    sys.path.insert(0, str(HERE))
    import honcho_client as hc
    if not hc.configured():
        sys.exit("evals need a configured Honcho instance — set HONCHO_URL/HONCHO_API_KEY "
                 "and run honcho_client.py smoke first")

    selected = {args.only: EVALS[args.only]} if args.only else EVALS
    tallies = {}
    for run in range(args.runs):
        for name, fn in selected.items():
            sb = Sandbox()
            try:
                for assertion, ok in fn(sb, args.with_claude).items():
                    tallies.setdefault((name, assertion), []).append(ok)
            finally:
                sb.cleanup()
        print(f"run {run + 1}/{args.runs} complete")

    failed = False
    for (name, assertion), results in sorted(tallies.items()):
        if "MANUAL" in results:
            print(f"MANUAL {name}.{assertion} — run with --with-claude, or: {HEADLESS_CMD}")
            continue
        passes = sum(bool(r) for r in results)
        need = len(results) - 1 if assertion.endswith(":phrasing") else len(results)
        need = max(need, 1)
        status = "PASS" if passes >= need else "FAIL"
        failed |= status == "FAIL"
        print(f"{status}   {name}.{assertion}  ({passes}/{len(results)}, need {need})")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
