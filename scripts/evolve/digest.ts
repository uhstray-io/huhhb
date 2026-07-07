#!/usr/bin/env node
// huhhb evolve — transcript digester (Stop-hook payload on stdin). (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

import * as guardrails from "./guardrails.ts";
import {
  SPOOL_DIR,
  configured,
  ensure_dirs,
  load_state,
  now_iso,
  save_state,
  state_lock,
  py_json_dumps,
  py_splitlines,
  py_cut,
  sys_exit,
  run_main,
} from "./honcho_client.ts";

const __doc__ = `huhhb evolve — transcript digester (Stop-hook payload on stdin).

Reads the Claude Code hook JSON {session_id, transcript_path, cwd}, parses
the session transcript (.jsonl), and spools typed observations for flush.ts.
Stdlib only — must run even where honcho-ai is not installed.

Capture doctrine (Law 1: purity beats volume). Emission is gated by explicit
detectors — nothing is captured unless a pattern votes for it:

  [preference]  "always use X", "never Y", "from now on", explicit "remember"
  [correction]  imperative repair of agent behavior ("stop explaining...",
                "don't add...", "that's not what I asked")
  [skill-usage] a huhhb skill was invoked; outcome=partial if a correction
                followed within 3 user turns, else outcome=used
  [environment] a missing-command failure THAT WAS FIXED in-session, phrased
                as the fix (never as the failure)

Anti-capture filter (non-negotiable, enforced here at write time):
  - no negative capability claims ("X is broken", "cannot use Y")
  - no environment failures without their fix
  - no transient errors that resolved in-session
  - no one-off task narratives (nothing is emitted without a detector vote)

Sanitization: system-reminder blocks and harness-injected command wrappers are
stripped BEFORE detection (store what the user asked, not what the harness
injected); secret-looking values are redacted.

A per-session cursor (state.json) makes repeated Stop firings incremental —
each digest run only sees transcript lines it has not processed before.`;

export const SNIPPET_MAX = 200;
export const CORRECTION_WINDOW = 3; // user turns after a skill invocation that still implicate it

// Sanitizer -------------------------------------------------------------
// Harness-injected content is never user speech. Tag-closed blocks are
// stripped in place (verified in the wild: a <task-notification> block was
// captured as a [correction] before this list included it); wrapper markers
// cause the whole message to be skipped (slash-command scaffolding).
// Known limitation: a session that WRITES test fixtures (e.g. a heredoc
// containing 'command not found: x' followed by an install command) is
// indistinguishable from a real failure+fix and will be captured — dev
// sessions on this repo itself are pathological input.
export const HARNESS_BLOCK = new RegExp(
  "<(system-reminder|task-notification|local-command-caveat|command-name" +
    "|command-message|command-args|local-command-stdout|ci-monitor-event)>[\\s\\S]*?</\\1>",
  "g",
);
// a message that STARTS as harness output is wholly harness-authored;
// a marker merely embedded in user text gets its block stripped instead
export const HARNESS_PREFIXES: readonly string[] = [
  "<command-name>",
  "<local-command-stdout>",
  "<command-message>",
  "<command-args>",
  "<task-notification>",
  "<local-command-caveat>",
  "<ci-monitor-event>",
  "[SYSTEM NOTIFICATION",
  // compaction summaries are harness-authored user-role turns;
  // they quote past corrections, which re-captures them as new
  // (found by backfill dogfooding — old transcripts are full of them)
  "This session is being continued from a previous conversation",
];
export const SECRET = new RegExp(
  "(sk-[A-Za-z0-9_\\-]{10,}" +
    "|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}" +
    "|AKIA[0-9A-Z]{16}" +
    "|xox[baprs]-[A-Za-z0-9\\-]{10,}" +
    "|(?:api[_-]?key|token|secret|password)\\s*[=:]\\s*\\S{8,})",
  "gi",
);

