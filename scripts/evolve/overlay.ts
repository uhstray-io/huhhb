#!/usr/bin/env node
// huhhb evolve — overlay skill manager. (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import * as guardrails from "./guardrails.ts";
import {
  PENDING_DIR,
  ensure_dirs,
  journal_entries,
  now_iso,
  sys_exit,
  py_json_dumps,
  py_float_str,
  parse_cli,
  run_main,
  type CliOpt,
} from "./honcho_client.ts";

const __doc__ = `huhhb evolve — overlay skill manager.

Overlays are user-scope skills at ~/.claude/skills/<name>-local/ that carry
per-user learned procedure. Hub-installed huhhb skills are NEVER edited
(D7): personalization lands here, so \`claude plugin update\` stays clean and
the learned layer is portable and inspectable.

Subcommands:
  scaffold NAME --description ... [--body ...] [--pinned]
  patch    NAME --file NEW_SKILL.md --signal "..." [--sessions a,b]
  record   NAME --outcome {success,failure} [--error "..."]
  set-status NAME {active,deprecated}
  archive  NAME                      move to _archive/ (never delete; pinned exempt)
  report   [--json]                  confidence table for evolve-status
  propose  [--kind ...]              stdin JSON -> pending/ (headless review's
                                     ONLY write path — everything else needs
                                     interactive approval)
  apply-pending FILE                 replay an approved staged proposal

Confidence is earned, never granted: min(runs/10, 1.0) * success_rate.
One green run scores 0.1, not 1.0 — recall surfaces the number so a
low-confidence overlay is verified before it is trusted.`;

export const OVERLAY_ROOT =
  process.env.EVOLVE_OVERLAY_DIR || path.join(os.homedir(), ".claude", "skills");
export const ARCHIVE_ROOT = path.join(OVERLAY_ROOT, "_archive");
export const PROPOSAL_KINDS: readonly string[] = [
  "overlay-create",
  "overlay-patch",
  "repo-memory",
  "observation",
  "archive",
  "repo-promotion",
];

// float fields whose integer-valued numbers must render as "0.0"/"1.0" in JSON
const CONFIDENCE_FLOAT_KEYS = new Set(["confidence"]);

/* GR4: a skill body is an instruction the agent will follow. Refuse to
write one carrying instruction-override / exfiltration patterns, whatever
the source (crafted transcript, bad review, poisoned proposal). */
export function guard_skill_content(name: string, text: string): void {
  const hits = guardrails.scan_skill_content(text);
  if (hits.length) {
    const detail = hits.map(([n, s]) => `${n} (${py_repr(s)})`).join("; ");
    sys_exit(
      `refusing to write '${name}': skill content tripped the poisoning ` +
        `guard — ${detail}. A learned skill must never carry agent-hijacking ` +
        `instructions.`,
    );
  }
}

export function overlay_dir(name: string): string {
  if (!name.endsWith("-local")) {
    sys_exit(
      `overlay names must end in '-local' (got '${name}') — ` +
        "the suffix is what marks the learned layer as yours, not the hub's",
    );
  }
  // re.fullmatch(r"[a-z0-9][a-z0-9-]*", name): whole string must match.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    sys_exit(`invalid overlay name '${name}'`);
  }
  return path.join(OVERLAY_ROOT, name);
}

export function load_meta(name: string): [Record<string, any>, string] {
  const p = path.join(overlay_dir(name), "meta.json");
  if (!fs.existsSync(p)) {
    sys_exit(`no overlay '${name}' (looked in ${path.dirname(p)})`);
  }
  return [JSON.parse(fs.readFileSync(p, "utf-8")), p];
}

export function save_meta(meta: Record<string, any>, p: string): void {
  fs.writeFileSync(p, py_json_dumps(meta, { indent: 2 }) + "\n");
}

export function confidence(meta: Record<string, any>): number {
  const runs = meta.runs ?? 0;
  if (!runs) {
    return 0.0;
  }
  return py_round2((Math.min(runs / 10, 1.0) * (meta.successes ?? 0)) / runs);
}

export function bump_patch(version: string): string {
  const [major, minor, patch] = version.split(".");
  return `${major}.${minor}.${parseInt(patch, 10) + 1}`;
}

