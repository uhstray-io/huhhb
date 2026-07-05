#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["duckdb"]
# ///
"""huhhb skill score trends — DuckDB over the git-tracked bench history.

The history is append-only JSONL (tests/bench/history.jsonl) written by
skill-bench.py; DuckDB is a query layer only — uv provisions it from the
inline metadata above, so there is nothing to deploy and no database file.

    uv run scripts/skill-trends.py trend [--skill NAME]
    uv run scripts/skill-trends.py regressions
    uv run scripts/skill-trends.py ledger
    uv run scripts/skill-trends.py sql "SELECT ... FROM history"
"""

import argparse
import sys
from pathlib import Path

import duckdb

HISTORY = Path(__file__).resolve().parent.parent / "tests" / "bench" / "history.jsonl"

QUERIES = {
    # score trajectory per skill/scenario over time
    "trend": """
        SELECT ts, skill, version, commit, scenario, passes, runs,
               round(passes/runs, 2) AS pass_rate, tokens, judge, cost
        FROM history WHERE scenario != 'triggers' {where} ORDER BY skill, scenario, ts""",
    # latest run worse than the one before it
    "regressions": """
        WITH h AS (SELECT *, row_number() OVER (PARTITION BY skill, scenario
                   ORDER BY ts DESC) AS rn FROM history WHERE scenario != 'triggers' {where})
        SELECT a.skill, a.scenario, a.version, a.tokens, b.tokens AS prev_tokens,
               a.passes, b.passes AS prev_passes, a.judge, b.judge AS prev_judge
        FROM h a JOIN h b USING (skill, scenario)
        WHERE a.rn = 1 AND b.rn = 2
          AND (a.tokens > b.tokens * 1.2 OR a.passes < b.passes
               OR coalesce(a.judge, 5) < coalesce(b.judge, 0))""",
    # did each version bump actually move the numbers?
    "ledger": """
        SELECT skill, version, min(ts) AS first_seen, count(*) AS bench_runs,
               round(avg(passes/runs), 2) AS pass_rate,
               round(avg(tokens)) AS avg_tokens, round(avg(judge), 1) AS avg_judge
        FROM history WHERE scenario != 'triggers' {where}
        GROUP BY skill, version ORDER BY skill, first_seen""",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("report", choices=[*QUERIES, "sql"])
    ap.add_argument("query", nargs="?", help="raw SQL when report=sql (table name: history)")
    ap.add_argument("--skill")
    ap.add_argument("--file", default=str(HISTORY))
    args = ap.parse_args()

    if not Path(args.file).exists():
        sys.exit(f"no history yet at {args.file} — run scripts/skill-bench.py "
                 "(without --no-record) to start accumulating scores")

    con = duckdb.connect()
    con.sql(f"CREATE VIEW history AS SELECT * FROM read_json_auto('{args.file}')")
    if args.report == "sql":
        if not args.query:
            sys.exit("report=sql needs a query argument")
        con.sql(args.query).show(max_rows=200)
        return
    where = f"AND skill = '{args.skill}'" if args.skill else ""
    con.sql(QUERIES[args.report].format(where=where)).show(max_rows=200)


if __name__ == "__main__":
    main()