// Detectors -------------------------------------------------------------
// Deliberately narrow: a missed preference costs one session; a poisoned
// observation costs months (Hermes). Tighten, never loosen, without evidence.
export const REMEMBER = /\bremember (?:this|that)\b/i;
export const PREFERENCE = /\b(?:always use|never use|i prefer|from now on|going forward, use)\b/i;
// per-verb gerund forms: e-dropping verbs (use->using) can't be matched by a
// bare (?:ing)? suffix, so each verb lists its real inflections
export const CORRECTION = new RegExp(
  "(?:\\b(?:don'?t|do not|stop|never|quit) " +
    "(?:do(?:ing)?|us(?:e|ing)|add(?:ing)?|writ(?:e|ing)|explain(?:ing)?" +
    "|includ(?:e|ing)|putt?(?:ing)?|mak(?:e|ing)|creat(?:e|ing)" +
    "|mention(?:ing)?|say(?:ing)?)\\b" +
    "|\\bnot what i asked\\b|\\bi asked for\\b|\\byou always\\b|^actually[ ,])",
  "i",
);
// zsh: "zsh: command not found: foo" / bash: "bash: foo: command not found"
// the lookahead keeps the shell's own name from being captured as the command
export const CMD_NOT_FOUND = new RegExp(
  "(?:command not found:\\s*([\\w.-]+)" +
    "|\\b(?!(?:zsh|bash|sh|dash|fish)\\b)([\\w.-]+):\\s*command not found" +
    "|\\bsh:\\s*(?:\\d+:\\s*)?([\\w.-]+):\\s*not found)",
);
export const INSTALL_CMD = new RegExp(
  "\\b(?:brew|apt|apt-get|dnf|yum|pacman|pip3?|uv|npm|pnpm|yarn|cargo|go|gem)\\b" +
    "[^\\n;|&]*\\b(?:install|add|tool install|i)\\b",
  "i",
);

