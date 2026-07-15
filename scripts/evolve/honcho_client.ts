#!/usr/bin/env node
// huhhb evolve — Honcho client substrate. (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import * as guardrails from "./guardrails.ts";

// module docstring (also the --help description, mirroring Python argparse)
const __doc__ = `huhhb evolve — Honcho client substrate.

Single choke point for all Honcho SDK calls (pinned @honcho-ai/sdk —
the documented DX TypeScript SDK, the analog of Python's honcho-ai).
Config chain: env (HONCHO_URL / HONCHO_API_KEY / HONCHO_WORKSPACE)
  > ~/.config/huhhb/evolve.json > unconfigured (suite is inert).

Subcommands:
  smoke                     6-step round-trip against the configured instance
  observe --type --target --content [--session]   write one observation now
  query  {card,rep,search,chat} --q ... [--target] [--level]
  status                    config source, queue status, local state dirs
  init   --url --api-key --workspace              write the config file

The Honcho SDK is imported lazily (dynamic import): everything except the
network paths works without it, and the install hint is printed once instead
of a stack trace.`;

// the SDK is dynamic and OPTIONAL — never a package.json dependency
// (mirrors Python's lazy `from honcho import Honcho` + ImportError hint)
export const HONCHO_PKG = "@honcho-ai/sdk";
export const HONCHO_PIN = HONCHO_PKG; // name kept for parity with the Python module
// Honcho constrains peer/session ids to ^[a-zA-Z0-9_-]+$ (no colons) —
// found live by smoke against 2.x; "__" is the namespace separator.
export const AGENT_PEER = "agent__claude-code";
export const LESSONS_SESSION = "lessons";

export const CONFIG_PATH = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "huhhb",
  "evolve.json",
);
export const DATA_DIR = path.join(
  process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
  "huhhb",
  "evolve",
);
export const SPOOL_DIR = path.join(DATA_DIR, "spool");
export const CONTEXT_DIR = path.join(DATA_DIR, "context");
export const PENDING_DIR = path.join(DATA_DIR, "pending");
export const STATE_PATH = path.join(DATA_DIR, "state.json");
export const INJECTION_PATH = path.join(CONTEXT_DIR, "injection.md");
export const JOURNAL_PATH = path.join(DATA_DIR, "journal.jsonl");
export const CONCLUSIONS_PATH = path.join(DATA_DIR, "conclusions.md");
export const JOURNAL_MAX_LINES = 500;

// ------------------------------------------------------------ port shims
// Small Python-semantics helpers shared by the evolve TS modules. They exist
// so CLI output stays byte-compatible with the Python originals (other code
// and skill prose parse these formats).

/* Python-style SystemExit: sys.exit(msg) prints to stderr and exits 1;
sys.exit(n) exits n. Thrown (not process.exit) so `finally` blocks — lock
releases — still run, and flush can `except SystemExit: pass`. */
export class SystemExit extends Error {
  code: number;
  constructor(code: number) {
    super(`SystemExit(${code})`);
    this.code = code;
  }
}

export function sys_exit(arg?: number | string): never {
  if (typeof arg === "string") {
    process.stderr.write(arg + "\n");
    throw new SystemExit(1);
  }
  throw new SystemExit(arg ?? 0);
}

/* Run a script's main() under the Python-like exit protocol: SystemExit sets
the exit code; any other error prints a stack trace and exits 1. Uses
process.exitCode (not process.exit) so stdout/stderr always flush. */
export function run_main(fn: () => unknown): void {
  const handle = (e: unknown): void => {
    if (e instanceof SystemExit) {
      process.exitCode = e.code;
      return;
    }
    process.stderr.write(String((e as Error)?.stack ?? e) + "\n");
    process.exitCode = 1;
  };
  try {
    const r = fn();
    if (r instanceof Promise) r.catch(handle);
  } catch (e) {
    handle(e);
  }
}

/* str(float) parity: Python renders integer-valued floats as "1.0". */
export function py_float_str(x: number): string {
  return Number.isFinite(x) && Number.isInteger(x) ? x.toFixed(1) : String(x);
}

/* round(x, 2) parity (toFixed rounds dyadic ties away from zero where Python
rounds them to even — indistinguishable for this suite's ratios). */
export function py_round2(x: number): number {
  return Number(x.toFixed(2));
}