export function scaffold_overlay(
  name: string,
  description: string,
  body: string | null = null,
  pinned = false,
  signal: string | null = null,
  sessions: string[] | null = null,
  eval_scenario: unknown = null,
): void {
  const d = overlay_dir(name);
  if (fs.existsSync(d)) {
    sys_exit(
      `overlay '${name}' already exists — patch it instead of duplicating ` +
        "(update-over-duplicate)",
    );
  }
  body = body || "## Learned adjustments\n\n(none yet)\n";
  guard_skill_content(name, `${description}\n${body}`);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(
    path.join(d, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n` +
      `# ${name}\n\n` +
      `Personal overlay learned by huhhb evolve — verify low-confidence guidance ` +
      `(see meta.json) before trusting it.\n\n${body}\n`,
  );
  save_meta(
    {
      version: "0.1.0",
      runs: 0,
      successes: 0,
      last_error: null,
      status: "new",
      pinned: Boolean(pinned),
      provenance: [
        {
          version: "0.1.0",
          sessions: sessions || [],
          signal: signal || "scaffolded",
          ts: now_iso(),
        },
      ],
    },
    path.join(d, "meta.json"),
  );
  if (eval_scenario) {
    // the bundled eval that gates the overlay (no eval, no trust)
    fs.writeFileSync(path.join(d, "bench.json"), py_json_dumps(eval_scenario, { indent: 2 }) + "\n");
  }
  console.log(`scaffolded ${d}`);
}

export function patch_overlay(
  name: string,
  content: string,
  signal: string,
  sessions: string[] | null = null,
): void {
  guard_skill_content(name, content);
  const [meta, meta_path] = load_meta(name);
  meta.version = bump_patch(meta.version);
  meta.provenance.push({
    version: meta.version,
    sessions: sessions || [],
    signal: signal,
    ts: now_iso(),
  });
  fs.writeFileSync(path.join(path.dirname(meta_path), "SKILL.md"), content);
  save_meta(meta, meta_path);
  console.log(`patched ${name} -> v${meta.version}`);
}

export function archive_overlay(name: string): void {
  const [meta, p] = load_meta(name);
  if (meta.pinned) {
    sys_exit(
      `'${name}' is pinned — pinned overlays are never archived or ` +
        "consolidated, only patched",
    );
  }
  fs.mkdirSync(ARCHIVE_ROOT, { recursive: true });
  const dest = path.join(ARCHIVE_ROOT, `${name}-${Math.floor(Date.now() / 1000)}`);
  fs.renameSync(path.dirname(p), dest);
  console.log(`archived to ${dest} (archive-never-delete)`);
}

function _split_sessions(raw: string | null): string[] {
  return raw ? raw.split(",") : [];
}

export function cmd_scaffold(args: Record<string, any>): void {
  scaffold_overlay(
    args.name,
    args.description,
    args.body,
    args.pinned,
    args.signal,
    _split_sessions(args.sessions),
  );
}

export function cmd_patch(args: Record<string, any>): void {
  const content = args.file ? fs.readFileSync(args.file, "utf-8") : fs.readFileSync(0, "utf-8");
  patch_overlay(args.name, content, args.signal, _split_sessions(args.sessions));
}

export function cmd_record(args: Record<string, any>): void {
  const [meta, p] = load_meta(args.name);
  meta.runs = (meta.runs ?? 0) + 1;
  if (args.outcome === "success") {
    meta.successes = (meta.successes ?? 0) + 1;
    meta.last_error = null; // recovered — stop flagging the stale failure
  } else {
    meta.last_error = args.error || "unspecified failure";
  }
  if (meta.status === "new" && meta.successes) {
    meta.status = "validated";
  }
  if (meta.status === "validated" && confidence(meta) >= 0.5) {
    meta.status = "active";
  }
  meta.last_used = now_iso();
  save_meta(meta, p);
  console.log(
    `${args.name}: runs=${meta.runs} confidence=${py_float_str(confidence(meta))} status=${meta.status}`,
  );
}

// R7: the lifecycle is a declared state machine, not a free-text field.
// validated/active are EARNED via record() (successes, confidence >= 0.5) —
// set-status can demote anything and re-promote only a deprecated overlay.
export const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  new: ["deprecated"],
  validated: ["deprecated"],
  active: ["deprecated"],
  deprecated: ["active"],
};

