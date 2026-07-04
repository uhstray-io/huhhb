#!/usr/bin/env python3
"""huhhb G1 merge bench — behavioral quality gate (docs/skill-quality-bar.md B1-B11).

Drives real `claude -p` sessions against scenario files in tests/bench/<skill>.json
and gates on measured criteria:

  B1/B2 completion+accuracy   scenario `assert` shell command (artifacts, not vibes)
  B3    response quality      optional LLM-judge rubric, 1-5
  B4/B5 tokens + cost         usage / total_cost_usd from --output-format json
  B6    time to generate      duration_ms
  B7    time to reason        duration_api_ms (advisory)
  B8    tool-call efficiency  num_turns
  B9/10 trigger recall/precision   stream-json scan for the Skill tool call
  B11   variance              strict asserts must not flip across runs

Every scenario also runs a BASELINE (same prompt, --disallowedTools Skill):
a skill must earn its tokens vs. not existing. Ratios gated at 1.5x tokens,
2x wall time, 1.5x turns.

COSTS REAL TOKENS. Requires the plugin installed from the branch under test.
    python3 scripts/skill-bench.py evolve-status [--runs 3] [--dry-run]
"""

import argparse
import json
import shutil
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RATIO_TOKENS, RATIO_TIME, RATIO_TURNS = 1.5, 2.0, 1.5
JUDGE_TEMPLATE = (
    "Score 1-5 how well this response satisfies the rubric. Reply with ONLY the digit.\n"
    "RUBRIC: {rubric}\nRESPONSE:\n{response}")


