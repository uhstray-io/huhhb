#!/usr/bin/env python3
"""huhhb evolve — G2 field promotion (docs/skill-quality-bar.md).

The third quality gate: where G0 lints prose and G1 benches behavior, G2
scores what actually happened in the field. It reads the SCREENED journal
(GR2 — a quarantined batch never earns confidence) and issues per-skill
verdicts a human routes; featured/pinned changes are always PRs.

  promote   F1 ≥ 0.7 and F2 clean — candidate for featured/pinned status
  improve   recurring correction pressure — enters the improvement queue
  demote    60+ days unused AND F1 < 0.3 — archive-proposal candidate
  keep      in use, no pressure, below the promote bar
  no-data   registered but no field observations yet

Criteria (spec: docs/skill-quality-bar.md):
  F1  earned confidence  min(runs/10, 1) × success_rate       ≥ 0.7 to promote
  F2  correction pressure  corrections in-session at/after a   0 recurring
      skill's use (journal has session+ts, not turn indices,
      so same-session-after-use approximates the 3-turn window)
  F3  freshness  days since the skill's last G1 bench row      re-bench > 90d

Read-only, stdlib only.  Usage:  g2.py report [--json]
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import honcho_client  # noqa: E402

BENCH_HISTORY = HERE.parent.parent / "tests" / "bench" / "history.jsonl"
PROMOTE_F1, DEMOTE_F1 = 0.7, 0.3
DEMOTE_UNUSED_DAYS, STALE_G1_DAYS = 60, 90


def _dt(ts):
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _bench_last_run():
    """skill -> most recent G1 bench timestamp, from the git-tracked ledger."""
    last = {}
    if not BENCH_HISTORY.exists():
        return last
    for line in BENCH_HISTORY.read_text().splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        ts = _dt(row.get("ts", ""))
        if row.get("skill") and ts and (row["skill"] not in last or ts > last[row["skill"]]):
            last[row["skill"]] = ts
    return last


def _marketplace_names():
    mp = HERE.parent.parent / "marketplace.json"
    if not mp.exists():
        return []
    return [s["name"] for s in json.loads(mp.read_text()).get("skills", [])]


def field_report(now=None):
    """Per-skill G2 metrics + verdict from the screened (admitted) journal."""
    now = now or datetime.now(timezone.utc)
    admitted, _ = honcho_client.screened_journal()

    usages, corrections = {}, {}
    for o in admitted:
        if o.get("type") == "skill-usage" and o.get("skill"):
            usages.setdefault(o["skill"], []).append(o)
        elif o.get("type") == "correction":
            corrections.setdefault(o.get("session_id"), []).append(o)

    bench = _bench_last_run()
    rows = []
    for skill, uses in usages.items():
        runs = len(uses)
        # journal says used/partial (digest.py); overlay record says ok/fail
        ok = sum(1 for u in uses if u.get("outcome") in ("used", "ok"))
        f1 = round(min(runs / 10, 1.0) * (ok / runs), 2)

        # F2: corrections in the same session at/after this skill's use
        pressured_sessions = set()
        for u in uses:
            uts = _dt(u.get("ts", ""))
            for c in corrections.get(u.get("session_id"), []):
                cts = _dt(c.get("ts", ""))
                if uts and cts and cts >= uts:
                    pressured_sessions.add(u["session_id"])
        recurring = len(pressured_sessions) >= 2

        last_used = max((d for d in (_dt(u.get("ts", "")) for u in uses) if d), default=None)
        unused_days = (now - last_used).days if last_used else None
        # bench ledger keys bare names; journal may carry a namespace prefix
        bench_ts = bench.get(skill) or bench.get(skill.rsplit(":", 1)[-1])
        g1_age = (now - bench_ts).days if bench_ts else None

        if recurring:
            verdict = "improve"
        elif unused_days is not None and unused_days > DEMOTE_UNUSED_DAYS and f1 < DEMOTE_F1:
            verdict = "demote"
        elif f1 >= PROMOTE_F1:
            verdict = "promote"
        else:
            verdict = "keep"
        rows.append({"skill": skill, "runs": runs, "f1": f1,
                     "pressure_sessions": len(pressured_sessions),
                     "unused_days": unused_days,
                     "g1_age_days": g1_age,
                     "stale_g1": g1_age is None or g1_age > STALE_G1_DAYS,
                     "verdict": verdict})

    observed_bare = {r["skill"].rsplit(":", 1)[-1] for r in rows}
    for name in _marketplace_names():
        if name not in observed_bare:
            rows.append({"skill": name, "runs": 0, "f1": 0.0,
                         "pressure_sessions": 0, "unused_days": None,
                         "g1_age_days": None, "stale_g1": True, "verdict": "no-data"})
    order = {"promote": 0, "improve": 1, "demote": 2, "keep": 3, "no-data": 4}
    return sorted(rows, key=lambda r: (order[r["verdict"]], -r["f1"], r["skill"]))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    pr = sub.add_parser("report")
    pr.add_argument("--json", action="store_true")
    args = ap.parse_args()

    rows = field_report()
    if args.json:
        print(json.dumps(rows, indent=2))
        return
    tally = {}
    for r in rows:
        tally[r["verdict"]] = tally.get(r["verdict"], 0) + 1
    print(f"{'skill':40} {'runs':>4} {'F1':>5} {'press':>5} {'g1age':>5}  verdict")
    for r in rows:
        if r["verdict"] == "no-data":
            continue  # tallied below; listing every idle skill is noise
        g1 = "-" if r["g1_age_days"] is None else str(r["g1_age_days"])
        print(f"{r['skill']:40} {r['runs']:>4} {r['f1']:>5} "
              f"{r['pressure_sessions']:>5} {g1:>5}  {r['verdict']}"
              + ("  [stale-g1]" if r["stale_g1"] else ""))
    print("\ng2: " + " ".join(f"{k}={tally.get(k, 0)}"
          for k in ("promote", "improve", "demote", "keep", "no-data")))
    print("promote/demote are candidates — featured/pinned changes ship as PRs "
          "(docs/skill-quality-bar.md gating).")


if __name__ == "__main__":
    main()
