#!/usr/bin/env node
/* huhhb G0 static lint — the free quality gate (docs/evolve-plan.md S1-S12).

Checks every marketplace.json entry. FAIL blocks merge (exit 1); WARN is
advisory. Node stdlib only, no network — safe for CI and pre-commit. Shells out
to `git ls-files` for S10, so it wants a checkout, not a bare directory.

    node scripts/skill-lint.ts [--strict]   # --strict promotes WARN to FAIL
*/

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BODY_WARN_CHARS = 6000; // ~1500 tokens injected on every load
const BODY_FAIL_CHARS = 12000; // ~3000 tokens — progressive disclosure is overdue
const TRIGGER_HINT = /\buse (when|to|during|for|this)\b|triggers? on|"[^"]+"/i;
/* S9-S12 — the authoring standard's machine-enforceable subset
   (skills/writing-skills/references/skill-authoring.md → Split of enforcement).
   All WARN: they land on 53 pre-existing skills, and a FAIL-on-adoption gate
   would either block every merge or need a baseline so large it is
   indistinguishable from having no check at all. Promotion to FAIL belongs to
   the retrofit, once the debt is burned down. */
export const NAME_CHARSET = /^[a-z0-9]+(-[a-z0-9]+)*$/; // S9 (spec: lowercase, digits, hyphens)
export const FIRST_PERSON = /\b(I|we|my|our|us)\b/; // S11 — case-sensitive 'I' on purpose
export const BODY_WARN_LINES = 500; // S12 [SKILLOPT] — rules, not prose

/* S10 — how deep a file sits below its skill directory. 0 = beside SKILL.md,
   1 = a reference (references/x.md), 2+ = too deep. Takes a skill-relative
   path, not a link: S10 measures the shipped file tree, so `../` and `#anchor`
   forms cannot reach it. Exported because a check nothing can trigger is
   indistinguishable from a clean repo, and this one currently fires on no
   skill in the marketplace. */
export function refDepth(relPath: string): number {
  return relPath.split("/").filter((s) => s && s !== ".").length - 1;
}

/* The files a skill actually ships: tracked, plus untracked ones git would not
   ignore, so a reference added but not yet committed still counts. Read from
   git rather than the directory because a directory walk sees files git
   ignores — a .DS_Store from opening the folder in Finder made S10 report
   `reference nested 2 levels deep: a/b/.DS_Store` and fail --strict on an
   otherwise clean tree. Paths come back relative to `dir`. */