// Detection view — what the detectors are allowed to see. Pasted documents
// quote example phrases ("stop explaining before the diff", 'an explicit
// "remember this"') that must not masquerade as live user signal, so before
// detection we drop fenced/inline code, double-quoted spans, blockquote lines,
// and bracket-tagged observation examples. Snippets still come from the
// original text — this view exists only to decide WHETHER something fired.
export const FENCED_CODE = /```[\s\S]*?```/g;
export const INLINE_CODE = /`[^`\n]*`/g;
export const QUOTED_SPAN = /"[^"\n]{0,300}"|“[^”\n]{0,300}”/g;
export const EXAMPLE_LINE = /^\s*(?:>|\[[a-zA-Z-]+\])/; // used with .match() -> anchored

// Anti-capture gate — applied to every observation before spooling.
export const NEGATIVE_CAPABILITY = new RegExp(
  "(is broken|can'?t use|cannot use|doesn'?t work|does not work" +
    "|command not found|is unavailable|never works|failed to|is impossible)",
  "i",
);
export const FIX_PHRASED = new RegExp(
  "(fixed by|installed|resolved by|works after|instead use|use .{1,60} instead|workaround)",
  "i",
);

export function redact_secrets(text: string): string {
  return text.replace(SECRET, "[redacted]").trim();
}

/* Harness content is never user speech — one concept, one owner.
Messages that BEGIN as harness output (slash-command scaffolding, system
notifications) are skipped outright (None); tag-closed blocks embedded
inside genuine user text are stripped in place, preserving the user's own
words around them. New harness formats get added HERE, nowhere else. */
export function harness_filter(text: string): string | null {
  const stripped = text.replace(/^\s+/, "");
  if (HARNESS_PREFIXES.some((p) => stripped.startsWith(p))) {
    return null;
  }
  return text.replace(HARNESS_BLOCK, "");
}

export function snippet(text: string, limit = SNIPPET_MAX): string {
  text = text.split(/\s+/).filter((x) => x !== "").join(" ");
  return Array.from(text).length <= limit ? text : py_cut(text, limit - 1) + "…";
}

export function detection_view(text: string): string {
  text = text.replace(FENCED_CODE, " ");
  text = text.replace(INLINE_CODE, " ");
  text = text.replace(QUOTED_SPAN, " ");
  return py_splitlines(text)
    .filter((line) => !EXAMPLE_LINE.test(line))
    .join("\n");
}

function _text_blocks(content: unknown): string[] {
  if (typeof content === "string") {
    return [content];
  }
  const out: string[] = [];
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && (block as any).type === "text") {
        out.push((block as any).text ?? "");
      }
    }
  }
  return out;
}

export type Event = [string, string];

export function* iter_events(lines: string[]): Generator<Event> {
  for (const line of lines) {
    let rec: any;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec === null || typeof rec !== "object") continue;
    const msg = rec.message || {};
    const content = msg.content;
    if (rec.type === "user" && !rec.isMeta) {
      for (let text of _text_blocks(content)) {
        const filtered = harness_filter(text);
        if (filtered === null) {
          continue; // harness-injected, not the user speaking
        }
        const redacted = redact_secrets(filtered);
        if (redacted) {
          yield ["user_text", redacted];
        }
      }
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block && typeof block === "object" && block.type === "tool_result") {
            for (const text of _text_blocks(block.content)) {
              yield ["tool_result", text];
            }
          }
        }
      }
    } else if (rec.type === "assistant" && Array.isArray(content)) {
      for (const block of content) {
        if (!(block && typeof block === "object" && block.type === "tool_use")) {
          continue;
        }
        const name = block.name ?? "";
        const inp = block.input || {};
        if (name === "Skill" && inp.skill) {
          yield ["skill_use", inp.skill];
        } else if (name === "Bash" && inp.command) {
          yield ["bash_cmd", inp.command];
        }
      }
    }
  }
}

export function detect(events: Iterable<Event>): Record<string, any>[] {
  const observations: Record<string, any>[] = [];
  const seen = new Set<string>();
  let skills_pending = new Map<string, number>(); // skill -> user turns remaining in correction window
  const skills_used: string[] = [];
  const missing_cmds = new Map<string, boolean>(); // cmd -> True until an install fix is seen

  const emit = (obs: Record<string, any>): void => {
    const key = JSON.stringify([obs.type, obs.skill ?? null, obs.content]);
    if (!seen.has(key)) {
      seen.add(key);
      observations.push(obs);
    }
  };

  for (const [kind, payload] of events) {
    if (kind === "skill_use") {
      if (!skills_used.includes(payload)) {
        skills_used.push(payload);
      }
      skills_pending.set(payload, CORRECTION_WINDOW);
    } else if (kind === "tool_result") {
      const m = CMD_NOT_FOUND.exec(payload);
      if (m) {
        const g = m.slice(1).find((x) => x);
        if (g !== undefined) missing_cmds.set(g, true);
      }
    } else if (kind === "bash_cmd") {
      if (INSTALL_CMD.test(payload)) {
        for (const cmd of [...missing_cmds.keys()].filter((c) => payload.includes(c))) {
          // redact: install commands can carry inline credentials
          // (--index-url https://user:token@...) and this observation
          // leaves the machine when a remote Honcho is configured
          emit({
            type: "environment",
            target: "agent",
            content:
              `[environment] os=${platform_system_lower()} — ` +
              `'${cmd}' was missing; fixed by \`${snippet(redact_secrets(payload), 120)}\`.`,
          });
          missing_cmds.delete(cmd);
        }
      }
    } else if (kind === "user_text") {
      const view = detection_view(payload);
      const corrected = CORRECTION.test(view);
      const explicit = REMEMBER.test(view);
      if (explicit || PREFERENCE.test(view)) {
        emit({
          type: "preference",
          target: "user",
          explicit: Boolean(explicit),
          content: `[preference] user — stated: "${snippet(payload)}"`,
        });
      } else if (corrected) {
        emit({
          type: "correction",
          target: "user",
          content: `[correction] user — corrected agent behavior: "${snippet(payload)}"`,
        });
        for (const [skill, n] of [...skills_pending.entries()].filter(([, n]) => n > 0)) {
          emit({
            type: "skill-usage",
            skill: skill,
            outcome: "partial",
            target: "skill",
            content:
              `[skill-usage] skill=${skill} outcome=partial — ` +
              `user correction followed: "${snippet(payload, 120)}"`,
          });
          skills_pending.set(skill, 0);
        }
      }
      const next = new Map<string, number>();
      for (const [s, n] of skills_pending.entries()) {
        if (n > 0) next.set(s, n - 1);
      }
      skills_pending = next;
    }
  }

  for (const skill of skills_used) {
    if (!observations.some((o) => o.skill === skill)) {
      emit({
        type: "skill-usage",
        skill: skill,
        outcome: "used",
        target: "skill",
        content: `[skill-usage] skill=${skill} outcome=used — invoked this session.`,
      });
    }
  }
  // unresolved missing commands emit NOTHING: a failure without its fix is
  // exactly the grudge the anti-capture list exists to keep out of memory
  return observations;
}

/* platform.system().lower() parity. On darwin Python returns "darwin"; on
Linux "linux"; on Windows "windows". os.platform() maps win32->windows. */
function platform_system_lower(): string {
  const p = os.platform();
  if (p === "win32") return "windows";
  return p;
}

export function anti_capture(observations: Record<string, any>[]): Record<string, any>[] {
  return observations.filter(
    (o) => !NEGATIVE_CAPABILITY.test(o.content) || FIX_PHRASED.test(o.content),
  );
}

export function digest(session_id: string, transcript_path: string, cwd: string): number {
  return state_lock(() => _digest_locked(session_id, transcript_path, cwd));
}