/* str.splitlines() parity for \n / \r\n / \r: no phantom trailing element. */
export function py_splitlines(s: string): string[] {
  const parts = s.split(/\r\n|\r|\n/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

/* Code-point slice parity for Python's text[:n]. */
export function py_cut(s: string, n: number): string {
  const chars = Array.from(s);
  return chars.length <= n ? s : chars.slice(0, n).join("");
}

/* Python str(exception) — just the message, no "Error:" prefix. */
export function py_err(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/* json.dumps parity: ensure_ascii \uXXXX escapes, Python separators for both
the indent and compact forms, undefined treated as None, and float_keys
naming fields whose integer-valued numbers must render as floats ("1.0"). */
export function py_json_dumps(
  value: unknown,
  opts: { indent?: number; float_keys?: ReadonlySet<string> } = {},
): string {
  const { indent, float_keys } = opts;
  const esc = (s: string): string =>
    JSON.stringify(s).replace(
      /[\u{7f}-\u{ffff}]/gu,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
  const go = (v: unknown, depth: number, float_ctx: boolean): string => {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return float_ctx ? py_float_str(v) : String(v);
    if (typeof v === "string") return esc(v);
    const inner = indent ? "\n" + " ".repeat(indent * (depth + 1)) : "";
    const close = indent ? "\n" + " ".repeat(indent * depth) : "";
    const join = indent ? "," + inner : ", ";
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      return "[" + inner + v.map((x) => go(x, depth + 1, float_ctx)).join(join) + close + "]";
    }
    const entries = Object.entries(v as Record<string, unknown>);
    if (!entries.length) return "{}";
    return (
      "{" +
      inner +
      entries
        .map(([k, x]) => esc(k) + ": " + go(x, depth + 1, Boolean(float_keys?.has(k))))
        .join(join) +
      close +
      "}"
    );
  };
  return go(value, 0, false);
}

/* Synchronous sleep (stdlib only) for the lockfile retry loop. */
export function sleep_ms(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ------------------------------------------------------------ mini argparse
// Just enough of Python argparse for these CLIs: subcommands, --flag value /
// --flag=value, store_true, choices, int/float conversion, required checks,
// -h/--help (exit 0), errors to stderr with exit 2. Help/usage text is an
// approximation of argparse's; the error exit codes and the machine-parsed
// stdout formats are the frozen contract.

export interface CliOpt {
  flag: string; // "--type", or the positional's name
  positional?: boolean;
  required?: boolean;
  choices?: readonly string[];
  type?: "int" | "float";
  store_true?: boolean;
  def?: unknown;
  dest?: string;
}

export function parse_cli(
  prog: string,
  description: string,
  subs: Record<string, CliOpt[]>,
  argv: string[],
): Record<string, any> {
  const sub_names = Object.keys(subs);
  const usage = `usage: ${prog} [-h] {${sub_names.join(",")}} ...`;
  const err = (msg: string): never => {
    process.stderr.write(usage + "\n" + `${prog}: error: ${msg}\n`);
    throw new SystemExit(2);
  };
  const help = (): never => {
    process.stdout.write(usage + "\n\n" + description.trim() + "\n");
    throw new SystemExit(0);
  };
  if (!argv.length) err("the following arguments are required: cmd");
  if (argv[0] === "-h" || argv[0] === "--help") help();
  const cmd = argv[0];
  if (!(cmd in subs)) {
    err(
      `argument cmd: invalid choice: '${cmd}' (choose from ${sub_names
        .map((n) => `'${n}'`)
        .join(", ")})`,
    );
  }
  const spec = subs[cmd];
  const dest_of = (o: CliOpt): string => o.dest ?? o.flag.replace(/^--/, "").replace(/-/g, "_");
  const display_of = (o: CliOpt): string => (o.positional ? o.flag : o.flag);
  const convert = (o: CliOpt, v: string): unknown => {
    if (o.type === "int") {
      if (!/^[+-]?\d+$/.test(v.trim())) err(`argument ${display_of(o)}: invalid int value: '${v}'`);
      return parseInt(v, 10);
    }
    if (o.type === "float") {
      const n = Number(v.trim());
      if (v.trim() === "" || Number.isNaN(n)) {
        err(`argument ${display_of(o)}: invalid float value: '${v}'`);
      }
      return n;
    }
    if (o.choices && !o.choices.includes(v)) {
      err(
        `argument ${display_of(o)}: invalid choice: '${v}' (choose from ${o.choices
          .map((c) => `'${c}'`)
          .join(", ")})`,
      );
    }
    return v;
  };

  const out: Record<string, any> = { cmd };
  const assigned = new Set<string>();
  for (const o of spec) {
    out[dest_of(o)] = o.store_true ? false : o.def ?? null;
  }
  const positionals = spec.filter((o) => o.positional);
  let pos_i = 0;
  const toks = argv.slice(1);
  for (let i = 0; i < toks.length; i++) {
    let tok = toks[i];
    if (tok === "-h" || tok === "--help") help();
    if (tok.startsWith("--")) {
      let val: string | undefined;
      const eq = tok.indexOf("=");
      if (eq !== -1) {
        val = tok.slice(eq + 1);
        tok = tok.slice(0, eq);
      }
      const o = spec.find((s) => !s.positional && s.flag === tok);
      if (!o) err(`unrecognized arguments: ${tok}`);
      const dest = dest_of(o!);
      if (o!.store_true) {
        out[dest] = true;
        assigned.add(dest);
        continue;
      }
      if (val === undefined) {
        if (i + 1 >= toks.length) err(`argument ${o!.flag}: expected one argument`);
        val = toks[++i];
      }
      out[dest] = convert(o!, val);
      assigned.add(dest);
    } else {
      if (pos_i >= positionals.length) err(`unrecognized arguments: ${tok}`);
      const o = positionals[pos_i++];
      out[dest_of(o)] = convert(o, tok);
      assigned.add(dest_of(o));
    }
  }
  const missing = spec
    .filter((o) => (o.required || o.positional) && !assigned.has(dest_of(o)))
    .map((o) => o.flag);
  if (missing.length) err(`the following arguments are required: ${missing.join(", ")}`);
  return out;
}

// ---------------------------------------------------------------- config

export function load_config(): Record<string, any> {
  let cfg: Record<string, any> = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch {
      cfg = {};
    }
  }
  const url = process.env.HONCHO_URL || cfg.url;
  const api_key = process.env.HONCHO_API_KEY || cfg.api_key;
  // mode: honcho (a server to talk to) > local (no server — /evolve-review
  // is the deriver, all state stays in DATA_DIR) > off (suite inert)
  let mode: string;
  if (url || api_key) {
    mode = "honcho";
  } else if (cfg.mode === "local" || process.env.EVOLVE_MODE === "local") {
    mode = "local";
  } else {
    mode = "off";
  }
  return {
    url,
    api_key,
    workspace: process.env.HONCHO_WORKSPACE || cfg.workspace || "huhhb-evolve",
    mode,
    source: ["HONCHO_URL", "HONCHO_API_KEY", "EVOLVE_MODE"].some((v) => process.env[v])
      ? "env"
      : Object.keys(cfg).length
        ? "file"
        : "none",
  };
}

export function configured(cfg?: Record<string, any>): boolean {
  cfg = cfg || load_config();
  return cfg.mode !== "off";
}

export function ensure_dirs(): void {
  // captured session content lives here — keep it private on shared machines,
  // same standard the config file already gets (0o600)
  for (const d of [DATA_DIR, SPOOL_DIR, CONTEXT_DIR, PENDING_DIR]) {
    fs.mkdirSync(d, { recursive: true });
    fs.chmodSync(d, 0o700);
  }
}

export function load_state(): Record<string, any> {
  ensure_dirs();
  let state: Record<string, any> = {};
  if (fs.existsSync(STATE_PATH)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    } catch {
      state = {};
    }
  }
  if (!("profile_id" in state)) {
    state.profile_id = crypto.randomBytes(6).toString("hex");
    save_state(state);
  }
  if (!("recent_skills" in state)) state.recent_skills = [];
  if (!("cursors" in state)) state.cursors = {};
  return state;
}

export function atomic_write(p: string, text: string): void {
  // write temp + rename, same suffix swap as pathlib's with_suffix(".tmp")
  const ext = path.extname(p);
  const tmp = ext ? p.slice(0, -ext.length) + ".tmp" : p + ".tmp";
  fs.writeFileSync(tmp, text);
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, p);
}

const STATE_LOCK_STALE_MS = 10_000;

/* Serialize state.json read-modify-write across concurrent hook runs —
atomic_write only prevents torn writes, not lost updates when two
sessions' Stop hooks race.

Python uses fcntl flock (with a no-op fallback where fcntl is missing);
Node has no stdlib flock, so this is an exclusive-create lockfile with a
retry loop and stale-lock takeover after 10s. Best-effort like the Python
fallback: if the lock can't be won in time, proceed lockless —
atomic_write still prevents torn files. */
export function state_lock<T>(fn: () => T): T {
  ensure_dirs();
  const lock_path = path.join(DATA_DIR, "state.lock");
  let fd: number | null = null;
  const deadline = Date.now() + STATE_LOCK_STALE_MS;
  while (fd === null) {
    try {
      fd = fs.openSync(lock_path, "wx");
    } catch (e: any) {
      if (!(e && e.code === "EEXIST")) break; // unexpected fs error: degrade to lockless
      try {
        if (Date.now() - fs.statSync(lock_path).mtimeMs > STATE_LOCK_STALE_MS) {
          fs.unlinkSync(lock_path); // stale holder — take over
          continue;
        }
      } catch {
        // lock vanished between open and stat — retry immediately
        continue;
      }
      if (Date.now() >= deadline) break; // best-effort: proceed lockless
      sleep_ms(100);
    }
  }
  if (fd !== null) {
    try {
      fs.writeSync(fd, String(process.pid));
    } catch {
      // informational only
    }
  }
  try {
    return fn();
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {}
      try {
        fs.unlinkSync(lock_path);
      } catch {}
    }
  }
}

