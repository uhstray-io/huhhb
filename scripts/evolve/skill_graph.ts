#!/usr/bin/env node
// huhhb evolve — cross-skill inventory & relationship substrate. (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { py_json_dumps, parse_cli, run_main, type CliOpt } from "./honcho_client.ts";

const __doc__ = `huhhb evolve — cross-skill inventory & relationship substrate.

The deterministic half of /evolve-map: discover every skill across tiers,
parse it, dedup, and surface structural near-duplicates. The SEMANTIC half
(relationship edges, improvement recommendations, approach-gaps) is the
agent's judgment in /evolve-map, seeded by this data so it is grounded rather
than guessed. Stdlib only, read-only, no network.

Tiers (the delineation the user asked for):
  repo    — huhhb's own skills/ (the marketplace source of truth)
  user    — ~/.claude/skills/* (hand-written; *-local = evolve overlays)
  plugin  — ~/.claude/plugins/**/skills/* (installed, upstream-owned, read-only)

  inventory [--json] [--tier T]     normalized catalog across tiers
  overlaps  [--json] [--min S]      near-duplicate / cross-tier collision pairs`;

const HERE = path.dirname(fileURLToPath(import.meta.url));
// repo root: the tree above scripts/evolve that carries marketplace.json —
// works from a checkout and from the installed plugin (its skills/ is huhhb's)
const _repo = path.dirname(path.dirname(HERE));
export const REPO_SKILLS: string | null = fs.existsSync(path.join(_repo, "marketplace.json"))
  ? path.join(_repo, "skills")
  : null;
export const USER_SKILLS =
  process.env.EVOLVE_USER_SKILLS || path.join(os.homedir(), ".claude", "skills");
export const PLUGINS_ROOT =
  process.env.EVOLVE_PLUGINS_ROOT || path.join(os.homedir(), ".claude", "plugins");

const _STOP = new Set(
  (
    "use when the a an to for of and or with in on this that your you it is are be " +
    "skill using used uses via across before after into from as at by them their " +
    "user agent code claude if not no do does"
  ).split(/\s+/),
);
const _FM_NAME = /^name:\s*(\S+)/m;
const _FM_DESC = /^description:\s*(.+(?:\n[ \t]+.+)*)/m;

// float fields whose integer-valued numbers must render as "0.0"/"1.0" in JSON
const SCORE_FLOAT_KEYS = new Set(["score"]);

interface SkillRecord {
  name: string;
  description: string;
  path: string;
  tier?: string;
  source?: string;
  is_overlay?: boolean;
}

function _parse(p: string): SkillRecord | null {
  // mirrors skill-lint.py's parse_skill_md (name+description frontmatter);
  // kept local rather than cross-importing a sibling top-level script for
  // ~10 lines — if a third caller appears, extract a shared module
  let text: string;
  try {
    text = fs.readFileSync(p, "utf-8"); // errors="replace" — Buffer decode does this
  } catch {
    return null;
  }
  if (!text.startsWith("---")) {
    return null;
  }
  const fm = count_occurrences(text, "---") >= 2 ? split_n(text, "---", 2)[1] : "";
  const name = _FM_NAME.exec(fm);
  const desc = _FM_DESC.exec(fm);
  return {
    name: name ? name[1] : path.basename(path.dirname(p)),
    description: (desc ? desc[1] : "").split(/\s+/).filter((x) => x !== "").join(" "),
    path: p,
  };
}