/* Read the unprocessed tail from `cursor`, return [observations, new_cursor]
or [null, cursor] if nothing/unreadable. Shared by live digest and
backfill's dry-run so the tail-read and rotated-cursor guard live once. */
export function _read_new_observations(
  session_id: string,
  transcript_path: string,
  cursor: number,
): [Record<string, any>[] | null, number] {
  // byte-offset cursor: Stop fires after every turn, so only ever read the
  // tail — a whole-file read here is O(n^2) I/O over a session's lifetime
  let chunk: Buffer;
  let new_cursor: number;
  let fd: number;
  try {
    fd = fs.openSync(transcript_path, "r");
  } catch {
    return [null, cursor];
  }
  try {
    const size = fs.fstatSync(fd).size;
    if (cursor > size) {
      cursor = 0; // transcript rotated/rewritten — start over
    }
    const len = Math.max(0, size - cursor);
    chunk = Buffer.alloc(len);
    let read = 0;
    let pos = cursor;
    while (read < len) {
      const n = fs.readSync(fd, chunk, read, len - read, pos);
      if (n <= 0) break;
      read += n;
      pos += n;
    }
    if (read < len) chunk = chunk.subarray(0, read);
    new_cursor = cursor + chunk.length;
  } catch {
    return [null, cursor];
  } finally {
    try {
      fs.closeSync(fd);
    } catch {}
  }
  if (!chunk.length) {
    return [null, cursor];
  }
  const lines = py_splitlines(chunk.toString("utf-8")); // Buffer decode replaces invalid bytes
  const observations = anti_capture(detect(iter_events(lines)));
  for (const obs of observations) {
    // GR1: tag signal strength for recall + review
    obs.trust = guardrails.assess_trust(obs);
  }
  return [observations, new_cursor];
}

function _digest_locked(session_id: string, transcript_path: string, cwd: string): number {
  const state = load_state();
  const [observations, new_cursor] = _read_new_observations(
    session_id,
    transcript_path,
    session_id in state.cursors ? state.cursors[session_id] : 0,
  );
  if (observations === null) {
    return 0;
  }
  state.cursors[session_id] = new_cursor;
  // track skills for injection prefetch even when nothing else is captured
  const seen_skills = new Set<string>();
  for (const o of observations) {
    if (o.skill) seen_skills.add(o.skill);
  }
  if (seen_skills.size) {
    const recent = state.recent_skills.filter((s: string) => !seen_skills.has(s));
    state.recent_skills = [...Array.from(seen_skills).sort(), ...recent].slice(0, 10);
  }
  save_state(state);
  if (!observations.length) {
    return 0;
  }
  ensure_dirs();
  // time.time_ns() parity: nanoseconds since the Unix epoch (uniqueness key).
  const ns = BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n);
  // session_id arrives from the hook payload / transcript stem — normalize it
  // to a safe filename so a crafted id ("../x") can never escape SPOOL_DIR
  const safe_sid = session_id.replace(/[^A-Za-z0-9._-]/g, "_");
  const spool_file = path.join(SPOOL_DIR, `${safe_sid}-${ns}.json`);
  fs.writeFileSync(
    spool_file,
    py_json_dumps(
      {
        session_id: session_id,
        cwd: cwd,
        repo: cwd ? path.basename(cwd) : "unknown",
        ts: now_iso(),
        observations: observations,
      },
      { indent: 2 },
    ),
  );
  return observations.length;
}

export const TRANSCRIPTS_ROOT =
  process.env.EVOLVE_TRANSCRIPTS_DIR || path.join(os.homedir(), ".claude", "projects");

/* Claude Code encodes the cwd as a dash-sanitized dir name; the last
path-ish segment is a good-enough repo slug for the observation record. */
export function _decode_project_cwd(project_dir_name: string): string {
  const idx = project_dir_name.lastIndexOf("-");
  const tail = idx === -1 ? project_dir_name : project_dir_name.slice(idx + 1);
  return tail || "unknown";
}

/* glob "*\/*.jsonl" under TRANSCRIPTS_ROOT: one directory level then a
.jsonl file. Returns absolute paths. */
function _glob_transcripts(): string[] {
  const out: string[] = [];
  let dirs: string[];
  try {
    dirs = fs.readdirSync(TRANSCRIPTS_ROOT);
  } catch {
    return out;
  }
  for (const d of dirs) {
    const sub = path.join(TRANSCRIPTS_ROOT, d);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(sub);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    let files: string[];
    try {
      files = fs.readdirSync(sub);
    } catch {
      continue;
    }
    for (const f of files) {
      if (f.endsWith(".jsonl")) out.push(path.join(sub, f));
    }
  }
  return out;
}

