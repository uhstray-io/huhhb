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
  accessSync, appendFileSync, constants, existsSync, mkdirSync, mkdtempSync,
  readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
/* E5 battle judge: the same R4 evidence rule, made *checkable*. The 1-5 judge
   asks for a quote and nobody verifies it; here both quotes are confirmed as
   verbatim substrings of the side they claim to cite, and a quote that isn't
   really there forces TIE. That is the difference between citing evidence and
   being seen to cite it. */
const BATTLE_TEMPLATE =
  "Two responses answer the same request. Judge which one better satisfies " +
  "the rubric.\n" +
  "Line 1: `QUOTE_A: ` then the shortest verbatim quote from RESPONSE A that " +
  "justifies your verdict.\n" +
  "Line 2: `QUOTE_B: ` then the shortest verbatim quote from RESPONSE B that " +
  "justifies your verdict.\n" +
  "Line 3: ONLY one of A, B, or TIE.\n" +
  "Copy both quotes character-for-character. If you cannot quote both sides, " +
  "answer TIE.\n" +
  "RUBRIC: {rubric}\nRESPONSE A:\n{a}\nRESPONSE B:\n{b}";
export const HASH_CHARS = 12; // identity width — promptHash and skillContentHash join in outputPath
const MAX_BUFFER = 64 * 1024 * 1024; // stream-json transcripts outgrow node's 1MB default
// SKILL_BENCH_BATTLES / SKILL_BENCH_OUTPUTS: test-only overrides, same shape
// as SKILL_BENCH_HISTORY
const BATTLES = process.env.SKILL_BENCH_BATTLES
  ?? join(REPO, "tests", "bench", "battles.jsonl");
const OUTPUTS = process.env.SKILL_BENCH_OUTPUTS
  ?? join(REPO, "tests", "bench", "outputs");
// E5 superiority floor: below this a tally is reported and nothing is declared
const SUPERIORITY_MIN_DECIDED = 5;
const SUPERIORITY_WIN_RATE = 0.7;

type Json = Record<string, unknown>;
type Scenario = {
  id: string; prompt: string; assert: string;
  phrasing?: boolean; judge?: string; env?: Record<string, string>;
  // E2 scenarios asserting the skill stays silent have no comparable output
  expect_no_activation?: boolean;
};
type Spec = {
  skill: string; scenarios: Scenario[];
  budget?: { max_tokens?: number; max_cost_usd?: number; max_duration_ms?: number };
  triggers?: { positive?: string[]; negative?: string[] };
};
type RunRow = {
  pass: boolean; tokens: number; cost: number; duration_ms: number;
  api_ms: number; turns: number;
  /* The response, untruncated. It was previously carried twice — clipped for
     the 1-5 judge and whole for battle — which meant the two judges scored
     different artifacts and neither said so. Clip at the call site that needs
     a short form. */
  result: string;
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
        result: String(data.result ?? ""),
      });
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  }
  return rows;
}

/* Replacer-function form on purpose: String.replace expands $&, $', $1 … in a
   REPLACEMENT string, so a response containing "$&" would silently rewrite the
   prompt around it. A function replacement is inert. */
function fill(template: string, slots: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(slots)) out = out.replace(`{${key}}`, () => value);
  return out;
}

function judge(rubric: string, response: string): number {
  const data = runClaude(fill(JUDGE_TEMPLATE, { rubric, response }));
  // the score is the FINAL line, bare 1-5 only — the evidence quote above
  // may itself contain digits, and a scavenged digit recorded as a score is
  // worse than failing closed (0 fails the B3 gate loudly)
  const score = cleanLines(String(data.result ?? "")).at(-1) ?? "";
  return /^[1-5]$/.test(score) ? Number(score) : 0;
}

/* A judge response split into trimmed, non-empty lines. Both judges read the
   verdict off the FINAL one: the evidence quote above it may itself contain
   digits or a bare A/B, and a scavenged token recorded as a verdict is worse
   than failing closed. */
