#!/usr/bin/env node
// huhhb evolve — G2 field promotion (docs/evolve-plan.md). (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import * as honcho_client from "./honcho_client.ts";
import { py_json_dumps, py_splitlines, parse_cli, run_main, type CliOpt } from "./honcho_client.ts";

const __doc__ = `huhhb evolve — G2 field promotion (docs/evolve-plan.md).

The third quality gate: where G0 lints prose and G1 benches behavior, G2
scores what actually happened in the field. It reads the SCREENED journal
(GR2 — a quarantined batch never earns confidence) and issues per-skill
verdicts a human routes; featured/pinned changes are always PRs.

  promote   F1 ≥ 0.7 and F2 clean — candidate for featured/pinned status
  improve   recurring correction pressure — enters the improvement queue
  demote    60+ days unused AND F1 < 0.3 — archive-proposal candidate
  keep      in use, no pressure, below the promote bar
  no-data   registered but no field observations yet

Criteria (spec: docs/evolve-plan.md):
  F1  earned confidence  min(runs/10, 1) × success_rate       ≥ 0.7 to promote
  F2  correction pressure  corrections in-session at/after a   0 recurring
      skill's use (journal has session+ts, not turn indices,
      so same-session-after-use approximates the 3-turn window)
  F3  freshness  days since the skill's last G1 bench row      re-bench > 90d

Read-only, stdlib only.  Usage:  g2.ts report [--json]`;

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BENCH_HISTORY = path.join(
  path.dirname(path.dirname(HERE)),
  "tests",
  "bench",
  "history.jsonl",
);
export const PROMOTE_F1 = 0.7;
export const DEMOTE_F1 = 0.3;
export const DEMOTE_UNUSED_DAYS = 60;
export const STALE_G1_DAYS = 90;

// float fields whose integer-valued numbers must render as "0.0"/"1.0" in JSON
const F1_FLOAT_KEYS = new Set(["f1"]);

/* datetime.fromisoformat(ts.replace("Z", "+00:00")) parity — returns epoch
milliseconds, or null on a bad/absent value (ValueError/AttributeError). */
function _dt(ts: unknown): number | null {
  if (typeof ts !== "string") {
    return null; // AttributeError on .replace for non-strings
  }
  const iso = ts.replace("Z", "+00:00");
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/* timedelta.days for (now - then), both epoch ms: floor of the day count. */
function _days_between(now_ms: number, then_ms: number): number {
  return Math.floor((now_ms - then_ms) / 86400000);
}

function _bench_last_run(): Map<string, number> {
  // skill -> most recent G1 bench timestamp (epoch ms), from the git-tracked ledger.
  const last = new Map<string, number>();
  if (!fs.existsSync(BENCH_HISTORY)) {
    return last;
  }
  for (const line of py_splitlines(fs.readFileSync(BENCH_HISTORY, "utf-8"))) {
    let row: any;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = _dt(row?.ts ?? "");
    if (row?.skill && ts !== null && (!last.has(row.skill) || ts > last.get(row.skill)!)) {
      last.set(row.skill, ts);
    }
  }
  return last;
}

function _marketplace_names(): string[] {
  const mp = path.join(path.dirname(path.dirname(HERE)), "marketplace.json");
  if (!fs.existsSync(mp)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(mp, "utf-8"));
  return (data.skills || []).map((s: any) => s.name);
}

export function field_report(now?: Date | number | null): Record<string, any>[] {
  // Per-skill G2 metrics + verdict from the screened (admitted) journal.
  const now_ms =
    now === undefined || now === null
      ? Date.now()
      : now instanceof Date
        ? now.getTime()
        : now;
  const [admitted] = honcho_client.screened_journal();

  const usages = new Map<string, Record<string, any>[]>();
  const corrections = new Map<unknown, Record<string, any>[]>();
  for (const o of admitted) {
    if (o.type === "skill-usage" && o.skill) {
      if (!usages.has(o.skill)) usages.set(o.skill, []);
      usages.get(o.skill)!.push(o);
    } else if (o.type === "correction") {
      if (!corrections.has(o.session_id)) corrections.set(o.session_id, []);
      corrections.get(o.session_id)!.push(o);
    }
  }

  const bench = _bench_last_run();
  const rows: Record<string, any>[] = [];
  for (const [skill, uses] of usages) {
    const runs = uses.length;
    // journal says used/partial (digest.py); overlay record says ok/fail
    const ok = uses.filter((u) => u.outcome === "used" || u.outcome === "ok").length;
    const f1 = py_round2(Math.min(runs / 10, 1.0) * (ok / runs));

    // F2: corrections in the same session at/after this skill's use
    const pressured_sessions = new Set<unknown>();
    for (const u of uses) {
      const uts = _dt(u.ts ?? "");
      for (const c of corrections.get(u.session_id) || []) {
        const cts = _dt(c.ts ?? "");
        if (uts !== null && cts !== null && cts >= uts) {
          pressured_sessions.add(u.session_id);
        }
      }
    }
    const recurring = pressured_sessions.size >= 2;

    const use_dts = uses.map((u) => _dt(u.ts ?? "")).filter((d): d is number => d !== null);
    const last_used = use_dts.length ? Math.max(...use_dts) : null;
    const unused_days = last_used !== null ? _days_between(now_ms, last_used) : null;
    // bench ledger keys bare names; journal may carry a namespace prefix
    const bench_ts = bench.has(skill)
      ? bench.get(skill)!
      : bench.get(rsplit_last(skill, ":")) ?? null;
    const g1_age = bench_ts !== null ? _days_between(now_ms, bench_ts) : null;

    let verdict: string;
    if (recurring) {
      verdict = "improve";
    } else if (unused_days !== null && unused_days > DEMOTE_UNUSED_DAYS && f1 < DEMOTE_F1) {
      verdict = "demote";
    } else if (f1 >= PROMOTE_F1) {
      verdict = "promote";
    } else {
      verdict = "keep";
    }
    rows.push({
      skill: skill,
      runs: runs,
      f1: f1,
      pressure_sessions: pressured_sessions.size,
      unused_days: unused_days,
      g1_age_days: g1_age,
      stale_g1: g1_age === null || g1_age > STALE_G1_DAYS,
      verdict: verdict,
    });
  }

  const observed_bare = new Set(rows.map((r) => rsplit_last(r.skill, ":")));
  for (const name of _marketplace_names()) {
    if (!observed_bare.has(name)) {
      rows.push({
        skill: name,
        runs: 0,
        f1: 0.0,
        pressure_sessions: 0,
        unused_days: null,
        g1_age_days: null,
        stale_g1: true,
        verdict: "no-data",
      });
    }
  }
  const order: Record<string, number> = {
    promote: 0,
    improve: 1,
    demote: 2,
    keep: 3,
    "no-data": 4,
  };
  // sorted by (order[verdict], -f1, skill); stable for ties.
  return rows
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) =>
        (order[a.r.verdict] - order[b.r.verdict]) ||
        (b.r.f1 - a.r.f1) ||
        cmp(a.r.skill, b.r.skill) ||
        (a.i - b.i),
    )
    .map((x) => x.r);
}