/* str.split(sep, maxsplit) parity: at most maxsplit splits, remainder kept
whole in the last element. */
function split_n(s: string, sep: string, maxsplit: number): string[] {
  const out: string[] = [];
  let rest = s;
  for (let i = 0; i < maxsplit; i++) {
    const idx = rest.indexOf(sep);
    if (idx === -1) break;
    out.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  out.push(rest);
  return out;
}

function count_occurrences(s: string, sub: string): number {
  let n = 0;
  let idx = s.indexOf(sub);
  while (idx !== -1) {
    n += 1;
    idx = s.indexOf(sub, idx + sub.length);
  }
  return n;
}

export function _plugin_source(p: string): string {
  // The owning plugin name from a ~/.claude/plugins/**/skills/<name>/SKILL.md
  // path — the segment immediately above skills/.
  const parts = pathParts(p);
  const i = parts.indexOf("skills");
  if (i === -1) {
    return "?";
  }
  let src = parts[i - 1];
  if (src === undefined) {
    return "?"; // IndexError parity (i === 0)
  }
  // cache layouts insert a version dir (plugin/<ver>/skills/) — the owner is
  // one level further up. Two spellings in the wild: dotted semver ("0.5.4")
  // and content-hash dirs ("069551a7d2b0", seen in claude-plugins-official).
  if ((fullmatch(/v?\d+(?:[.\-]\w+)*/, src) || fullmatch(/[0-9a-f]{7,40}/, src)) && i >= 2) {
    src = parts[i - 2];
  }
  return src ?? "?";
}

/* Plugins vendor per-tool mirrors of their own skills in dot-directories
   (.claude-plugin/, .cursor/, .openclaw/, .codex-plugin/, even .claude/).
   Those are packaging scaffolding, not installed skill locations — counting
   them mints phantom same-name duplicates (found by the 0.5.4 field test:
   114 overlap pairs, most of them mirror noise). Judged RELATIVE to the
   plugins root so the ~/.claude prefix of the root itself never trips it. */
export function is_tool_mirror(p: string, root: string = PLUGINS_ROOT): boolean {
  const rel = path.relative(root, p);
  if (rel.startsWith("..")) return false; // outside the root — not ours to judge
  const parts = rel.split(path.sep);
  const i = parts.indexOf("skills");
  return parts.slice(0, i === -1 ? undefined : i).some((seg) => seg.startsWith("."));
}

/* re.fullmatch parity. */
function fullmatch(re: RegExp, s: string): boolean {
  const anchored = new RegExp("^(?:" + re.source + ")$", re.flags.replace("g", ""));
  return anchored.test(s);
}

/* pathlib PurePath.parts parity: split on the OS separator, dropping empty
segments but keeping a leading "/" as its own part on POSIX. */
function pathParts(p: string): string[] {
  const norm = path.normalize(p);
  const segs = norm.split(path.sep).filter((s) => s !== "");
  if (path.sep === "/" && norm.startsWith("/")) {
    return ["/", ...segs];
  }
  return segs;
}

export function inventory(tier_filter: string | null = null): SkillRecord[] {
  // Normalized, deduped catalog. Dedup rules: plugin version dirs collapse
  // by (source, name) keeping the newest; the huhhb plugin mirror is dropped
  // (it IS the repo tier).
  const seen = new Map<string, SkillRecord>();

  const _mtime = (p: string): number => {
    try {
      return fs.statSync(p).mtimeMs;
    } catch {
      return 0.0; // vanished/unreadable between glob and here — degrade, don't crash
    }
  };

  const add = (rec: SkillRecord, tier: string, source: string): void => {
    rec.tier = tier;
    rec.source = source;
    rec.is_overlay = rec.name.endsWith("-local");
    // key on (tier, name): the plugin cache vendors the same skill across
    // version/marketplace dirs (descriptions even drift between copies), so
    // collapse to one per tier+name (newest). Cross-tier same-name pairs —
    // the real dedup signal, e.g. a user skill shadowing a repo one —
    // survive because the tier differs.
    // plugin tier keys on source too: same-plugin version copies still
    // collapse (same source), but two DIFFERENT plugins shipping the same
    // skill name stay distinct so overlaps() can flag the collision
    const key =
      tier === "plugin"
        ? JSON.stringify([tier, source, rec.name])
        : JSON.stringify([tier, rec.name]);
    const prev = seen.get(key);
    if (prev === undefined || _mtime(rec.path) > _mtime(prev.path)) {
      seen.set(key, rec);
    }
  };

  if (REPO_SKILLS && fs.existsSync(REPO_SKILLS)) {
    for (const p of glob_one_level(REPO_SKILLS)) {
      const r = _parse(p);
      if (r) add(r, "repo", "huhhb");
    }
  }
  if (fs.existsSync(USER_SKILLS)) {
    for (const p of glob_one_level(USER_SKILLS)) {
      const r = _parse(p);
      if (r) add(r, "user", "user");
    }
  }
  if (fs.existsSync(PLUGINS_ROOT)) {
    for (const p of glob_plugin_skills(PLUGINS_ROOT)) {
      // drop the huhhb mirror (marketplaces/huhhb, cache/huhhb) — it's repo;
      // p.parts is separator-agnostic, matching _plugin_source
      if (pathParts(p).includes("huhhb")) {
        continue;
      }
      // drop per-tool packaging mirrors (.cursor/, .claude-plugin/, ...)
      if (is_tool_mirror(p)) {
        continue;
      }
      const r = _parse(p);
      if (r) add(r, "plugin", _plugin_source(p));
    }
  }

  let records = [...seen.values()];
  if (tier_filter) {
    records = records.filter((r) => r.tier === tier_filter);
  }
  return records.sort((a, b) => {
    return (
      cmp(a.tier!, b.tier!) || cmp(a.source!, b.source!) || cmp(a.name, b.name)
    );
  });
}

/* Lexicographic string comparison matching Python's default (< over str). */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* glob "*\/SKILL.md": one directory level then SKILL.md. Absolute paths. */
function glob_one_level(root: string): string[] {
  let dirs: string[];
  try {
    dirs = fs.readdirSync(root);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const d of dirs) {
    const sm = path.join(root, d, "SKILL.md");
    let st: fs.Stats;
    try {
      st = fs.statSync(sm);
    } catch {
      continue;
    }
    if (st.isFile()) out.push(sm);
  }
  return out;
}

/* glob "**\/skills/*\/SKILL.md": any depth, then skills/<name>/SKILL.md. */
function glob_plugin_skills(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "skills") {
          for (const sm of glob_one_level(full)) out.push(sm);
        }
        walk(full);
      }
    }
  };
  walk(root);
  return out;
}