function cleanLines(raw: string): string[] {
  return String(raw ?? "").trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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

/* Append one row to a git-tracked ledger (tests/bench/history.jsonl by default,
   battles.jsonl for the pairwise ones). One writer for both: the ts+commit stamp
   is the key skill-trends.ts reads rows by, so it is defined here and nowhere
   else.

   Append-only JSONL on purpose: rows are diffable in PRs, survive forever in
   git, and skill-trends.ts reads the file directly — the query layer is a
   reader, never a deployment (docs/evolve-plan.md, History & trends). */
function recordHistory(row: Json, file = HISTORY): void {
  const git = spawnSync("git", ["rev-parse", "--short", "HEAD"],
    { cwd: REPO, encoding: "utf-8" });
  const ts = new Date().toISOString().slice(0, 19) + "Z";
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, pyJson({ ts, commit: (git.stdout ?? "").trim() || "?", ...row }) + "\n");
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
    .digest("hex").slice(0, HASH_CHARS);
}

/* The one place in THIS file that reads the ledger: newest-first, tolerating
   unparseable lines. Both champion lookup and baseline caching are predicates
   over it — two copies would drift the moment either grows a guard.
   skill-trends.ts and evolve/g2.ts parse the same file with their own readers,
   so the contract they share with this one is the row shape, not this code. */