/* str.rsplit(sep, 1)[-1] parity: the segment after the last sep. */
function rsplit_last(s: string, sep: string): string {
  const idx = s.lastIndexOf(sep);
  return idx === -1 ? s : s.slice(idx + sep.length);
}

/* Lexicographic string comparison matching Python's default. */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function main(): void {
  const subs: Record<string, CliOpt[]> = {
    report: [{ flag: "--json", store_true: true }],
  };
  const prog = path.basename(process.argv[1] || "g2.ts");
  const args = parse_cli(prog, __doc__, subs, process.argv.slice(2));

  const rows = field_report();
  if (args.json) {
    console.log(py_json_dumps(rows, { indent: 2, float_keys: F1_FLOAT_KEYS }));
    return;
  }
  const tally = new Map<string, number>();
  for (const r of rows) {
    tally.set(r.verdict, (tally.get(r.verdict) || 0) + 1);
  }
  console.log(
    `${ljust("skill", 40)} ${rjust("runs", 4)} ${rjust("F1", 5)} ${rjust("press", 5)} ${rjust("g1age", 5)}  verdict`,
  );
  for (const r of rows) {
    if (r.verdict === "no-data") {
      continue; // tallied below; listing every idle skill is noise
    }
    const g1 = r.g1_age_days === null ? "-" : String(r.g1_age_days);
    console.log(
      `${ljust(r.skill, 40)} ${rjust(String(r.runs), 4)} ${rjust(py_float_str(r.f1), 5)} ` +
        `${rjust(String(r.pressure_sessions), 5)} ${rjust(g1, 5)}  ${r.verdict}` +
        (r.stale_g1 ? "  [stale-g1]" : ""),
    );
  }
  const parts = ["promote", "improve", "demote", "keep", "no-data"].map(
    (k) => `${k}=${tally.get(k) || 0}`,
  );
  console.log("\ng2: " + parts.join(" "));
  console.log(
    "promote/demote are candidates — featured/pinned changes ship as PRs " +
      "(docs/evolve-plan.md gating).",
  );
}

/* Left-justify to width n. */
function ljust(s: string, n: number): string {
  const len = Array.from(s).length;
  return len >= n ? s : s + " ".repeat(n - len);
}

/* Right-justify to width n (Python ':>n'). */
function rjust(s: string, n: number): string {
  const len = Array.from(s).length;
  return len >= n ? s : " ".repeat(n - len) + s;
}

/* str(float) parity: 0.0 -> "0.0", 0.7 -> "0.7". */
function py_float_str(x: number): string {
  return Number.isFinite(x) && Number.isInteger(x) ? x.toFixed(1) : String(x);
}

/* round(x, 2) with CPython round-half-to-even (F1 ratios such as 5/8 = 0.625
land on exact dyadic ties where away-from-zero would diverge — Python 0.62). */
function py_round2(x: number): number {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0;
  const s = Math.abs(x).toFixed(20);
  const dot = s.indexOf(".");
  const digits = s.slice(0, dot) + s.slice(dot + 1, dot + 3);
  const rest = s.slice(dot + 3);
  const firstRest = rest.charCodeAt(0) - 48;
  let roundUp: boolean;
  if (firstRest > 5) {
    roundUp = true;
  } else if (firstRest < 5) {
    roundUp = false;
  } else if (rest.slice(1).replace(/0+$/, "").length > 0) {
    roundUp = true;
  } else {
    roundUp = (digits.charCodeAt(digits.length - 1) - 48) % 2 === 1;
  }
  let n = BigInt(digits);
  if (roundUp) n += 1n;
  const val = Number(n) / 100;
  return neg ? -val : val;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run_main(main);
}