export function cmd_set_status(args: Record<string, any>): void {
  const [meta, p] = load_meta(args.name);
  const from = meta.status ?? "new";
  if (!(VALID_TRANSITIONS[from] ?? []).includes(args.status)) {
    sys_exit(
      `illegal transition ${from} -> ${args.status}: valid from '${from}' is ` +
        `[${(VALID_TRANSITIONS[from] ?? []).join(", ")}] — validated/active are ` +
        "earned through record() outcomes, never set by hand",
    );
  }
  meta.status = args.status;
  save_meta(meta, p);
  console.log(`${args.name}: status=${args.status}`);
}

export function cmd_archive(args: Record<string, any>): void {
  archive_overlay(args.name);
}

export function cmd_report(args: Record<string, any>): void {
  const rows: Record<string, any>[] = [];
  if (fs.existsSync(OVERLAY_ROOT)) {
    for (const meta_path of _glob_meta()) {
      let meta: Record<string, any>;
      try {
        meta = JSON.parse(fs.readFileSync(meta_path, "utf-8"));
      } catch {
        continue;
      }
      rows.push({
        name: path.basename(path.dirname(meta_path)),
        version: meta.version ?? "?",
        status: meta.status ?? "?",
        confidence: confidence(meta),
        runs: meta.runs ?? 0,
        pinned: meta.pinned ?? false,
        last_error: meta.last_error ?? null,
        last_used: meta.last_used ?? null,
      });
    }
  }
  if (args.json) {
    console.log(py_json_dumps(rows, { indent: 2, float_keys: CONFIDENCE_FLOAT_KEYS }));
    return;
  }
  if (!rows.length) {
    console.log("no overlays yet");
    return;
  }
  console.log(
    `${ljust("overlay", 32)} ${ljust("ver", 8)} ${ljust("status", 11)} ${ljust("conf", 5)} ${ljust("runs", 4)} pinned last_error`,
  );
  for (const r of rows) {
    console.log(
      `${ljust(r.name, 32)} ${ljust(r.version, 8)} ${ljust(r.status, 11)} ${ljust(py_float_str(r.confidence), 5)} ` +
        `${ljust(String(r.runs), 4)} ${ljust(r.pinned ? "yes" : "no ", 5)} ${r.last_error || "-"}`,
    );
  }
}

/* Left-justify to width n (Python str format ':<n' / ':n' for str). No
truncation when the string is already >= n (matches Python). */
function ljust(s: string, n: number): string {
  const len = Array.from(s).length;
  return len >= n ? s : s + " ".repeat(n - len);
}

/* sorted glob of OVERLAY_ROOT/*-local/meta.json, absolute paths. */
function _glob_meta(): string[] {
  let dirs: string[];
  try {
    dirs = fs.readdirSync(OVERLAY_ROOT);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const d of dirs) {
    if (!d.endsWith("-local")) continue;
    const mp = path.join(OVERLAY_ROOT, d, "meta.json");
    if (fs.existsSync(mp)) out.push(mp);
  }
  return out.sort();
}