export function save_state(state: Record<string, any>): void {
  ensure_dirs();
  atomic_write(STATE_PATH, py_json_dumps(state, { indent: 2 }));
}

// ---------------------------------------------------------------- naming

export function user_peer_id(state?: Record<string, any>): string {
  return `user__${(state || load_state()).profile_id}`;
}

export function skill_peer_id(name: string): string {
  return to_peer_id(`skill__${name}`);
}

export function cc_session_id(claude_session_id: string): string {
  return to_peer_id(`cc__${claude_session_id}`);
}

/* Normalize any id (incl. legacy colon-style user input like
"skill:writing-plans") to Honcho's ^[a-zA-Z0-9_-]+$ constraint. */
export function to_peer_id(id: string): string {
  return id.replace(/:/g, "__").replace(/[^a-zA-Z0-9_-]/g, "-");
}

// ---------------------------------------------------------------- client

async function _import_honcho(): Promise<any> {
  try {
    const mod: any = await import(HONCHO_PKG);
    return mod.Honcho ?? mod.default;
  } catch (e: any) {
    if (e && e.code !== "ERR_MODULE_NOT_FOUND" && e.code !== "MODULE_NOT_FOUND") throw e;
    process.stderr.write(
      `${HONCHO_PKG} not installed. Install with:\n  npm install ${HONCHO_PKG}\n` +
        `  (in the plugin root or any ancestor of scripts/evolve — it is an\n` +
        `   optional runtime dependency, never vendored)\n`,
    );
    throw new SystemExit(2);
  }
}