function _tokens(desc: string): Set<string> {
  const out = new Set<string>();
  for (const w of desc.toLowerCase().match(/[a-z0-9-]+/g) || []) {
    if (!_STOP.has(w) && w.length > 2) out.add(w);
  }
  return out;
}

export function overlaps(records: SkillRecord[], min_score = 0.35): Record<string, any>[] {
  // Structural near-duplicate pairs (Jaccard over description tokens), plus
  // every exact same-name pair across tiers (a strong collision signal — the
  // dedup-before-create net). The agent decides merge vs. complement; this
  // only says 'look here'.
  const toks: Set<string>[] = records.map((r) => _tokens(r.description));
  const pairs: Record<string, any>[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const same_name = records[i].name === records[j].name;
      const a = toks[i];
      const b = toks[j];
      const union = new Set([...a, ...b]);
      let inter = 0;
      for (const x of a) if (b.has(x)) inter += 1;
      const score = a.size || b.size ? inter / union.size : 0.0;
      if (same_name || score >= min_score) {
        pairs.push({
          a: `${records[i].tier}:${records[i].name}`,
          b: `${records[j].tier}:${records[j].name}`,
          score: py_round2(score),
          same_name: same_name,
          cross_tier: records[i].tier !== records[j].tier,
        });
      }
    }
  }
  // sorted by (-same_name, -score); Python sorted() is stable for ties.
  return pairs
    .map((p, i) => ({ p, i }))
    .sort(
      (x, y) =>
        (Number(y.p.same_name) - Number(x.p.same_name)) ||
        (y.p.score - x.p.score) ||
        (x.i - y.i),
    )
    .map((x) => x.p);
}