function latestHistoryRow(match: (row: Json) => boolean): Json | null {
  if (!existsSync(HISTORY)) return null;
  const lines = readFileSync(HISTORY, "utf-8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let row: Json;
    try {
      row = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (match(row)) return row;
  }
  return null;
}

/* R3: the champion is the latest history row for this skill+scenario from a
   DIFFERENT version that completed all its runs — the bar a challenger must
   meet ("no victory, no replacement"). Same-version rows are re-runs, not
   rivals; rows that never fully passed set no bar.

   `pHash` is part of the identity, not a refinement of it. A scenario can keep
   its id while its prompt or assert changes, and then the old row measures a
   different requirement — gating a new prompt's pass rate and tokens against it
   compares two unrelated things. cachedBaseline already matches on prompt_hash
   for exactly this reason; the two must agree on what "the same scenario" means.
   No fully-passed row in the current ledger predates prompt_hash, so requiring
   it orphans no existing champion. */
export function championRow(
  skill: string, scenarioId: string, version: string, pHash: string,
): Json | null {
  return latestHistoryRow((row) =>
    row.skill === skill && row.scenario === scenarioId
    && row.prompt_hash === pHash
    && Boolean(row.version) && row.version !== version
    && Number(row.runs) > 0 && Number(row.passes) === Number(row.runs));
}

/* The challenger side of the same bar. battleSkill used to require only that a
   banked output FILE existed, which let a challenger that failed its assert
   enter a battle and take a BATTLE PASS — outputs are banked before any gate
   runs, deliberately, so --review can inspect failures. Requiring a fully-passed
   row makes the two sides symmetric: the champion had to pass to set the bar,
   so the challenger has to pass to contest it. */
export function challengerRow(
  skill: string, scenarioId: string, version: string, pHash: string,
): Json | null {
  return latestHistoryRow((row) =>
    row.skill === skill && row.scenario === scenarioId
    && row.prompt_hash === pHash && row.version === version
    && Number(row.runs) > 0 && Number(row.passes) === Number(row.runs));
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
  const want = promptHash(scenario.prompt, scenario.assert);
  return latestHistoryRow((row) =>
    row.skill === skill && row.scenario === scenario.id
    && row.prompt_hash === want && Boolean(row.baseline_tokens)
    // rows predating baseline_passes can't prove the baseline ever
    // completed — re-measure instead of trusting them
    && row.baseline_passes !== null && row.baseline_passes !== undefined);
}

/* ------------------------------------------------------------ E5 battle mode

   Pairwise judging of two skill versions over the same scenario. Absolute 1-5
   scores compress and drift across judge-model versions, so they answer "did
   this run get worse" but never "is this version better than the one it
   replaces". Battle answers the second question, and only ever ranks variants
   that already cleared the objective gates — asserts, budgets, R3.

   Battle NEVER generates the champion side. The bench drives whatever plugin
   is installed, so the installed skill *is* the challenger; producing a
   "champion" output from the same process would be a self-vs-self battle
   wearing the costume of a verdict. Champion output comes from the bank or
   the scenario is excluded and the exclusion logged.                        */

export type BattleVerdict = "A" | "B" | "TIE";
export type BattleSide = "challenger" | "champion" | "TIE";
export type Tally = { wins: number; losses: number; ties: number; decided: number };

/** Content identity of a skill: every tracked file under skills/<name>/, sorted.
    `ref` reads that version out of git instead of the working tree. Paths are
    normalized relative to the skill dir so a ref hash and a worktree hash of
    identical content agree. */
export function skillContentHash(skill: string, ref: string | null = null): string {
  const rel = `skills/${skill}`;
  /* BOTH sides enumerate from git and read raw bytes. Listing the worktree from
     disk instead let a file git ignores — a .DS_Store from opening the folder in
     Finder — change one side only: measured, worktree 528ddf93ff4a -> ed6056fcd8c2
     while HEAD stayed put, on a tree `git status` called clean. A banked champion
     then resolves to a key the challenger side can never produce. Raw bytes for
     the same reason: `git show` decoded as utf-8 substitutes U+FFFD, so a
     committed non-UTF-8 file would diverge from readFileSync's bytes. */
  const list = ref
    ? spawnSync("git", ["ls-tree", "-r", "--name-only", ref, "--", rel],
        { cwd: REPO, encoding: "utf-8" })
    : spawnSync("git", ["ls-files", "--cached", "--", rel],
        { cwd: REPO, encoding: "utf-8" });
  const files = (list.stdout ?? "").split("\n").filter(Boolean).sort();
  if (list.status !== 0 || !files.length) {
    throw new Error(ref ? `no ${rel} at ref ${ref}` : `no tracked files under ${rel}`);
  }
  /* One file at a time: the ref branch would otherwise hold every file's
     contents at once, each capped at MAX_BUFFER. */
  const h = createHash("sha256");
  for (const f of files) {
    const body = ref
      ? spawnSync("git", ["show", `${ref}:${f}`],
          { cwd: REPO, maxBuffer: MAX_BUFFER }).stdout ?? Buffer.alloc(0)
      : readFileSync(join(REPO, f));
    h.update(f.slice(rel.length + 1)).update(" ").update(body).update(" ");
  }
  return h.digest("hex").slice(0, HASH_CHARS);
}

/* Outputs are keyed by (prompt hash, skill content hash), so an unchanged
   champion costs zero across revise-and-rebattle cycles and a plain bench run
   banks the challenger side as a side effect. */
export function outputPath(skill: string, scenarioId: string,
                           pHash: string, sHash: string): string {
  return join(OUTPUTS, skill, `${scenarioId}-${pHash}-${sHash}.txt`);
}

function bankOutput(skill: string, scenarioId: string, pHash: string,
                    sHash: string, text: string): void {
  const p = outputPath(skill, scenarioId, pHash, sHash);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

export function loadOutput(skill: string, scenarioId: string,
                           pHash: string, sHash: string): string | null {
  const p = outputPath(skill, scenarioId, pHash, sHash);
  return existsSync(p) ? readFileSync(p, "utf-8") : null;
}

/** A judge fond of wrapping its quote in quotation marks the source never had. */
function unquote(s: string): string {
  const m = /^(["'`])([\s\S]*)\1$/.exec(s.trim());
  return m ? m[2] : s.trim();
}

/* The R4 evidence rule, enforced rather than requested: each cited quote must
   actually occur in the side it claims to cite. A verdict that cannot be
   grounded in both outputs is a TIE, not a win. */
export function parseBattleVerdict(raw: string, outA: string, outB: string):
    { verdict: BattleVerdict; reason: string } {
  const lines = cleanLines(raw);
  const last = lines[lines.length - 1] ?? "";
  // Fail closed to TIE, but record WHY: "the judge tied" and "the judge
  // emitted garbage" are different facts, and this bench has already been
  // bitten once by conflating a parse failure with a score (judge() → 0/5).
  if (!/^(A|B|TIE)$/.test(last)) return { verdict: "TIE", reason: "unparseable" };
  if (last === "TIE") return { verdict: "TIE", reason: "judge-tie" };
  const quoted = (label: string): string => {
    const line = lines.find((l) => l.toUpperCase().startsWith(label));
    return line ? unquote(line.slice(label.length)) : "";
  };
  const qa = quoted("QUOTE_A:");
  const qb = quoted("QUOTE_B:");
  if (!qa || !outA.includes(qa)) return { verdict: "TIE", reason: "unquotable-a" };
  if (!qb || !outB.includes(qb)) return { verdict: "TIE", reason: "unquotable-b" };
  return { verdict: last as BattleVerdict, reason: "cited" };
}

/* Call 1 presents the champion as A; call 2 swaps the sides. Un-swap and
   require agreement — a verdict that flips with position is position bias,
   the dominant known failure of pairwise judges, not a preference. */
export function reconcileSwap(first: BattleVerdict, second: BattleVerdict): BattleSide {
  if (first === "A" && second === "B") return "champion";
  if (first === "B" && second === "A") return "challenger";
  return "TIE";
}

export function battleTally(results: BattleSide[]): Tally {
  const wins = results.filter((r) => r === "challenger").length;
  const losses = results.filter((r) => r === "champion").length;
  return {
    wins, losses,
    ties: results.filter((r) => r === "TIE").length,
    decided: wins + losses,
  };
}

/** Non-regression — the retrofit gate. All-ties passes: nothing got worse. */
export function nonRegression(t: Tally): { ok: boolean; detail: string } {
  if (!t.decided) return { ok: true, detail: `${t.ties} tie(s), 0 decided — not worse` };
  return {
    ok: t.wins >= t.losses,
    detail: `${t.wins}W/${t.losses}L/${t.ties}T — wins ` +
      `${t.wins >= t.losses ? ">=" : "<"} losses`,
  };
}

/** Superiority — required to *declare* a challenger better. Deliberately
    unreachable for a minimum-size bench: growing the scenario set is what
    unlocks it, rather than letting a two-scenario sample crown a winner. */
export function superiority(t: Tally): { declared: boolean; detail: string } {
  const rate = t.decided ? t.wins / t.decided : 0;
  return {
    declared: t.decided >= SUPERIORITY_MIN_DECIDED && rate >= SUPERIORITY_WIN_RATE,
    detail: `${t.wins}/${t.decided} decided (${(rate * 100).toFixed(0)}%) — needs ` +
      `>=${SUPERIORITY_MIN_DECIDED} decided and >=${SUPERIORITY_WIN_RATE * 100}%`,
  };
}

function battleJudge(rubric: string, a: string, b: string):
    { verdict: BattleVerdict; reason: string; raw: string } {
  const data = runClaude(fill(BATTLE_TEMPLATE, { rubric, a, b }));
  const raw = String(data.result ?? "");
  return { ...parseBattleVerdict(raw, a, b), raw };
}

function battleSkill(spec: Spec, championRef: string | null, dryRun: boolean,
                     record: boolean): { ok: boolean; judged: number } {
  const skill = spec.skill;
  const version = skillVersion(skill);
  const challengerHash = skillContentHash(skill);
  // invariant across scenarios: resolve the ref once, not once per scenario
  const refHash = championRef ? skillContentHash(skill, championRef) : null;
  const results: BattleSide[] = [];
  console.log(`battle ${skill} — challenger ${challengerHash} vs ` +
    (championRef ? `ref ${championRef}` : "the R3 champion lineage"));

  for (const scenario of spec.scenarios) {
    const sid = scenario.id;
    const skip = (why: string): void => console.log(`  SKIP ${sid}: ${why}`);
    /* Eligibility is decided by what a scenario can SUPPLY, not by what kind it
       is: a probe scenario carries no rubric and banks no output, so the two
       guards below already exclude it. A type check here would be a third rule
       saying the same thing, and a new scenario kind would need an edit. */
    if (!scenario.judge) {
      skip("no rubric — battle ranks against a rubric or not at all");
      continue;
    }
    const pHash = promptHash(scenario.prompt, scenario.assert);
    let champHash: string | null = refHash;
    let champVersion = championRef ?? "?";
    if (!championRef) {
      const row = championRow(skill, sid, version, pHash);
      if (row?.skill_hash) {
        champHash = String(row.skill_hash);
        champVersion = String(row.version);
      }
    }
    if (!champHash) {
      skip("no champion lineage carrying a skill hash — bench an earlier version first");
      continue;
    }
    if (champHash === challengerHash) {
      skip(`champion and challenger are the same content (${champHash})`);
      continue;
    }
    const champOut = loadOutput(skill, sid, pHash, champHash);
    if (champOut === null) {
      skip(`champion output not banked (${champHash}) — bench that version ` +
        "first; battle never generates the champion side");
      continue;
    }
    const challOut = loadOutput(skill, sid, pHash, challengerHash);
    if (challOut === null) {
      skip(`challenger output not banked (${challengerHash}) — run a plain bench first`);
      continue;
    }
    /* A banked file proves a run happened, not that it passed. Without this the
       challenger's own assert failure never reaches battle, and a broken skill
       can still take a BATTLE PASS off a judge that liked its prose. */
    if (!challengerRow(skill, sid, version, pHash)) {
      skip(`challenger ${version} has no fully-passing run for this scenario — ` +
        "a side that cannot pass its own assert does not get to contest the champion");
      continue;
    }
    if (dryRun) {
      console.log(`  would judge ${sid}: champion ${champHash} vs challenger ` +
        `${challengerHash}, 2 calls (champion-first, then swapped)`);
      continue;
    }

    /* Champion as A first. The swap is skipped after a first-order TIE because
       reconcileSwap("TIE", x) === "TIE" for every x — verdict, tally and every
       gate are provably identical either way, and ties are the modal case, so
       this halves the judge calls where they are most common.

       What it forgoes, precisely: a judge that ties one way and picks a side the
       other is position-sensitive, and that shows up as "(positions disagreed)"
       only when the first order was decided. For a tied pair the evidence is not
       collected. That costs no verdict — a swapped pair reconciles to TIE either
       way — but it does mean position sensitivity is measured on decided pairs
       only. Drop the condition to measure it everywhere, at double the price. */
    const first = battleJudge(scenario.judge, champOut, challOut);
    let second: { verdict: BattleVerdict; reason: string; raw: string } | null = null;
    let verdict: BattleSide = "TIE";
    if (first.verdict !== "TIE") {
      second = battleJudge(scenario.judge, challOut, champOut);
      verdict = reconcileSwap(first.verdict, second.verdict);
    }
    results.push(verdict);
    const flipped = second && verdict === "TIE";
    console.log(`  ${sid}: ${verdict}${flipped ? " (positions disagreed)" : ""} ` +
      `[${first.reason}${second ? "/" + second.reason : ""}]`);
    if (record) {
      /* One record per judged pair — both presentation orders verbatim. A
         verdict that isn't logged is gone, and an unlogged verdict cannot be
         re-adjudicated. */
      recordHistory({
        skill, scenario: sid, prompt_hash: pHash,
        champion_version: champVersion, champion_hash: champHash,
        challenger_version: version, challenger_hash: challengerHash,
        champion_output: outputPath(skill, sid, pHash, champHash),
        challenger_output: outputPath(skill, sid, pHash, challengerHash),
        order1_verdict: first.verdict, order1_reason: first.reason, order1_raw: first.raw,
        order2_verdict: second ? second.verdict : null,
        order2_reason: second ? second.reason : null,
        order2_raw: second ? second.raw : null,
        verdict,
      }, BATTLES);
    }
  }

  if (dryRun) {
    console.log("\ndry-run OK — battle plan above, no tokens spent");
    return { ok: true, judged: 0 }; // a dry run judges nothing, by construction
  }
  // Print no tally for an empty battle: "PASS non-regression: 0 decided" above
  // a NO VERDICT line is precisely the reassuring-green this gate exists to
  // stop emitting.
  if (!results.length) return { ok: false, judged: 0 };
  const tally = battleTally(results);
  const nr = nonRegression(tally);
  const sup = superiority(tally);
  console.log(`\n  ${nr.ok ? "PASS" : "FAIL"} non-regression: ${nr.detail}`);
  console.log(`  ${sup.declared ? "DECLARED" : "not declared"} superiority: ${sup.detail}`);
  // Only the tally lands in history — skill-trends.ts stays the single reader,
  // and battles.jsonl keeps the per-pair detail it would never aggregate.
  if (record && results.length) {
    recordHistory({
      skill, version, scenario: "battle",
      wins: tally.wins, losses: tally.losses, ties: tally.ties,
      decided: tally.decided, non_regression: nr.ok, superiority: sup.declared,
      champion_version: championRef ?? null,
    });
  }
  return { ok: nr.ok, judged: results.length };
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
  // A bench spec may name a skill this repo doesn't own (plugin-provided);
  // that costs banking, not the run.
  let skillHash: string | null = null;
  try {
    skillHash = skillContentHash(spec.skill);
  } catch {
    console.log(`  INFO no skills/${spec.skill}/ — outputs not banked, battle unavailable`);
  }
  for (const scenario of spec.scenarios) {
    const sid = scenario.id;

    /* E2 negative activation: the skill must stay SILENT on its nearest
       neighbour. This is a property of the description, not of the body, so it
       is decided by the trigger probe alone — no assert run, no judge call, no
       baseline arm. Running the scenario would measure the wrong thing: a skill
       that never fired has no output to assert against, and an assert that
       passes on the baseline's answer would score the absence as a success. */
    if (scenario.expect_no_activation) {
      console.log(`\nscenario ${sid} (negative activation — trigger probe only)`);
      if (dryRun) {
        console.log(`  would probe: claude -p ${pyRepr(scenario.prompt)}  expect: no activation`);
        continue;
      }
      // skillInvoked throws on a probe that did not actually run — a silent
      // non-run must never be recorded as "the skill correctly declined"
      const fired = skillInvoked(scenario.prompt, spec.skill);
      gate(sid, "B10 negative activation", !fired,
        fired ? "skill fired on a prompt it must ignore" : "stayed silent");
      if (record) {
        recordHistory({
          skill: spec.skill, version, scenario: sid,
          prompt_hash: promptHash(scenario.prompt, scenario.assert),
          expect_no_activation: true, activated: fired,
          verdicts: scoped(sid), skill_hash: skillHash,
        });
      }
      continue;
    }

    console.log(`\nscenario ${sid} (${runs} runs + baseline)`);
    if (dryRun) {
      console.log(`  would run: claude -p ${pyRepr(scenario.prompt)}  assert: ${scenario.assert}`);
      continue;
    }
    const sPHash = promptHash(scenario.prompt, scenario.assert);
    const skilled = runScenario(scenario, runs, false);
    /* Bank a representative output for battle: the first run that passed its
       assert, else the first run. Banking happens here, before any gate, so
       --review can inspect a failure — which means the BANK IS NOT A GATE.
       battleSkill enforces the pass separately via challengerRow; an earlier
       comment here claimed the bank did it, and nothing did. */
    if (skillHash && skilled.length) {
      const rep = skilled.find((r) => r.pass) ?? skilled[0];
      bankOutput(spec.skill, sid, sPHash, skillHash, rep.result);
    }
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
    const champ = championRow(spec.skill, sid, version, sPHash);
    if (champ) {
      const cv = beatsChampion({ passes, runs, tokens }, champ);
      gate(sid, "R3 vs champion", cv.ok, cv.detail);
    } else {
      console.log("  INFO INCUBATING — no passing champion history for this " +
        "scenario yet; this lineage sets the bar rather than being gated by one");
    }

    let judgeScore: number | null = null;
    if (scenario.judge && skilled.length) {
      // clip here: the rubric judge only needs the head of the response
      const scores = skilled.map((r) => judge(scenario.judge!, r.result.slice(0, 2000)));
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
        // the join from a champion history row to its banked outputs —
        // championRow yields a version, the output bank is keyed by content
        skill_hash: skillHash,
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

const USAGE = "usage: skill-bench.ts [-h] [--runs RUNS] [--dry-run] " +
  "[--no-record] [--rebaseline] [--battle] [--champion REF] skill";

function usageError(msg: string): never {
  console.error(USAGE);
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
  let battle = false;
  let championRef: string | null = null;

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(USAGE + "\n\n" +
        "options:\n" +
        "  --runs RUNS   runs per scenario (default 3)\n" +
        "  --dry-run     validate the scenario file and print the plan; no claude calls\n" +
        "  --no-record   skip appending scores to tests/bench/history.jsonl\n" +
        "  --rebaseline  re-measure the no-skill baseline instead of reusing history\n" +
        "  --battle      judge banked outputs pairwise against the champion;\n" +
        "                runs no scenarios and never generates the champion side\n" +
        "  --champion REF  battle against the skill as of this git ref instead\n" +
        "                of the R3 champion lineage");
      process.exit(0);
    } else if (a === "--battle") {
      battle = true;
    } else if (a === "--champion" || a.startsWith("--champion=")) {
      championRef = a === "--champion" ? argv[++i] : a.slice("--champion=".length);
      if (!championRef) usageError("argument --champion: expected a git ref");
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
  if (championRef && !battle) usageError("--champion requires --battle");

  const specPath = join(REPO, "tests", "bench", `${skill}.json`);
  if (!existsSync(specPath)) {
    die(`no scenario file ${specPath} — see docs/evolve-plan.md`);
  }
  const spec = JSON.parse(readFileSync(specPath, "utf-8")) as Spec;
  for (const field of ["skill", "scenarios"] as const) {
    if (!pyTruthy(spec[field])) throw new Error(`scenario file missing '${field}'`);
  }
  for (const s of spec.scenarios) {
    // a negative-activation scenario is decided by the trigger probe, so it has
    // no output to assert against and requiring one would invite a meaningless
    // placeholder that later reads as a real check
    const required = s.expect_no_activation
      ? (["id", "prompt"] as const)
      : (["id", "prompt", "assert"] as const);
    for (const field of required) {
      if (!pyTruthy(s[field])) throw new Error(`scenario missing '${field}'`);
    }
  }

  if (!dryRun && !which("claude")) die("claude CLI not on PATH");

  if (battle) {
    // Battle is a re-judging pass over banked outputs, not a bench run — it
    // spends judge calls only, and gates on non-regression alone. Superiority
    // is reported, never gated: declaring a winner is a human's call.
    const { ok, judged } = battleSkill(spec, championRef, dryRun, !noRecord);
    if (dryRun) return;
    // An empty battle is NOT a pass. Every scenario excluded means the gate has
    // no evidence, and a gate with no evidence must not certify — that is the
    // exact failure this bench already has thirteen times over (issue #53).
    if (!judged) {
      console.log("\nBATTLE NO VERDICT — every scenario was excluded, nothing " +
        "was judged; this is not a pass");
      process.exit(1);
    }
    console.log(`\n${ok ? "BATTLE PASS" : "BATTLE FAIL"}`);
    process.exit(ok ? 0 : 1);
  }
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
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main();
}