export async function client(cfg?: Record<string, any>): Promise<any> {
  cfg = cfg || load_config();
  if (cfg.mode !== "honcho") {
    process.stderr.write(
      "no Honcho client in this mode. Set HONCHO_URL (self-hosted) or " +
        `HONCHO_API_KEY (managed), use \`init --local\`, or write ${CONFIG_PATH} ` +
        "— see docs/evolve-plan.md.\n",
    );
    throw new SystemExit(2);
  }
  const Honcho = await _import_honcho();
  // constructor keys per the documented TS SDK: workspaceId / baseURL / apiKey
  const kwargs: Record<string, any> = { workspaceId: cfg.workspace };
  if (cfg.url) kwargs.baseURL = cfg.url;
  if (cfg.api_key) kwargs.apiKey = cfg.api_key;
  return new Honcho(kwargs);
}

/* Poll the deriver queue until it drains (pending==0 and in_progress==0).

Returns true if drained, false on timeout. Non-fatal by design — callers
treat a stale representation as acceptable (cache-first doctrine). The TS
SDK does not document a queue-status method (the Python SDK does); probe
both spellings and treat "no such method" as not-drained-yet-unknowable. */
export async function wait_for_derivation(honcho: any, timeout = 90, poll = 5): Promise<boolean> {
  const deadline = Date.now() / 1000 + timeout;
  while (Date.now() / 1000 < deadline) {
    let qs: any;
    try {
      const fn = honcho.queueStatus ?? honcho.queue_status;
      if (!fn) return false;
      qs = await fn.call(honcho);
    } catch {
      return false;
    }
    if (!qs.pending_work_units && !qs.in_progress_work_units
        && !qs.pendingWorkUnits && !qs.inProgressWorkUnits) return true;
    await new Promise((r) => setTimeout(r, poll * 1000));
  }
  return false;
}

// ---------------------------------------------------------------- local store
// Local mode has no deriver: the journal is the observation record and
// conclusions.md (maintained by /evolve-review — the agent IS the deriver)
// is the conclusion layer. Both are plain files under DATA_DIR.

/* Append a digest's observations to the rolling journal (last 500). */
export function journal_append(data: Record<string, any>): void {
  ensure_dirs();
  const lines = fs.existsSync(JOURNAL_PATH)
    ? py_splitlines(fs.readFileSync(JOURNAL_PATH, "utf8"))
    : [];
  for (const obs of data.observations) {
    lines.push(
      py_json_dumps({
        session_id: data.session_id ?? null,
        repo: data.repo ?? null,
        ts: data.ts ?? null,
        ...obs,
      }),
    );
  }
  atomic_write(JOURNAL_PATH, lines.slice(-JOURNAL_MAX_LINES).join("\n") + "\n");
}