function shippedFiles(dir: string): string[] {
  const r = spawnSync(
    "git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", dir],
    { cwd: REPO, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ls-files failed for ${dir}`);
  const prefix = `${relative(REPO, dir)}/`;
  return (r.stdout ?? "").split("\n").filter(Boolean).map((f) => f.slice(prefix.length));
}

type Issue = { level: "FAIL" | "WARN"; skill: string; code: string; msg: string };

const issues: Issue[] = [];

function report(level: Issue["level"], skill: string, code: string, msg: string): void {
  issues.push({ level, skill, code, msg });
}

/* Python len() counts code points; keep that so char-count thresholds and
   the numbers printed in findings stay identical to the .py gate. */
function charLen(s: string): number {
  return Array.from(s).length;
}

/* str.split(sep, maxsplit) semantics: at most `maxsplit` splits, remainder
   (including further separators) stays in the last part. */
function splitN(text: string, sep: string, maxsplit: number): string[] {
  const parts: string[] = [];
  let rest = text;
  while (parts.length < maxsplit) {
    const i = rest.indexOf(sep);
    if (i === -1) break;
    parts.push(rest.slice(0, i));
    rest = rest.slice(i + sep.length);
  }
  parts.push(rest);
  return parts;
}

/** -> (frontmatter keys | null, frontmatter text, body). */
function parseSkillMd(text: string): { keys: string[] | null; fm: string; body: string } {
  const parts = splitN(text, "---", 2);
  if (parts.length < 3 || parts[0].trim()) {
    return { keys: null, fm: "", body: text };
  }
  const keys = parts[1]
    .trim()
    .split(/\r\n|\r|\n/)
    .filter((line) => /^\w[\w-]*:/.test(line))
    .map((line) => line.split(":")[0].trim());
  return { keys, fm: parts[1], body: parts[2] };
}

function pyList(keys: string[]): string {
  return "[" + keys.map((k) => `'${k}'`).join(", ") + "]";
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

type Entry = { name?: string; path?: string; description?: string; version?: string };

function lintEntry(entry: Entry, seenNames: Set<string>, seenDescriptions: Set<string>): void {
  const name = entry.name ?? "?";
  const rel = entry.path;
  const path = rel ? join(REPO, rel) : null;

  if (path === null || !isFile(path)) {
    // S1
    report("FAIL", name, "S1", `missing file ${rel || "(no path in entry)"}`);
    return;
  }
  if (seenNames.has(name)) {
    // S5
    report("FAIL", name, "S5", "duplicate skill name");
  }
  seenNames.add(name);

  const desc = entry.description ?? "";
  const descLen = charLen(desc);
  if (!(descLen >= 30 && descLen <= 500)) {
    // S4
    report("FAIL", name, "S4", `marketplace description length ${descLen} (want 30-500)`);
  }
  if (seenDescriptions.has(desc)) {
    report("FAIL", name, "S5", "identical description to another skill");
  }
  seenDescriptions.add(desc);
  /* S11 — descriptions are third person (D1). Checked against the marketplace
     description because that is the always-loaded routing surface, and first
     person there reads as the skill talking about itself rather than naming the
     situation it serves. */
  if (FIRST_PERSON.test(desc)) {
    report("WARN", name, "S11", "description is not third person (first-person pronoun)");
  }
  if (!("version" in entry)) {
    // S8
    report("FAIL", name, "S8", "marketplace entry missing version");
  }

  const text = readFileSync(path, "utf-8");
  const { keys, fm, body } = parseSkillMd(text);

  const isSkillMd = basename(path) === "SKILL.md";
  if (isSkillMd) {
    if (keys === null) {
      report("FAIL", name, "S2", "no parseable frontmatter");
    } else {
      if (!(keys.length === 2 && keys[0] === "name" && keys[1] === "description")) {
        // S2
        report("FAIL", name, "S2", `frontmatter keys ${pyList(keys)} (want [name, description])`);
      }
      const fmName = fm.match(/^name:\s*(\S+)/m);
      if (fmName && fmName[1] !== basename(dirname(path))) {
        // S3
        report("FAIL", name, "S3",
          `frontmatter name '${fmName[1]}' != dir '${basename(dirname(path))}'`);
      }
      // block scalars (description: >) span indented continuation lines
      const fmDesc = fm.match(/^description:\s*(.+(?:\n[ \t]+.+)*)/m);
      if (fmDesc && !TRIGGER_HINT.test(fmDesc[1])) {
        report("WARN", name, "S4", "description has no trigger phrasing " +
          "('use when...', quoted phrases)");
      }
    }
  } else if (keys && keys.includes("triggers")) {
    // S2 — banned repo-wide
    report("FAIL", name, "S2", "frontmatter has unsupported 'triggers' field");
  }
  // links/paths inside fenced code blocks are examples, not references
  const prose = body.replace(/```[\s\S]*?```/g, "");
  const bodyLen = charLen(body);
  if (bodyLen > BODY_FAIL_CHARS) {
    // S6
    report("FAIL", name, "S6", `body ${bodyLen} chars > ${BODY_FAIL_CHARS} — ` +
      "split into references/");
  } else if (bodyLen > BODY_WARN_CHARS) {
    report("WARN", name, "S6", `body ${bodyLen} chars — consider progressive disclosure`);
  }

  // S9 — the published skill name must match the spec's charset. A name the
  // loader can't address is undiscoverable no matter how good the description.
  if (!NAME_CHARSET.test(name)) {
    report("WARN", name, "S9", "name is not spec charset (lowercase, digits, single hyphens)");
  }

  // S12 — line count, not chars: S6 already owns the char caps, and a body can
  // sit under them while still being 700 lines of short bullets.
  const bodyLines = body.split(/\r\n|\r|\n/).length;
  if (bodyLines > BODY_WARN_LINES) {
    report("WARN", name, "S12", `body ${bodyLines} lines > ${BODY_WARN_LINES}`);
  }

  for (const m of prose.matchAll(/\]\((?!http|#|mailto)([^)\s]+)\)/g)) {
    // S7
    const link = m[1];
    // the path part only: no `:line` suffix, no `#anchor`
    const rel = link.split(":")[0].split("#")[0];
    if (!existsSync(resolve(dirname(path), rel)) && !existsSync(resolve(REPO, rel))) {
      report("FAIL", name, "S7", `broken relative link: ${link}`);
    }
  }

  /* S10 — measured against the skill's own shipped file tree, not its links.
     Checking only linked paths would exempt a nested file nothing happens to
     link to, and would misread `${CLAUDE_PLUGIN_ROOT}/...` refs, which are
     repo-rooted rather than skill-rooted and carry a legitimately deeper path. */
  if (isSkillMd) {
    for (const entry of shippedFiles(dirname(path))) {
      const depth = refDepth(entry);
      if (depth > 1) {
        report("WARN", name, "S10", `reference nested ${depth} levels deep: ${entry}`);
      }
    }
  }
  const refs = new Set(
    Array.from(prose.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g), (m) => m[1]));
  for (const ref of refs) {
    if (!existsSync(join(REPO, ref))) {
      report("FAIL", name, "S7", `plugin-root path missing from repo: ${ref}`);
    }
  }
}