export function cmd_propose(_args: Record<string, any>): void {
  ensure_dirs();
  const proposal = JSON.parse(fs.readFileSync(0, "utf-8"));
  const kind = proposal.kind;
  if (!PROPOSAL_KINDS.includes(kind)) {
    sys_exit(`proposal kind must be one of ${py_tuple_repr(PROPOSAL_KINDS)}`);
  }
  for (const field of ["summary", "signal"]) {
    if (!proposal[field]) {
      sys_exit(`proposal missing required field '${field}'`);
    }
  }
  // no eval, no registration (evolve-skills §3): a created skill must arrive
  // with the eval that will gate it — a runnable assert on artifacts, plus
  // the ≥2-session evidence that a distilled workflow is not a one-off.
  if (kind === "overlay-create") {
    const ev = proposal.eval || {};
    if (!(ev && typeof ev === "object" && !Array.isArray(ev) && ev.assert)) {
      sys_exit(
        "overlay-create proposals must bundle an 'eval' with a non-empty " +
          "'assert' (no eval, no registration — see docs/evolve-plan.md)",
      );
    }
    // distinct sessions — ["a", "a"] is one witness, not two
    if (new Set(proposal.sessions || []).size < 2 && !proposal.explicit) {
      sys_exit(
        "overlay-create needs >=2 witnessing sessions (the anti-overfit " +
          "evidence bar), or explicit=true for a user-requested skill",
      );
    }
  }
  if (kind === "repo-promotion") {
    // promoting a user skill to the shared repo tier: highest consequence
    // radius (everyone gets it), so it needs the skill body, a rationale
    // for why it belongs shared, and the eval every repo skill must carry.
    for (const field of ["name", "description", "content", "rationale"]) {
      if (!proposal[field]) {
        sys_exit(`repo-promotion missing required field '${field}'`);
      }
    }
    if (
      !(
        proposal.eval &&
        typeof proposal.eval === "object" &&
        !Array.isArray(proposal.eval) &&
        proposal.eval.assert
      )
    ) {
      sys_exit(
        "repo-promotion must bundle an 'eval' with a non-empty 'assert' " +
          "(repo skills require a G1 scenario — no eval, no promotion)",
      );
    }
  }
  // GR4 at the proposal boundary: any kind carrying a skill body is scanned
  // HERE so poison is refused at stage time, not left to apply-time (overlays)
  // or agent prose (promotion, whose apply is agent-mediated and the highest
  // blast radius). One chokepoint, every skill-body write.
  for (const body_field of ["body", "content"]) {
    if (proposal[body_field]) {
      guard_skill_content(proposal.name ?? kind, proposal[body_field]);
    }
  }
  // R7 hypothesis ledger: a refine proposal may carry the one-variable
  // hypothesis it tests; when present it must be complete so the bench can
  // later mark it confirmed/rejected against the baseline
  if (proposal.hypothesis !== undefined) {
    const h = proposal.hypothesis;
    if (!(h && typeof h === "object" && !Array.isArray(h) && h.variable && h.expected_delta)) {
      sys_exit(
        "proposal.hypothesis must carry non-empty 'variable' and 'expected_delta' " +
          "(one variable per patch — the regression-attribution ledger)",
      );
    }
  }
  // eval fields are executable surface too: 'assert' runs via sh -c in the
  // bench runner and 'prompt' drives claude -p — a poisoned proposal must
  // not smuggle payloads past GR4 through the eval it is required to bundle
  const ev = proposal.eval;
  if (ev && typeof ev === "object" && !Array.isArray(ev)) {
    for (const ev_field of ["assert", "prompt"]) {
      if (ev[ev_field]) {
        guard_skill_content(`${proposal.name ?? kind}.eval.${ev_field}`, String(ev[ev_field]));
      }
    }
  }
  proposal.ts = now_iso();
  // ns + pid: concurrent headless runs must never overwrite each other's proposals
  const ns = BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n);
  const dest = path.join(PENDING_DIR, `${kind}-${ns}-${process.pid}.json`);
  fs.writeFileSync(dest, py_json_dumps(proposal, { indent: 2 }) + "\n");
  console.log(`staged ${dest}`);
}

export function cmd_distill_candidates(args: Record<string, any>): void {
  // Surface reusable-workflow candidates: task classes whose signal recurs
  // across >=2 DISTINCT sessions in the journal. This points the distiller at
  // which transcripts to read — the agent judges whether a real workflow
  // recurred; the journal only says where to look. Preferences/corrections are
  // excluded (those are evolve-review's territory, not skill creation).
  const sessions = new Map<string, Set<unknown>>();
  const samples = new Map<string, string>();
  for (const e of journal_entries()) {
    const t = e.type;
    let key: string;
    if (t === "technique") {
      key = `technique @ ${e.repo || "?"}`;
    } else if (t === "skill-usage") {
      key = `skill:${e.skill || "?"}`;
    } else {
      continue;
    }
    if (!sessions.has(key)) sessions.set(key, new Set());
    sessions.get(key)!.add(e.session_id);
    if (!samples.has(key)) samples.set(key, py_cut_str(e.content ?? "", 90));
  }
  // sorted by -len(sessions); Python sorted() is stable over the dict's
  // insertion order for ties.
  const cands = [...sessions.entries()]
    .filter(([, s]) => s.size >= 2)
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => b.entry[1].size - a.entry[1].size || a.i - b.i)
    .map((x) => x.entry);
  if (args.json) {
    console.log(
      py_json_dumps(
        cands.map(([k, s]) => ({
          class: k,
          sessions: sorted_strs([...s]),
          sample: samples.get(k),
        })),
        { indent: 2 },
      ),
    );
    return;
  }
  if (!cands.length) {
    console.log(
      "no distillation candidates — need a task class seen in >=2 sessions " +
        "(run digest.ts --backfill to mine history first)",
    );
    return;
  }
  console.log("distillation candidates (read these transcripts, then /evolve-distill):");
  for (const [k, s] of cands) {
    console.log(`  ${ljust(k, 28)} ${s.size} sessions  [${sorted_strs([...s]).join(", ")}]`);
  }
}