export function journal_entries(): Record<string, any>[] {
  if (!fs.existsSync(JOURNAL_PATH)) return [];
  const out: Record<string, any>[] = [];
  for (const line of py_splitlines(fs.readFileSync(JOURNAL_PATH, "utf8"))) {
    try {
      out.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return out;
}

/* The anti-poisoning gate between the journal (evidence) and what the
next session trusts: (admitted, quarantined). Quarantine is a derived
view recomputed on demand — nothing is deleted, the journal is intact. */
export function screened_journal(): [Record<string, any>[], [Record<string, any>, string][]] {
  return guardrails.screen_for_injection(journal_entries());
}

/* Held-back observations, for /evolve-status and /evolve-review triage. */
export function quarantined_observations(): [Record<string, any>, string][] {
  return screened_journal()[1];
}

/* Local stand-in for peer.representation: review-derived conclusions
plus recent stated preferences/corrections — screened for poisoning so a
quarantined bulk batch never reaches recall or injection *in local mode*.
Honcho mode delivers observations to the server unscreened (GR2 does not
yet gate the delivery path — see docs/evolve-plan.md scope). */
export function local_representation(query = ""): string {
  const [admitted] = screened_journal();
  const parts: string[] = [];
  if (fs.existsSync(CONCLUSIONS_PATH)) {
    parts.push(fs.readFileSync(CONCLUSIONS_PATH, "utf8").trim());
  }
  const recent = admitted
    .filter((e) => e.type === "preference" || e.type === "correction")
    .map((e) => e.content);
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const c of [...recent].reverse()) {
    // newest first, drop repeats
    if (!seen.has(c)) {
      seen.add(c);
      dedup.push(c);
    }
  }
  if (dedup.length) {
    parts.push(
      "## Recent stated preferences & corrections\n" +
        dedup
          .slice(0, 8)
          .map((c) => `- ${c}`)
          .join("\n"),
    );
  }
  const text = parts.join("\n\n");
  if (query) {
    const hits = py_splitlines(text).filter((ln) =>
      ln.toLowerCase().includes(query.toLowerCase()),
    );
    return hits.length ? hits.join("\n") : text;
  }
  return text;
}

// ---------------------------------------------------------------- observe

/* Write typed observations as Honcho messages.

Routing (who 'speaks' decides whose representation the deriver builds):
  preference/correction (target user) -> user peer
  skill-usage                         -> the skill peer
  strategic                           -> agent peer, into the 'lessons' session
  everything else                     -> agent peer, into the cc session
*/
export async function add_observations(
  honcho: any,
  state: Record<string, any>,
  session_id: string,
  observations: Record<string, any>[],
): Promise<number> {
  const by_session = new Map<string, any[]>();
  for (const obs of observations) {
    const otype = obs.type;
    const content = obs.content;
    let sid: string;
    let peer_id: string;
    if (otype === "strategic") {
      sid = LESSONS_SESSION;
      peer_id = AGENT_PEER;
    } else if (obs.target === "user") {
      sid = cc_session_id(session_id);
      peer_id = user_peer_id(state);
    } else if (otype === "skill-usage" && obs.skill) {
      sid = cc_session_id(session_id);
      peer_id = skill_peer_id(obs.skill);
    } else {
      sid = cc_session_id(session_id);
      peer_id = AGENT_PEER;
    }
    const peer = await honcho.peer(peer_id);
    const meta: Record<string, any> = {};
    for (const [k, v] of Object.entries(obs)) {
      if (k !== "content") meta[k] = v;
    }
    if (!by_session.has(sid)) by_session.set(sid, []);
    by_session.get(sid)!.push(peer.message(content, { metadata: meta }));
  }
  for (const [sid, msgs] of by_session) {
    await (await honcho.session(sid)).addMessages(msgs);
  }
  let total = 0;
  for (const msgs of by_session.values()) total += msgs.length;
  return total;
}

// ---------------------------------------------------------------- smoke

export async function cmd_smoke(_args: Record<string, any>): Promise<void> {
  const cfg = load_config();
  const state = load_state();
  const steps_total = 6;
  console.log(
    `evolve smoke — workspace=${cfg.workspace} url=${cfg.url || "managed default"} (config: ${cfg.source})`,
  );

  const step = (n: number, name: string): void => {
    process.stdout.write(`[${n}/${steps_total}] ${name} ... `);
  };

  const fail = (msg: string): never => {
    console.log(`FAIL\n  ${msg}`);
    throw new SystemExit(1);
  };

  // 1. connectivity — first peer() call performs the workspace-ensure POST
  step(1, "connect + workspace ensure");
  const h = await client(cfg);
  let probe_user: any;
  let probe_agent: any;
  try {
    probe_user = await h.peer("user__smoke-probe");
    probe_agent = await h.peer(AGENT_PEER);
  } catch (e) {
    fail(`cannot reach Honcho: ${py_err(e)}`);
  }
  console.log("ok");

  // 2. seed observations (incl. one failure-mode-phrased-as-fix — the
  //    schema's living example, and step 6's grounding target)
  step(2, "seed observations");
  const sid = `cc__smoke-${Math.floor(Date.now() / 1000)}`;
  try {
    const session = await h.session(sid);
    await session.addMessages([
      probe_user.message(
        "[preference] user__smoke-probe — Prefers conventional commits " +
          "with no emoji in commit subjects; stated explicitly.",
      ),
      probe_agent.message(
        "[technique] project=smoke-repo — pytest-xdist hangs under this " +
          "repo's conftest; running with -p no:cacheprovider fixes it.",
      ),
    ]);
  } catch (e) {
    fail(`addMessages failed: ${py_err(e)}`);
  }
  console.log(`ok (session ${sid})`);

  // 3. deriver drain
  step(3, "wait for derivation (<=120s)");
  const drained = await wait_for_derivation(h, 120);
  console.log(drained ? "ok" : "TIMEOUT (deriver worker running? python -m src.deriver)");

  // 4. representation read (no LLM)
  step(4, "peer.representation");
  let rep: any;
  try {
    rep = await probe_user.representation();
  } catch (e) {
    fail(`representation failed: ${py_err(e)}`);
  }
  if (!rep || !String(rep).trim()) {
    fail("empty representation — deriver likely not running or has no LLM keys");
  }
  console.log(`ok (${String(rep).length} chars)`);

  // 5. semantic search
  step(5, "peer.search");
  let results: any[];
  try {
    results = Array.from((await probe_user.search("commit message style", { limit: 3 })) ?? []);
  } catch (e) {
    results = fail(`search failed: ${py_err(e)}`);
  }
  console.log(`ok (${results!.length} results)`);

  // 6. dialectic grounding — seeded technique must surface in chat
  step(6, "peer.chat grounding check");
  let answer: any;
  try {
    answer = (await probe_agent.chat("How should pytest-xdist be run in project smoke-repo?", {
      reasoningLevel: "low",
    })) || "";
  } catch (e) {
    fail(`chat failed: ${py_err(e)}`);
  }
  if (!String(answer).includes("cacheprovider")) {
    fail(`seeded observation did not surface in chat. Got: ${py_cut(String(answer), 300)}`);
  }
  console.log("ok");

  console.log(
    `\nsmoke PASSED — profile_id=${state.profile_id}, smoke peers left in workspace (namespaced 'smoke-')`,
  );
}

// ---------------------------------------------------------------- other commands

export async function cmd_observe(args: Record<string, any>): Promise<void> {
  const state = load_state();
  const obs: Record<string, any> = {
    type: args.type,
    target: args.target,
    content: args.content,
    explicit: true,
  };
  if (args.target.startsWith("skill:")) {
    obs.skill = args.target.slice(args.target.indexOf(":") + 1);
    obs.type = obs.type || "skill-usage";
  }
  const cfg = load_config();
  if (cfg.mode === "local") {
    journal_append({
      session_id: args.session || `manual-${Math.floor(Date.now() / 1000)}`,
      ts: now_iso(),
      observations: [obs],
    });
    console.log("journaled 1 observation (local mode)");
    return;
  }
  const h = await client(cfg);
  const n = await add_observations(
    h,
    state,
    args.session || `manual-${Math.floor(Date.now() / 1000)}`,
    [obs],
  );
  console.log(`wrote ${n} observation(s)`);
}

export async function cmd_query(args: Record<string, any>): Promise<void> {
  const state = load_state();
  const cfg = load_config();
  if (cfg.mode === "local") {
    if (args.what === "rep" || args.what === "card") {
      console.log(local_representation(args.q) || "(nothing learned yet)");
    } else if (args.what === "search") {
      const hits = journal_entries()
        .filter((e) => (e.content ?? "").toLowerCase().includes(args.q.toLowerCase()))
        .map((e) => e.content);
      for (const h of hits.slice(-(args.max || 5))) {
        console.log(`- ${h}`);
      }
    } else {
      sys_exit(
        "chat needs a Honcho deriver — local mode has none; " +
          "use `query rep` / `query search`, or /evolve-review for synthesis",
      );
    }
    return;
  }
  const h = await client(cfg);
  const me = await h.peer(
    args.perspective ? to_peer_id(args.perspective) : user_peer_id(state),
  );
  const target = args.target ? to_peer_id(args.target) : args.target;
  if (args.what === "card") {
    const cardFn = me.getCard ?? me.card; // TS SDK documents getCard()
    const card = target ? await cardFn.call(me, { target }) : await cardFn.call(me);
    console.log(card && card.length ? card.join("\n") : "(no card yet)");
  } else if (args.what === "rep") {
    // the SDK's zod schema rejects explicit nulls — only include set options
    const opts: Record<string, any> = {};
    if (target) opts.target = target;
    if (args.q) opts.searchQuery = args.q;
    if (args.max) opts.searchTopK = args.max;
    console.log((await me.representation(opts)) || "(empty)");
  } else if (args.what === "search") {
    for (const r of (await me.search(args.q, { limit: args.max || 5 })) ?? []) {
      console.log(`- ${r}`);
    }
  } else if (args.what === "chat") {
    const chat_opts: Record<string, any> = { reasoningLevel: args.level || "low" };
    if (target) chat_opts.target = target;
    console.log(await me.chat(args.q, chat_opts));
  }
}

export async function cmd_status(_args: Record<string, any>): Promise<void> {
  const cfg = load_config();
  const state = load_state();
  console.log(
    `config source : ${cfg.source}  (${
      cfg.source === "file" ? CONFIG_PATH : cfg.source === "env" ? "env vars" : "unconfigured — suite inert"
    })`,
  );
  console.log(`mode          : ${cfg.mode}`);
  console.log(`state dir     : ${DATA_DIR}`);
  if (cfg.mode !== "off" && guardrails.looks_like_sandbox(DATA_DIR)) {
    console.log(
      "  ⚠ WARNING: state dir looks like a leaked eval/sandbox path. If you " +
        "didn't mean to run here, unset XDG_DATA_HOME/XDG_CONFIG_HOME/EVOLVE_MODE " +
        "and relaunch — otherwise fixture data pollutes real memory.",
    );
  }
  if (cfg.mode === "local") {
    const n_concl = fs.existsSync(CONCLUSIONS_PATH)
      ? py_splitlines(fs.readFileSync(CONCLUSIONS_PATH, "utf8")).filter((ln) =>
          ln.startsWith("- "),
        ).length
      : 0;
    console.log(`journal       : ${journal_entries().length} observation(s)`);
    console.log(
      `conclusions   : ${n_concl} (derived by /evolve-review — run it to distill the journal)`,
    );
  } else {
    console.log(
      `url           : ${cfg.url || (cfg.api_key ? "api.honcho.dev (managed)" : "-")}`,
    );
    console.log(`workspace     : ${cfg.workspace}`);
  }
  if (cfg.mode !== "off") {
    // journal is mirrored in both modes, so is quarantine
    const n_quar = quarantined_observations().length;
    if (n_quar) {
      console.log(
        `quarantined   : ${n_quar} observation(s) held (poisoning guardrail, ` +
          `${cfg.mode} mode) — run /evolve-review to triage`,
      );
    }
  }
  console.log(`profile id    : ${state.profile_id}`);
  const spool = fs.existsSync(SPOOL_DIR)
    ? fs.readdirSync(SPOOL_DIR).filter((f) => f.endsWith(".json"))
    : [];
  const pending = fs.existsSync(PENDING_DIR)
    ? fs.readdirSync(PENDING_DIR).filter((f) => f.endsWith(".json"))
    : [];
  console.log(`spool depth   : ${spool.length}`);
  console.log(`pending       : ${pending.length} proposal(s)`);
  if (fs.existsSync(INJECTION_PATH)) {
    const age = Date.now() / 1000 - fs.statSync(INJECTION_PATH).mtimeMs / 1000;
    console.log(`cache age     : ${Math.floor(age / 60)} min (${INJECTION_PATH})`);
  } else {
    console.log("cache age     : no injection cache yet");
  }
  if (cfg.mode === "honcho") {
    try {
      const h = await client(cfg);
      const queue_fn = h.queueStatus ?? h.queue_status; // same fallback as wait_for_derivation
      if (!queue_fn) throw new Error("SDK exposes no queue-status method");
      const qs = await queue_fn.call(h);
      // the SDK returns {pending,inProgress,completed,total}WorkUnits (camel);
      // the self-hosted deriver may also use snake — read either spelling
      const pending = qs.pendingWorkUnits ?? qs.pending_work_units ?? 0;
      const inProgress = qs.inProgressWorkUnits ?? qs.in_progress_work_units ?? 0;
      console.log(`deriver queue : ${pending} pending, ${inProgress} in-progress`);
    } catch (e) {
      if (e instanceof SystemExit) throw e; // SDK missing exits 2, like Python's SystemExit
      console.log(`deriver queue : unreachable (${py_err(e)})`);
    }
  }
}

/* Ask one question with the typed answer hidden (secret entry). One readline
interface owns stdin for the whole flow — mixing a second stdin reader loses
buffered input on piped stdin. On a TTY the keystroke echo is muted (fully
hidden); on a non-TTY (piped input, tests) there is no echo to mute and the
line is read normally, so automation still works. Node stdlib only. */
async function ask_masked(rl: any, query: string): Promise<string> {
  // rl._writeToOutput is an UNDOCUMENTED readline internal — the least-bad
  // way to suppress echo. If a Node upgrade removes it, fail LOUD (tell the
  // user their input will be visible) rather than silently echoing a secret.
  if (typeof rl._writeToOutput !== "function") {
    process.stdout.write(
      "(warning: this Node build cannot mask input — the key WILL be visible)\n",
    );
    return rl.question(query);
  }
  const answer = rl.question(query); // prompt is emitted before we mute echo
  const orig = rl._writeToOutput?.bind(rl);
  rl._writeToOutput = (s: string): void => {
    // suppress keystroke/refresh echo; let the terminating newline through
    if (s.includes("\n")) rl.output.write("\n");
  };
  try {
    return await answer;
  } finally {
    rl._writeToOutput = orig;
  }
}

/* Interactive onboarding: prompt for the endpoint + key + workspace and write
the same config `cmd_init` would. Blank endpoint chooses local mode. The key
is read masked (see ask_masked) so it never appears on screen, and it lands
only in the 0600 config file — never a flag, an env dump, or shell history.
Guarded to a TTY / piped stdin; the flag form (init --url --api-key) remains
for non-interactive callers. */
export async function cmd_init_interactive(): Promise<void> {
  console.log(
    "evolve onboarding — connect this machine to a Honcho memory server.\n" +
      "Leave the endpoint blank to use local mode (no server, no key).\n",
  );
  let url: string;
  let workspace = "huhhb-evolve";
  let api_key = "";
  if (process.stdin.isTTY) {
    // human at a terminal: readline for the visible fields, masked key entry
    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    try {
      url = (await rl.question("Honcho endpoint URL: ")).trim();
      if (!url) {
        cmd_init({ local: true });
        return;
      }
      workspace = (await rl.question("Workspace [huhhb-evolve]: ")).trim() || "huhhb-evolve";
      api_key = (await ask_masked(rl, "Honcho API key (JWT) — input hidden: ")).trim();
    } finally {
      rl.close();
    }
  } else {
    // piped/automation (and the test suite): read the whole stream once and
    // take answers positionally — url, workspace, key. No TTY, no masking.
    const lines = fs.readFileSync(0, "utf8").split("\n");
    url = (lines[0] ?? "").trim();
    if (!url) {
      cmd_init({ local: true });
      return;
    }
    workspace = (lines[1] ?? "").trim() || "huhhb-evolve";
    api_key = (lines[2] ?? "").trim();
  }
  if (!api_key) {
    sys_exit("no API key entered — re-run `init` (or use --local for no server)");
  }
  cmd_init({ url, api_key, workspace });
  // connectivity check (non-fatal): confirm the endpoint answers
  try {
    const res = await fetch(url.replace(/\/+$/, "") + "/health", {
      signal: AbortSignal.timeout(10_000),
    });
    console.log(
      res.ok
        ? `endpoint reachable (/health ${res.status}) — run \`honcho_client.ts smoke\` to verify auth`
        : `warning: /health returned ${res.status} — config saved; check the endpoint, then run smoke`,
    );
  } catch (e) {
    console.log(
      `warning: could not reach ${url}/health (${py_err(e)}) — config saved anyway; ` +
        "verify connectivity, then run smoke",
    );
  }
}

export function cmd_init(args: Record<string, any>): void {
  if (args.local && (args.url || args.api_key)) {
    sys_exit("--local excludes --url/--api-key: local mode means no server");
  }
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const cfg: Record<string, any> = {};
  if (args.local) cfg.mode = "local";
  if (args.url) cfg.url = args.url;
  if (args.api_key) cfg.api_key = args.api_key;
  cfg.workspace = args.workspace || "huhhb-evolve";
  fs.writeFileSync(CONFIG_PATH, py_json_dumps(cfg, { indent: 2 }) + "\n");
  fs.chmodSync(CONFIG_PATH, 0o600);
  if (args.local) {
    console.log(
      `wrote ${CONFIG_PATH} — local mode active; no server, no smoke test needed. ` +
        "The loop starts capturing immediately; /evolve-review derives conclusions.",
    );
  } else {
    console.log(`wrote ${CONFIG_PATH} — run \`honcho_client.ts smoke\` to verify`);
  }
}

export function now_iso(): string {
  return new Date().toISOString().slice(0, 19) + "Z";
}

export async function main(): Promise<void> {
  const prog = path.basename(process.argv[1] || "honcho_client.ts");
  const args = parse_cli(
    prog,
    __doc__,
    {
      smoke: [],
      observe: [
        {
          flag: "--type",
          def: "preference",
          choices: ["preference", "skill-usage", "technique", "correction", "environment", "strategic"],
        },
        { flag: "--target", def: "user" },
        { flag: "--content", required: true },
        { flag: "--session" },
      ],
      query: [
        { flag: "what", positional: true, choices: ["card", "rep", "search", "chat"] },
        { flag: "--q", def: "" },
        { flag: "--target" },
        { flag: "--perspective" },
        { flag: "--level", choices: ["minimal", "low", "medium", "high", "max"] },
        { flag: "--max", type: "int" },
      ],
      status: [],
      init: [
        { flag: "--url" },
        { flag: "--api-key", dest: "api_key" },
        { flag: "--workspace" },
        // no-server mode: journal + review-derived conclusions only
        { flag: "--local", store_true: true },
        // guided prompt for endpoint + key (key entry masked); default when
        // `init` is run bare on a terminal
        { flag: "--interactive", store_true: true },
      ],
    },
    process.argv.slice(2),
  );
  // `init` with no connection flags → guided onboarding (explicit --interactive,
  // or a bare `init` on a terminal). The flag form stays fully non-interactive
  // for agents/CI, and a bare `init` with no TTY falls through to cmd_init.
  if (
    args.cmd === "init" &&
    !args.url &&
    !args.api_key &&
    !args.local &&
    (args.interactive || process.stdin.isTTY)
  ) {
    await cmd_init_interactive();
    return;
  }
  const dispatch: Record<string, (a: Record<string, any>) => unknown> = {
    smoke: cmd_smoke,
    observe: cmd_observe,
    query: cmd_query,
    status: cmd_status,
    init: cmd_init,
  };
  await dispatch[args.cmd](args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run_main(main);
}