def run_claude(prompt, extra=(), timeout=600):
    cmd = ["claude", "-p", prompt, "--output-format", "json", *extra]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {"is_error": True, "result": proc.stdout + proc.stderr}
    usage = data.get("usage", {})
    data["tokens"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
    return data


def skill_invoked(prompt, skill, timeout=600):
    """B9/B10 probe: did this prompt auto-invoke the skill? (stream-json scan)"""
    cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        for block in (event.get("message") or {}).get("content", []) or []:
            if (isinstance(block, dict) and block.get("type") == "tool_use"
                    and block.get("name") == "Skill"
                    and skill in str((block.get("input") or {}).get("skill", ""))):
                return True
    return False


def run_scenario(scenario, runs, baseline):
    rows = []
    for _ in range(runs):
        workdir = Path(tempfile.mkdtemp(prefix="skill-bench-"))
        try:
            extra = ["--disallowedTools", "Skill"] if baseline else []
            data = run_claude(scenario["prompt"], extra)
            (workdir / "result.txt").write_text(str(data.get("result", "")))
            check = subprocess.run(["sh", "-c", scenario["assert"]], cwd=workdir,
                                   capture_output=True, timeout=60)
            rows.append({
                "pass": check.returncode == 0 and not data.get("is_error"),
                "tokens": data.get("tokens", 0),
                "cost": data.get("total_cost_usd", 0.0),
                "duration_ms": data.get("duration_ms", 0),
                "api_ms": data.get("duration_api_ms", 0),
                "turns": data.get("num_turns", 0),
                "result": str(data.get("result", ""))[:2000],
            })
        finally:
            shutil.rmtree(workdir, ignore_errors=True)
    return rows


def judge(rubric, response):
    data = run_claude(JUDGE_TEMPLATE.format(rubric=rubric, response=response))
    for ch in str(data.get("result", "")):
        if ch.isdigit():
            return int(ch)
    return 0


def med(rows, key):
    return statistics.median(r[key] for r in rows) if rows else 0


def bench_skill(spec, runs, dry_run):
    verdicts = {}

    def gate(name, ok, detail):
        verdicts[name] = ok
        print(f"  {'PASS' if ok else 'FAIL'} {name}: {detail}")

    for scenario in spec["scenarios"]:
        print(f"\nscenario {scenario['id']} ({runs} runs + baseline)")
        if dry_run:
            print(f"  would run: claude -p {scenario['prompt']!r}  assert: {scenario['assert']}")
            continue
        skilled = run_scenario(scenario, runs, baseline=False)
        base = run_scenario(scenario, max(1, runs - 1), baseline=True)

        passes = sum(r["pass"] for r in skilled)
        need = runs - 1 if scenario.get("phrasing") else runs
        gate("B1/B2 completion", passes >= max(need, 1), f"{passes}/{runs} asserts")
        gate("B11 variance", passes in (0, runs) or scenario.get("phrasing", False),
             "no flip-flop" if passes in (0, runs) else f"flip-flop {passes}/{runs}")

        budget = spec.get("budget", {})
        tokens, cost = med(skilled, "tokens"), med(skilled, "cost")
        dur, api, turns = med(skilled, "duration_ms"), med(skilled, "api_ms"), med(skilled, "turns")
        if budget.get("max_tokens"):
            gate("B4 tokens", tokens <= budget["max_tokens"], f"{tokens} median")
        if budget.get("max_cost_usd"):
            gate("B5 cost", cost <= budget["max_cost_usd"], f"${cost:.3f} median")
        if budget.get("max_duration_ms"):
            gate("B6 wall time", dur <= budget["max_duration_ms"], f"{dur:.0f}ms median")
        print(f"  INFO B7 reasoning: {api:.0f}ms api of {dur:.0f}ms wall")

        if base:
            bt, bd, bn = med(base, "tokens"), med(base, "duration_ms"), med(base, "turns")
            if bt:
                gate("B4 vs baseline", tokens <= bt * RATIO_TOKENS, f"{tokens} vs {bt} (<= {RATIO_TOKENS}x)")
            if bd:
                gate("B6 vs baseline", dur <= bd * RATIO_TIME, f"{dur:.0f} vs {bd:.0f}ms")
            if bn:
                gate("B8 turns", turns <= bn * RATIO_TURNS, f"{turns} vs {bn}")
            base_pass = sum(r["pass"] for r in base)
            print(f"  INFO baseline completion: {base_pass}/{len(base)} — skill must beat "
                  "or match this to earn its tokens")

        if scenario.get("judge") and skilled:
            scores = [judge(scenario["judge"], r["result"]) for r in skilled]
            gate("B3 quality", statistics.median(scores) >= 4, f"judge median {statistics.median(scores)}/5")

    triggers = spec.get("triggers", {})
    if triggers and not dry_run:
        pos = [skill_invoked(p, spec["skill"]) for p in triggers.get("positive", [])]
        neg = [not skill_invoked(p, spec["skill"]) for p in triggers.get("negative", [])]
        if pos:
            gate("B9 trigger recall", sum(pos) / len(pos) >= 0.8, f"{sum(pos)}/{len(pos)}")
        if neg:
            gate("B10 trigger precision", sum(neg) / len(neg) >= 0.9, f"{sum(neg)}/{len(neg)}")
    elif triggers:
        print(f"\ntriggers: {len(triggers.get('positive', []))} positive, "
              f"{len(triggers.get('negative', []))} negative prompts (skipped in dry-run)")

    return verdicts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("skill")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true",
                    help="validate the scenario file and print the plan; no claude calls")
    args = ap.parse_args()

    spec_path = REPO / "tests" / "bench" / f"{args.skill}.json"
    if not spec_path.exists():
        sys.exit(f"no scenario file {spec_path} — see docs/skill-quality-bar.md")
    spec = json.loads(spec_path.read_text())
    for field in ("skill", "scenarios"):
        assert spec.get(field), f"scenario file missing '{field}'"
    for s in spec["scenarios"]:
        for field in ("id", "prompt", "assert"):
            assert s.get(field), f"scenario missing '{field}'"

    if not args.dry_run and not shutil.which("claude"):
        sys.exit("claude CLI not on PATH")
    print(f"bench {spec['skill']} — {len(spec['scenarios'])} scenario(s)")
    verdicts = bench_skill(spec, args.runs, args.dry_run)
    if args.dry_run:
        print("\ndry-run OK — scenario file valid")
        return
    failed = [k for k, ok in verdicts.items() if not ok]
    print(f"\n{'GATE FAIL: ' + ', '.join(failed) if failed else 'GATE PASS'}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