function _mtime(p: string): number {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

/* Mine historical ~/.claude/projects/*\/*.jsonl transcripts through the
SAME capture pipeline as live sessions — redaction, harness-block
stripping, anti-capture, trust tagging, and (at flush) GR2 volume
quarantine all apply. Idempotent via the per-session byte cursor:
re-running skips transcripts already processed (live or backfilled). */
export function backfill(limit: number | null = null, dry_run = false): void {
  if (!fs.existsSync(TRANSCRIPTS_ROOT)) {
    console.log(`no transcripts at ${TRANSCRIPTS_ROOT}`);
    return;
  }
  let transcripts = _glob_transcripts();
  // sorted by mtime, reverse=True; Python sorted() is stable — preserve glob
  // order for equal mtimes. Node sort() is stable since V8 7.0.
  transcripts = transcripts
    .map((p, i) => ({ p, i, m: _mtime(p) }))
    .sort((a, b) => (b.m - a.m) || (a.i - b.i))
    .map((x) => x.p);
  if (limit !== null) {
    // limit=0 means "none", not "unlimited"
    transcripts = transcripts.slice(0, limit);
  }
  let sessions = 0;
  let total = 0;
  const cursors: Record<string, any> | null = dry_run ? load_state().cursors : null; // read once, not per-transcript
  for (const t of transcripts) {
    const stem = path.basename(t, ".jsonl");
    const cwd = _decode_project_cwd(path.basename(path.dirname(t)));
    let n: number;
    if (dry_run) {
      const [obs] = _read_new_observations(stem, t, stem in cursors! ? cursors![stem] : 0);
      n = obs ? obs.length : 0;
    } else {
      n = digest(stem, t, cwd);
    }
    if (n) {
      sessions += 1;
      total += n;
    }
  }
  const verb = dry_run ? "would capture" : "spooled";
  console.log(
    `backfill: ${transcripts.length} transcript(s) scanned, ${verb} ` +
      `${total} observation(s) from ${sessions} session(s)`,
  );
  if (!dry_run && total) {
    // drain spool -> journal (+ GR2 screening) via the normal flusher.
    // spawn the flusher as `node <dir>/flush.ts` (execPath + sibling path);
    // fileURLPath() IS this module's directory — do not dirname it again
    const flush_path = path.join(fileURLPath(), "flush.ts");
    const result = spawnSync(process.execPath, [flush_path], { stdio: "inherit" });
    if (result.status === 0) {
      console.log(
        "flushed to journal — run /evolve-status to see counts and any " +
          "quarantined batches, then /evolve-review to distill.",
      );
    } else {
      process.stderr.write(
        `backfill spooled ${total} observation(s) but the flush step ` +
          `failed (exit ${result.status}) — the spool is intact; ` +
          "re-run flush.ts or check /evolve-status.\n",
      );
    }
  }
}

/* Directory of this module (Path(__file__).resolve().parent parity). */
function fileURLPath(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--backfill")) {
    if (!configured()) {
      sys_exit(
        "evolve is not configured — nothing to backfill into. " +
          "See docs/evolve-plan.md (init --local, or HONCHO_URL/API_KEY).",
      );
    }
    const args = argv.slice(argv.indexOf("--backfill") + 1);
    let limit: number | null = null;
    for (const a of args) {
      if (a.startsWith("--limit=")) {
        const raw = a.slice(a.indexOf("=") + 1);
        // str.isdigit(): non-empty, all decimal digits (no sign, no whitespace)
        if (!/^\d+$/.test(raw) || parseInt(raw, 10) < 1) {
          sys_exit(`--limit must be a positive integer (got ${py_repr(raw)})`);
        }
        limit = parseInt(raw, 10);
      }
    }
    backfill(limit, args.includes("--dry-run"));
    return;
  }
  if (!configured()) {
    return; // the sh guard is a latency fast-path; this is the enforcement
  }
  let payload: any;
  try {
    payload = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return;
  }
  const session_id = payload.session_id;
  const transcript = payload.transcript_path;
  if (!session_id || !transcript || !fs.existsSync(transcript)) {
    return;
  }
  const n = digest(session_id, transcript, payload.cwd ?? "");
  if (n) {
    console.log(`spooled ${n} observation(s)`);
  }
}

/* Python repr() of a string for the --limit error message: single-quoted. */
function py_repr(s: string): string {
  if (s.includes("'") && !s.includes('"')) {
    return '"' + s + '"';
  }
  return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run_main(main);
}