function main(): void {
  let strict = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--strict") {
      strict = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log("usage: skill-lint.ts [-h] [--strict]\n\n" +
        "options:\n  -h, --help  show this help message and exit\n" +
        "  --strict    WARN also fails the gate");
      process.exit(0);
    } else {
      console.error(`usage: skill-lint.ts [-h] [--strict]\nskill-lint.ts: error: unrecognized arguments: ${arg}`);
      process.exit(2);
    }
  }

  const mp = JSON.parse(readFileSync(join(REPO, "marketplace.json"), "utf-8"));
  const pj = JSON.parse(readFileSync(join(REPO, ".claude-plugin", "plugin.json"), "utf-8"));
  if (mp.version !== pj.version) {
    // S8
    report("FAIL", "(repo)", "S8",
      `version drift: marketplace ${mp.version} != plugin ${pj.version}`);
  }

  const seenNames = new Set<string>();
  const seenDescriptions = new Set<string>();
  for (const entry of mp.skills) {
    lintEntry(entry, seenNames, seenDescriptions);
  }

  // ratchet: pre-existing violations are grandfathered (visible, non-blocking);
  // anything NEW fails. Shrink this file over time, never grow it.
  const baselinePath = join(REPO, "scripts", "skill-lint-baseline.json");
  const baseline = new Set<string>(
    existsSync(baselinePath)
      ? (JSON.parse(readFileSync(baselinePath, "utf-8")) as [string, string][])
          .map(([skill, code]) => `${skill}\x00${code}`)
      : []);

  const fails: Issue[] = [];
  const warns: Issue[] = [];
  const grandfathered: Issue[] = [];
  for (const issue of issues) {
    if (issue.level === "FAIL" && baseline.has(`${issue.skill}\x00${issue.code}`)) {
      grandfathered.push(issue);
    } else if (issue.level === "FAIL") {
      fails.push(issue);
    } else {
      warns.push(issue);
    }
  }
  const groups: [string, Issue[]][] = [
    ["FAIL", fails], ["GRANDFATHERED", grandfathered], ["WARN", warns]];
  for (const [tag, group] of groups) {
    for (const { skill, code, msg } of group) {
      console.log(`${tag.padEnd(13)} ${code} ${skill.padEnd(34)} ${msg}`);
    }
  }
  console.log(`\n${mp.skills.length} skills — ${fails.length} FAIL, ` +
    `${grandfathered.length} grandfathered, ${warns.length} WARN`);
  process.exit(fails.length || (strict && warns.length) ? 1 : 0);
}

// main-module guard: the S9-S12 unit rows import the predicates above, and an
// unguarded main() would run the whole lint (and exit) on import
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main();
}
