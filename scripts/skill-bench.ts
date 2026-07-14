#!/usr/bin/env node
/* huhhb G1 merge bench — behavioral quality gate (docs/evolve-plan.md B1-B11).

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
    node scripts/skill-bench.ts evolve-status [--runs 3] [--dry-run]
*/

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync, appendFileSync, constants, existsSync, mkdtempSync, readFileSync,
  rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// SKILL_BENCH_HISTORY: test-only override (the Python suite monkeypatched
// sb.HISTORY; an env var is the ESM equivalent)
const HISTORY = process.env.SKILL_BENCH_HISTORY
  ?? join(REPO, "tests", "bench", "history.jsonl");
const RATIO_TOKENS = 1.5;
const RATIO_TIME = 2.0;
const RATIO_TURNS = 1.5;
// R3 champion/challenger: a revised skill must not regress its own last
// passing version — pass rate must hold, tokens may drift this much
const CHAMPION_RATIO_TOKENS = 1.1;
// R4 evidence-cited verification: the judge must ground its score in a
// concrete quote/artifact from the response — scores without evidence drift.
const JUDGE_TEMPLATE =
  "Score 1-5 how well this response satisfies the rubric. First line: the " +
  "shortest verbatim quote from the response that justifies your score " +
  "(or NONE if nothing does — that implies 1-2). Second line: ONLY the digit.\n" +
  "RUBRIC: {rubric}\nRESPONSE:\n{response}";
const MAX_BUFFER = 64 * 1024 * 1024; // stream-json transcripts outgrow node's 1MB default

type Json = Record<string, unknown>;
type Scenario = {
  id: string; prompt: string; assert: string;
  phrasing?: boolean; judge?: string; env?: Record<string, string>;
};
type Spec = {
  skill: string; scenarios: Scenario[];
  budget?: { max_tokens?: number; max_cost_usd?: number; max_duration_ms?: number };
  triggers?: { positive?: string[]; negative?: string[] };
};
type RunRow = {
  pass: boolean; tokens: number; cost: number; duration_ms: number;
  api_ms: number; turns: number; result: string;
};

/* Single owner of claude-session invocation — both wrappers route here so
   env pinning and flags can't drift between the assert runs and the probes. */
function claudeProc(prompt: string, outputFormat: string, extra: string[] = [],
                    timeout = 600, envOverrides: Record<string, string> | null = null) {
  const cmd = ["-p", prompt, "--output-format", outputFormat, ...extra];
  const proc = spawnSync("claude", cmd, {
    encoding: "utf-8",
    timeout: timeout * 1000,
    maxBuffer: MAX_BUFFER,
    env: envOverrides ? { ...process.env, ...envOverrides } : undefined,
  });
  if (proc.error) throw proc.error; // spawn failure / timeout, like subprocess.run
  return proc;
}

function runClaude(prompt: string, extra: string[] = [], timeout = 600,
                   envOverrides: Record<string, string> | null = null): Json {
  const proc = claudeProc(prompt, "json", extra, timeout, envOverrides);
  let data: Json;
  try {
    data = JSON.parse(proc.stdout);
  } catch {
    return { is_error: true, result: (proc.stdout ?? "") + (proc.stderr ?? "") };
  }
  const usage = (data.usage ?? {}) as Json;
  data.tokens = (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0);
  return data;
}

/* B9/B10 probe: did this prompt auto-invoke the skill? (stream-json scan)
   Not env-pinned: skill triggering is description-matching against the
   installed catalog, which machine state doesn't influence. */
function skillInvoked(prompt: string, skill: string, timeout = 600): boolean {
  const proc = claudeProc(prompt, "stream-json", ["--verbose"], timeout);
  /* A probe that did not actually run must never read as "the skill correctly
     declined". B10 inverts this result (neg = !skillInvoked), so a silent
     non-run scores as a precision PASS — a broken CLI would report perfect
     precision. claudeProc only throws on proc.error, which covers spawn
     failure and timeout but NOT a process that ran and exited non-zero with
     empty stdout. Fail loudly here instead; B9 already fails closed. */
  if (proc.status !== 0) {
    throw new Error(`trigger probe exited ${proc.status} (not a verdict): ` +
      `${String(proc.stderr ?? "").slice(0, 200)}`);
  }
  let sawEvent = false;
  for (const line of (proc.stdout ?? "").split("\n")) {
    let event: Json;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    sawEvent = true;
    const content = ((event.message ?? {}) as Json).content;
    for (const block of Array.isArray(content) ? content : []) {
      if (block && typeof block === "object" && block.type === "tool_use"
          && block.name === "Skill"
          && String((block.input ?? {}).skill ?? "").includes(skill)) {
        return true;
      }
    }
  }
  /* Exit 0 with no parseable stream events is also a non-run, not a decline. */
  if (!sawEvent) {
    throw new Error("trigger probe produced no parseable events (not a verdict)");
  }
  return false;
}