export function main(): void {
  const subs: Record<string, CliOpt[]> = {
    inventory: [
      { flag: "--json", store_true: true },
      { flag: "--tier", choices: ["repo", "user", "plugin"] },
    ],
    overlaps: [
      { flag: "--json", store_true: true },
      { flag: "--min", type: "float", def: 0.35 },
    ],
  };
  const prog = path.basename(process.argv[1] || "skill_graph.ts");
  const args = parse_cli(prog, __doc__, subs, process.argv.slice(2));

  if (args.cmd === "inventory") {
    const recs = inventory(args.tier);
    if (args.json) {
      console.log(py_json_dumps(recs, { indent: 2 }));
      return;
    }
    const by_tier = new Map<string, SkillRecord[]>();
    for (const r of recs) {
      if (!by_tier.has(r.tier!)) by_tier.set(r.tier!, []);
      by_tier.get(r.tier!)!.push(r);
    }
    for (const tier of ["repo", "user", "plugin"]) {
      const group = by_tier.get(tier) || [];
      console.log(`\n== ${tier} (${group.length}) ==`);
      for (const r of group) {
        const tag = r.is_overlay ? " [overlay]" : "";
        const src = r.source === "huhhb" || r.source === "user" ? "" : ` (${r.source})`;
        console.log(`  ${r.name}${src}${tag}: ${py_cut(r.description, 70)}`);
      }
    }
    console.log(`\ntotal: ${recs.length} skills`);
  } else {
    const pairs = overlaps(inventory(), args.min);
    if (args.json) {
      console.log(py_json_dumps(pairs, { indent: 2, float_keys: SCORE_FLOAT_KEYS }));
      return;
    }
    if (!pairs.length) {
      console.log("no structural overlaps above threshold");
      return;
    }
    console.log(
      `${pairs.length} overlap pair(s) — merge/dedup candidates ` +
        "(agent judges merge vs. complement):",
    );
    for (const p of pairs) {
      const flags = (p.same_name ? "SAME-NAME " : "") + (p.cross_tier ? "CROSS-TIER" : "");
      console.log(`  ${ljust(p.a, 38)} ~ ${ljust(p.b, 38)} ${py_float_str(p.score)}  ${flags}`);
    }
  }
}

/* text[:n] code-point slice. */
function py_cut(s: string, n: number): string {
  const chars = Array.from(s);
  return chars.length <= n ? s : chars.slice(0, n).join("");
}

/* Left-justify to width n (Python ':n' for str). */
function ljust(s: string, n: number): string {
  const len = Array.from(s).length;
  return len >= n ? s : s + " ".repeat(n - len);
}

/* str(float) parity for the human overlaps table (0.5 -> "0.5", 1.0 -> "1.0"). */
function py_float_str(x: number): string {
  return Number.isFinite(x) && Number.isInteger(x) ? x.toFixed(1) : String(x);
}

/* round(x, 2) with CPython's round-half-to-even on the true double value.
The shared honcho_client py_round2 rounds ties away from zero (toFixed),
which diverges on exact dyadic ties like 0.625 -> Python 0.62 vs 0.63; a
Jaccard ratio such as 5/8 hits exactly that tie, so score rounding needs
the even rule. Not edited into honcho_client.ts (owned elsewhere). */
function py_round2(x: number): number {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0;
  const s = Math.abs(x).toFixed(20); // V8 toFixed is correctly rounded
  const dot = s.indexOf(".");
  const digits = s.slice(0, dot) + s.slice(dot + 1, dot + 3); // integer scaled by 100
  const rest = s.slice(dot + 3);
  const firstRest = rest.charCodeAt(0) - 48;
  let roundUp: boolean;
  if (firstRest > 5) {
    roundUp = true;
  } else if (firstRest < 5) {
    roundUp = false;
  } else if (rest.slice(1).replace(/0+$/, "").length > 0) {
    roundUp = true; // 5 followed by nonzero — strictly above the tie
  } else {
    roundUp = (digits.charCodeAt(digits.length - 1) - 48) % 2 === 1; // exact tie -> to even
  }
  let n = BigInt(digits);
  if (roundUp) n += 1n;
  const val = Number(n) / 100;
  return neg ? -val : val;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run_main(main);
}