/* sorted() over a list that may hold non-strings (session_id can be null);
mirror Python's default ordering closely enough for the deterministic cases
the suite exercises (all-string session ids). */
function sorted_strs(xs: unknown[]): string[] {
  return xs.map((x) => String(x)).sort();
}

/* text[:n] code-point slice for sample content. */
function py_cut_str(s: string, n: number): string {
  const chars = Array.from(s);
  return chars.length <= n ? s : chars.slice(0, n).join("");
}

export function cmd_apply_pending(args: Record<string, any>): void {
  const p = args.file;
  const proposal = JSON.parse(fs.readFileSync(p, "utf-8"));
  const kind = proposal.kind;
  if (kind === "overlay-create") {
    scaffold_overlay(
      proposal.name,
      proposal.description,
      proposal.body ?? null,
      proposal.pinned ?? false,
      proposal.signal,
      proposal.sessions ?? [],
      proposal.eval,
    );
  } else if (kind === "overlay-patch") {
    patch_overlay(proposal.name, proposal.content, proposal.signal, proposal.sessions ?? []);
  } else if (kind === "archive") {
    archive_overlay(proposal.name);
  } else {
    // repo-memory / observation / repo-promotion proposals are applied by
    // the review/map skill directly — git-tracked writes, Honcho writes, and
    // a user->repo PR all need the agent's judgment, not a blind replay
    sys_exit(
      `'${kind}' proposals are applied by /evolve-review or /evolve-map ` +
        "directly (they open a PR / write git-tracked files), not this command",
    );
  }
  fs.unlinkSync(p);
  console.log(`applied and removed ${path.basename(p)}`);
}

/* Python repr() of a string: single-quoted, with escapes. Used for the GR4
detail line `{s!r}`. */
function py_repr(s: string): string {
  const hasSingle = s.includes("'");
  const hasDouble = s.includes('"');
  let body = s.replace(/\\/g, "\\\\");
  if (hasSingle && !hasDouble) {
    return '"' + body + '"';
  }
  body = body.replace(/'/g, "\\'");
  return "'" + body + "'";
}

/* Python repr() of a tuple of strings, e.g. ('a', 'b', 'c'). */
function py_tuple_repr(xs: readonly string[]): string {
  const inner = xs.map((x) => py_repr(x)).join(", ");
  return xs.length === 1 ? `(${inner},)` : `(${inner})`;
}

/* round(x, 2) with CPython round-half-to-even. Confidence ratios such as
10/16 = 0.625 land on exact dyadic ties where away-from-zero would diverge
(Python 0.62), so the shared away-from-zero py_round2 is not used here. */
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

export function main(): void {
  const subs: Record<string, CliOpt[]> = {
    scaffold: [
      { flag: "name", positional: true },
      { flag: "--description", required: true },
      { flag: "--body" },
      { flag: "--pinned", store_true: true },
      { flag: "--signal" },
      { flag: "--sessions" },
    ],
    patch: [
      { flag: "name", positional: true },
      { flag: "--file" },
      { flag: "--signal", required: true },
      { flag: "--sessions" },
    ],
    record: [
      { flag: "name", positional: true },
      { flag: "--outcome", choices: ["success", "failure"], required: true },
      { flag: "--error" },
    ],
    "set-status": [
      { flag: "name", positional: true },
      { flag: "status", positional: true, choices: ["active", "deprecated"] },
    ],
    archive: [{ flag: "name", positional: true }],
    report: [{ flag: "--json", store_true: true }],
    propose: [],
    "distill-candidates": [{ flag: "--json", store_true: true }],
    "apply-pending": [{ flag: "file", positional: true }],
  };
  const prog = path.basename(process.argv[1] || "overlay.ts");
  const args = parse_cli(prog, __doc__, subs, process.argv.slice(2));
  const dispatch: Record<string, (a: Record<string, any>) => void> = {
    scaffold: cmd_scaffold,
    patch: cmd_patch,
    record: cmd_record,
    "set-status": cmd_set_status,
    archive: cmd_archive,
    report: cmd_report,
    propose: cmd_propose,
    "distill-candidates": cmd_distill_candidates,
    "apply-pending": cmd_apply_pending,
  };
  dispatch[args.cmd](args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run_main(main);
}