export function runScenario(scenario: Scenario, runs: number, baseline: boolean): RunRow[] {
  const rows: RunRow[] = [];
  for (let i = 0; i < runs; i++) {
    const workdir = mkdtempSync(join(tmpdir(), "skill-bench-"));
    try {
      const extra = baseline ? ["--disallowedTools", "Skill"] : [];
      // scenario "env" pins machine state (e.g. XDG dirs) so asserts
      // don't depend on what the bench host happens to have configured;
      // {workdir} expands per-run so pinned paths are never shared or
      // pre-seedable on multi-user hosts
      const envEntries = Object.entries(scenario.env ?? {})
        .map(([k, v]) => [k, v.replaceAll("{workdir}", workdir)] as [string, string]);
      const envOverrides = envEntries.length ? Object.fromEntries(envEntries) : null;
      const data = runClaude(scenario.prompt, extra, 600, envOverrides);
      writeFileSync(join(workdir, "result.txt"), String(data.result ?? ""));
      // turns.txt lets an assert distinguish "actually used tools" from
      // "wrote a fluent description of using them" — result.txt is the final
      // text only, so prose alone can satisfy a content grep. A pure
      // text answer is 1 turn; each tool round-trip adds one.
      writeFileSync(join(workdir, "turns.txt"), String(Number(data.num_turns) || 0));
      const check = spawnSync("sh", ["-c", scenario.assert], {
        cwd: workdir, timeout: 60_000, maxBuffer: MAX_BUFFER,
      });
      if (check.error) throw check.error;
      rows.push({
        pass: check.status === 0 && !data.is_error,
        tokens: Number(data.tokens) || 0,
        cost: Number(data.total_cost_usd) || 0.0,
        duration_ms: Number(data.duration_ms) || 0,
        api_ms: Number(data.duration_api_ms) || 0,
        turns: Number(data.num_turns) || 0,
        result: String(data.result ?? "").slice(0, 2000),
      });
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  }
  return rows;
}

function judge(rubric: string, response: string): number {
  const data = runClaude(
    JUDGE_TEMPLATE.replace("{rubric}", rubric).replace("{response}", response));
  // the score is the FINAL line, bare 1-5 only — the evidence quote above
  // may itself contain digits, and a scavenged digit recorded as a score is
  // worse than failing closed (0 fails the B3 gate loudly)
  const lines = String(data.result ?? "").trim().split(/\r?\n/);
  const score_line = lines[lines.length - 1]?.trim();
  if (/^[1-5]$/.test(score_line ?? "")) return Number(score_line);
  return 0;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function med(rows: RunRow[], key: keyof RunRow): number {
  return rows.length ? median(rows.map((r) => Number(r[key]))) : 0;
}

function skillVersion(skill: string): string {
  const mp = JSON.parse(readFileSync(join(REPO, "marketplace.json"), "utf-8"));
  const entry = (mp.skills as Json[]).find((s) => s.name === skill);
  return entry ? String(entry.version ?? "?") : "?";
}

/* json.dumps-compatible serialization (", " / ": " separators, non-ASCII
   escaped) so TS-written history rows diff cleanly next to the .py-era ones. */
function pyJson(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return pyJsonStr(v);
  if (Array.isArray(v)) return "[" + v.map(pyJson).join(", ") + "]";
  return "{" + Object.entries(v as Json)
    .map(([k, val]) => `${pyJsonStr(k)}: ${pyJson(val)}`).join(", ") + "}";
}

function pyJsonStr(s: string): string {
  return JSON.stringify(s).replace(/[-￿]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/* Append one score row to the git-tracked history (tests/bench/history.jsonl).

   Append-only JSONL on purpose: rows are diffable in PRs, survive forever in
   git, and skill-trends.ts reads the file directly — the query layer is a
   reader, never a deployment (docs/evolve-plan.md, History & trends). */
function recordHistory(row: Json): void {
  const git = spawnSync("git", ["rev-parse", "--short", "HEAD"],
    { cwd: REPO, encoding: "utf-8" });
  const commit = (git.stdout ?? "").trim();
  const ts = new Date().toISOString().slice(0, 19) + "Z";
  const full = { ts, commit: commit || "?", ...row };
  appendFileSync(HISTORY, pyJson(full) + "\n");
}

/* Identity of a baseline measurement. The ASSERT is part of it, not just the
   prompt: baseline_passes is the assert's verdict against the baseline response,
   so an assert-only edit invalidates the cached pass/fail while leaving the
   prompt identical. Hashing the prompt alone let a changed assert reuse stale
   completion evidence, which silently enables or skips the B4/B6/B8 ratio gates.
   Second arg optional so existing callers keep working; rows written before this
   change carry a prompt-only hash and simply miss, which is the safe direction. */
export function promptHash(prompt: string, assertion = ""): string {
  return createHash("sha256")
    .update(assertion ? `${prompt}\u0000${assertion}` : prompt, "utf-8")
    .digest("hex").slice(0, 12);
}

/* R3: the champion is the latest history row for this skill+scenario from a
   DIFFERENT version that completed all its runs — the bar a challenger must
   meet ("no victory, no replacement"). Same-version rows are re-runs, not
   rivals; rows that never fully passed set no bar. */
export function championRow(skill: string, scenarioId: string, version: string): Json | null {
  if (!existsSync(HISTORY)) return null;
  const lines = readFileSync(HISTORY, "utf-8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let row: Json;
    try {
      row = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (row.skill === skill && row.scenario === scenarioId
        && row.version && row.version !== version
        && Number(row.runs) > 0 && Number(row.passes) === Number(row.runs)) {
      return row;
    }
  }
  return null;
}

/* Pure challenger-vs-champion verdict: hold the pass rate, keep tokens
   within CHAMPION_RATIO_TOKENS of the champion's. */
export function beatsChampion(
  cand: { passes: number; runs: number; tokens: number },
  champ: Json,
): { ok: boolean; detail: string } {
  const champRate = Number(champ.passes) / Number(champ.runs);
  const candRate = cand.passes / cand.runs;
  const rateOk = candRate >= champRate;
  const champTokens = Number(champ.tokens) || 0;
  const tokensOk = !champTokens || cand.tokens <= champTokens * CHAMPION_RATIO_TOKENS;
  return {
    ok: rateOk && tokensOk,
    detail: `pass ${cand.passes}/${cand.runs} vs champion ${champ.passes}/${champ.runs} ` +
      `(v${champ.version}); tokens ${cand.tokens} vs ${champTokens} (<= ${CHAMPION_RATIO_TOKENS}x)`,
  };
}

/* Latest history row with baseline numbers for this exact prompt — the
   baseline is invariant to the skill version under test, so re-measuring it
   every bench burns real tokens for no new information. */
export function cachedBaseline(skill: string, scenario: Scenario): Json | null {
  if (!existsSync(HISTORY)) return null;
  const want = promptHash(scenario.prompt, scenario.assert);
  const lines = readFileSync(HISTORY, "utf-8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let row: Json;
    try {
      row = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (row.skill === skill && row.scenario === scenario.id
        && row.prompt_hash === want && row.baseline_tokens
        // rows predating baseline_passes can't prove the baseline ever
        // completed — re-measure instead of trusting them
        && row.baseline_passes !== null && row.baseline_passes !== undefined) {
      return row;
    }
  }
  return null;
}

/** Python repr() for the dry-run plan line. */
function pyRepr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    if (ch === "\\") out += "\\\\";
    else if (ch === q) out += "\\" + q;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch < " " || ch === "\x7f") {
      out += "\\x" + ch.codePointAt(0)!.toString(16).padStart(2, "0");
    } else out += ch;
  }
  return out + q;
}

function benchSkill(spec: Spec, runs: number, dryRun: boolean,
                    record = true, rebaseline = false): Map<string, boolean> {
  // keyed "scope\x00gate-name" so scenarios never collide
  const verdicts = new Map<string, boolean>();

  function gate(scope: string, name: string, ok: boolean, detail: string): void {
    verdicts.set(`${scope}\x00${name}`, ok);
    console.log(`  ${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  }

  function scoped(scope: string): Json {
    const out: Json = {};
    for (const [key, ok] of verdicts) {
      const [s, n] = key.split("\x00");
      if (s === scope) out[n] = ok;
    }
    return out;
  }

  const version = skillVersion(spec.skill);
  for (const scenario of spec.scenarios) {
    const sid = scenario.id;
    console.log(`\nscenario ${sid} (${runs} runs + baseline)`);
    if (dryRun) {
      console.log(`  would run: claude -p ${pyRepr(scenario.prompt)}  assert: ${scenario.assert}`);
      continue;
    }
    const skilled = runScenario(scenario, runs, false);
    const cached = rebaseline ? null : cachedBaseline(spec.skill, scenario);
    let bt: number;
    let bd: number;
    let bn: number;
    let basePass: number;
    if (cached) {
      bt = Number(cached.baseline_tokens);
      bd = Number(cached.baseline_ms);
      bn = Number(cached.baseline_turns) || 0;
      basePass = Number(cached.baseline_passes); // cachedBaseline guarantees presence
      console.log(`  INFO baseline reused from history (${cached.ts}) — --rebaseline to re-measure`);
    } else {
      const base = runScenario(scenario, Math.max(1, runs - 1), true);
      bt = med(base, "tokens");
      bd = med(base, "duration_ms");
      bn = med(base, "turns");
      basePass = base.reduce((a, r) => a + (r.pass ? 1 : 0), 0);
      console.log(`  INFO baseline completion: ${basePass}/${base.length} — ` +
        "skill must beat or match this to earn its tokens");
    }

    const passes = skilled.reduce((a, r) => a + (r.pass ? 1 : 0), 0);
    const need = scenario.phrasing ? runs - 1 : runs;
    gate(sid, "B1/B2 completion", passes >= Math.max(need, 1), `${passes}/${runs} asserts`);
    gate(sid, "B11 variance", passes === 0 || passes === runs || Boolean(scenario.phrasing),
      passes === 0 || passes === runs ? "no flip-flop" : `flip-flop ${passes}/${runs}`);

    const budget = spec.budget ?? {};
    const tokens = med(skilled, "tokens");
    const cost = med(skilled, "cost");
    const dur = med(skilled, "duration_ms");
    const api = med(skilled, "api_ms");
    const turns = med(skilled, "turns");
    if (budget.max_tokens) {
      gate(sid, "B4 tokens", tokens <= budget.max_tokens, `${tokens} median`);
    }
    if (budget.max_cost_usd) {
      gate(sid, "B5 cost", cost <= budget.max_cost_usd, `$${cost.toFixed(3)} median`);
    }
    if (budget.max_duration_ms) {
      gate(sid, "B6 wall time", dur <= budget.max_duration_ms, `${dur.toFixed(0)}ms median`);
    }
    console.log(`  INFO B7 reasoning: ${api.toFixed(0)}ms api of ${dur.toFixed(0)}ms wall`);

    if (basePass === 0) {
      // a baseline that completed nothing spent tokens on failing —
      // ratio comparisons against it would penalize the skill for
      // doing the actual work
      console.log("  INFO baseline never completed the task — ratio gates skipped");
    } else {
      if (bt) {
        gate(sid, "B4 vs baseline", tokens <= bt * RATIO_TOKENS, `${tokens} vs ${bt} (<= ${RATIO_TOKENS}x)`);
      }
      if (bd) {
        gate(sid, "B6 vs baseline", dur <= bd * RATIO_TIME, `${dur.toFixed(0)} vs ${bd.toFixed(0)}ms`);
      }
      if (bn) {
        gate(sid, "B8 turns", turns <= bn * RATIO_TURNS, `${turns} vs ${bn}`);
      }
    }

    // R3 champion/challenger: never replace a passing lineage with a worse one
    const champ = championRow(spec.skill, sid, version);
    if (champ) {
      const cv = beatsChampion({ passes, runs, tokens }, champ);
      gate(sid, "R3 vs champion", cv.ok, cv.detail);
    } else {
      console.log("  INFO INCUBATING — no passing champion history for this " +
        "scenario yet; this lineage sets the bar rather than being gated by one");
    }

    let judgeScore: number | null = null;
    if (scenario.judge && skilled.length) {
      const scores = skilled.map((r) => judge(scenario.judge!, r.result));
      judgeScore = median(scores);
      gate(sid, "B3 quality", judgeScore >= 4, `judge median ${judgeScore}/5`);
    }

    if (record) {
      recordHistory({
        skill: spec.skill, version, scenario: sid,
        prompt_hash: promptHash(scenario.prompt, scenario.assert),
        runs, passes, judge: judgeScore,
        tokens, cost, duration_ms: dur,
        api_ms: api, turns,
        baseline_tokens: bt, baseline_ms: bd, baseline_turns: bn,
        baseline_passes: basePass, verdicts: scoped(sid),
        champion_version: champ ? champ.version : null,
      });
    }
  }

  const triggers = spec.triggers ?? {};
  const hasTriggers = Object.keys(triggers).length > 0;
  if (hasTriggers && !dryRun) {
    const pos = (triggers.positive ?? []).map((p) => skillInvoked(p, spec.skill));
    const neg = (triggers.negative ?? []).map((p) => !skillInvoked(p, spec.skill));
    const hits = (xs: boolean[]) => xs.reduce((a, x) => a + (x ? 1 : 0), 0);
    if (pos.length) {
      gate("triggers", "B9 trigger recall", hits(pos) / pos.length >= 0.8, `${hits(pos)}/${pos.length}`);
    }
    if (neg.length) {
      gate("triggers", "B10 trigger precision", hits(neg) / neg.length >= 0.9, `${hits(neg)}/${neg.length}`);
    }
    if (record && (pos.length || neg.length)) {
      recordHistory({
        skill: spec.skill, version,
        scenario: "triggers",
        recall: pos.length ? hits(pos) / pos.length : null,
        precision: neg.length ? hits(neg) / neg.length : null,
        verdicts: scoped("triggers"),
      });
    }
  } else if (hasTriggers) {
    console.log(`\ntriggers: ${(triggers.positive ?? []).length} positive, ` +
      `${(triggers.negative ?? []).length} negative prompts (skipped in dry-run)`);
  }

  return verdicts;
}

function which(cmd: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    try {
      accessSync(join(dir, cmd), constants.X_OK);
      return true;
    } catch { /* keep looking */ }
  }
  return false;
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function usageError(msg: string): never {
  console.error("usage: skill-bench.ts [-h] [--runs RUNS] [--dry-run] " +
    "[--no-record] [--rebaseline] skill");
  console.error(`skill-bench.ts: error: ${msg}`);
  process.exit(2);
}

/** Python truthiness for spec validation (empty string/array/object are falsy). */
function pyTruthy(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

function main(): void {
  let skill: string | null = null;
  let runs = 3;
  let dryRun = false;
  let noRecord = false;
  let rebaseline = false;

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log("usage: skill-bench.ts [-h] [--runs RUNS] [--dry-run] " +
        "[--no-record] [--rebaseline] skill\n\n" +
        "options:\n" +
        "  --runs RUNS   runs per scenario (default 3)\n" +
        "  --dry-run     validate the scenario file and print the plan; no claude calls\n" +
        "  --no-record   skip appending scores to tests/bench/history.jsonl\n" +
        "  --rebaseline  re-measure the no-skill baseline instead of reusing history");
      process.exit(0);
    } else if (a === "--runs" || a.startsWith("--runs=")) {
      const raw = a === "--runs" ? argv[++i] : a.slice("--runs=".length);
      runs = parseInt(raw, 10);
      if (raw === undefined || Number.isNaN(runs) || String(runs) !== raw.trim()) {
        usageError(`argument --runs: invalid int value: '${raw}'`);
      }
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--no-record") {
      noRecord = true;
    } else if (a === "--rebaseline") {
      rebaseline = true;
    } else if (a.startsWith("-")) {
      usageError(`unrecognized arguments: ${a}`);
    } else if (skill === null) {
      skill = a;
    } else {
      usageError(`unrecognized arguments: ${a}`);
    }
  }
  if (skill === null) usageError("the following arguments are required: skill");

  const specPath = join(REPO, "tests", "bench", `${skill}.json`);
  if (!existsSync(specPath)) {
    die(`no scenario file ${specPath} — see docs/evolve-plan.md`);
  }
  const spec = JSON.parse(readFileSync(specPath, "utf-8")) as Spec;
  for (const field of ["skill", "scenarios"] as const) {
    if (!pyTruthy(spec[field])) throw new Error(`scenario file missing '${field}'`);
  }
  for (const s of spec.scenarios) {
    for (const field of ["id", "prompt", "assert"] as const) {
      if (!pyTruthy(s[field])) throw new Error(`scenario missing '${field}'`);
    }
  }

  if (!dryRun && !which("claude")) die("claude CLI not on PATH");
  console.log(`bench ${spec.skill} — ${spec.scenarios.length} scenario(s)`);
  const verdicts = benchSkill(spec, runs, dryRun, !noRecord, rebaseline);
  if (dryRun) {
    console.log("\ndry-run OK — scenario file valid");
    return;
  }
  const failed: string[] = [];
  for (const [key, ok] of verdicts) {
    if (!ok) failed.push(key.replace("\x00", ":"));
  }
  console.log(`\n${failed.length ? "GATE FAIL: " + failed.join(", ") : "GATE PASS"}`);
  process.exit(failed.length ? 1 : 0);
}

// main-module guard: the regression tests import runScenario/cachedBaseline;
// only run the CLI when executed directly
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
