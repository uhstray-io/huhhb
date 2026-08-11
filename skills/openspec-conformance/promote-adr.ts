#!/usr/bin/env node
/* openspec-conformance — ADR promotion (Path 3).

Run at archive time (pr-shepherd post-merge close-out). Given a repo's plans/
dir and the dated archive dirname that `openspec archive` printed, it:

  1. extracts ONLY the archived design.md "## Decisions" section (the durable
     architecture record — never the whole design doc),
  2. appends exactly one `## ADR-NNNN — <slug>` record to the repo-memory ADR
     store at plans/architecture/YYYY/YYYY-MM.md,
  3. adds its row to that year's INDEX.md and its line to DECISIONS.md.

That is the whole of it: this script owns decision records and their two
indexes, and nothing else. It previously also flipped a row in
plans/development/00-implementation-plan.md and exited 1 when no such row
existed — which made promotion fail in a repo that deliberately keeps no change
index. Change status comes from the store (`openspec list`); a writer spanning
two concerns made the second a precondition of the first.

The store shape and its rules are owned by `repo-memory`; OpenSpec writes
specifications, not decisions (ADR-0003). This script is only the mechanism.
ADR-NNNN is globally sequential across every month and never reused.

A design with no "## Decisions" section promotes NO record — not every change
earns one. Node stdlib only; no deps.

    node promote-adr.ts <plans-dir> <archived-dirname> [--change-url <url>]
                        [--domain <name>] [--date YYYY-MM-DD]

Source-file mode (inception promotion): promote the ## Decisions section of an
arbitrary file (e.g. plans/product/<slug>/architecture.md), same
extraction/numbering/idempotency:

    node promote-adr.ts <plans-dir> --from <file> --slug <slug> [...]

Exit 0 on success (prints what it did), 1 on a usage/precondition error.
*/
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import process from "node:process";

function die(msg: string): never {
  console.error(`promote-adr: ${msg}`);
  process.exit(1);
}

/** Slice a markdown `## Heading` section body (until the next `## ` or EOF). */
function section(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

/** Placeholder/empty content is treated as absent (HTML comments, blanks). */
function meaningful(s: string): boolean {
  return s.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;
}

/** Every `YYYY/YYYY-MM.md` month file in the store, oldest first. */
function monthFiles(archDir: string): string[] {
  if (!existsSync(archDir)) return [];
  const out: string[] = [];
  for (const y of readdirSync(archDir)) {
    if (!/^\d{4}$/.test(y)) continue;
    const yDir = join(archDir, y);
    for (const f of readdirSync(yDir)) {
      if (/^\d{4}-\d{2}\.md$/.test(f)) out.push(join(yDir, f));
    }
  }
  return out.sort();
}

/* Numbering is GLOBAL across every month file — never per-file. Taking the
   next number from the current month would reuse an id as soon as a decision
   landed in a different month. */
function nextAdrNumber(archDir: string): string {
  let max = 0;
  for (const f of monthFiles(archDir)) {
    for (const m of readFileSync(f, "utf-8").matchAll(/^## ADR-(\d+)\b/gm)) {
      max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return String(max + 1).padStart(4, "0");
}

/** The existing record id for this slug, anywhere in the store — or "". */
function existingRecord(archDir: string, slug: string): { id: string; file: string } | null {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^## (ADR-\\d+) — ${esc}\\s*$`, "m");
  for (const f of monthFiles(archDir)) {
    const m = readFileSync(f, "utf-8").match(re);
    if (m) return { id: m[1], file: f };
  }
  return null;
}

/* Insert a row into the markdown table that starts at/after `from`, rather than
   at end-of-file. Real index files carry prose AFTER their table, and appending
   puts the row outside it where nothing renders it as a row — the defect this
   helper exists to make unrepeatable. A "no records yet" placeholder is replaced
   rather than stacked under. Returns false when no table was found. */
function insertTableRow(lines: string[], from: number, row: string): boolean {
  const sep = lines.findIndex((l, i) => i >= from && /^\|[-\s|]+\|\s*$/.test(l));
  if (sep === -1) return false;
  let last = sep;
  while (last + 1 < lines.length && /^\|/.test(lines[last + 1])) last++;
  if (/_no records yet_/.test(lines[last])) lines.splice(last, 1, row);
  else lines.splice(last + 1, 0, row);
  return true;
}

const args = process.argv.slice(2);
const VALUE_FLAGS = ["--change-url", "--from", "--slug", "--domain", "--date"];
const flags: Record<string, string> = {};
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (VALUE_FLAGS.includes(args[i])) { flags[args[i]] = args[i + 1] ?? ""; i++; }
  else positional.push(args[i]);
}
const changeUrl = flags["--change-url"] ?? "";
const fromPath = flags["--from"] ?? "";
const sourceMode = fromPath !== "";
const domain = flags["--domain"] || "Uncategorised";
/* --date exists so the target month file is deterministic under test; without
   it the record lands in the month the promotion actually runs in. */
const date = flags["--date"] || new Date().toISOString().slice(0, 10);
/* Shape alone accepts impossible dates (2026-02-30, 2026-99-99) and would then
   derive a year/month directory from them. Round-trip through UTC: a real date
   normalises back to itself, an invalid one does not. */
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die(`invalid --date (want YYYY-MM-DD): ${date}`);
{
  // Invalid Date makes toISOString() THROW, so check the timestamp before formatting.
  const t = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== date) {
    die(`invalid --date (not a real calendar date): ${date}`);
  }
}
const year = date.slice(0, 4);
const month = date.slice(0, 7);

const [plansDir, archivedDirname] = positional;
const USAGE = "usage: promote-adr.ts <plans-dir> <archived-dirname> [--change-url <url>] [--domain <name>] [--date YYYY-MM-DD]\n" +
  "       promote-adr.ts <plans-dir> --from <file> --slug <slug> [...]";
if (!plansDir || (!sourceMode && !archivedDirname)) die(USAGE);
if (sourceMode && !flags["--slug"]) die("--from requires --slug");
if (!sourceMode && /(^|[/\\])\.\.([/\\]|$)/.test(archivedDirname)) die(`invalid archived dirname (path traversal): ${archivedDirname}`);

const archDir = join(plansDir, "architecture");
const yearDir = join(archDir, year);
const monthPath = join(yearDir, `${month}.md`);
const yearIndexPath = join(yearDir, "INDEX.md");
const masterPath = join(archDir, "DECISIONS.md");

let slug: string;
let designPath: string;
if (sourceMode) {
  slug = flags["--slug"];
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) die(`invalid slug (kebab-case only): ${slug}`);
  designPath = resolve(fromPath);
  if (!existsSync(designPath)) die(`source file not found: ${designPath}`);
} else {
  const archivedChangeDir = join(plansDir, "development", "openspec", "changes", "archive", archivedDirname);
  if (!existsSync(archivedChangeDir)) die(`archived change not found: ${archivedChangeDir}`);
  // slug = archive dirname minus the leading YYYY-MM-DD- date openspec adds
  slug = archivedDirname.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  designPath = join(archivedChangeDir, "design.md");
}

// 1. extract ONLY the Decisions section (+ short Context / Consequences pointers)
let decisions = "";
let context = "";
let consequences = "";
if (existsSync(designPath)) {
  const design = readFileSync(designPath, "utf-8");
  decisions = section(design, "Decisions");
  context = section(design, "Context").split("\n\n")[0]?.trim() ?? "";
  consequences = section(design, "Risks / Trade-offs");
}

const relDesign = sourceMode
  ? relative(yearDir, designPath)
  : `../../development/openspec/changes/archive/${archivedDirname}/design.md`;
const sourceLabel = `${sourceMode ? "full architecture" : "full design"}: [${basename(designPath)}]`;
const sourceLink = changeUrl
  ? `Change \`${slug}\` — [${changeUrl}](${changeUrl}) · ${sourceLabel}(${relDesign})`
  : `Change \`${slug}\` · ${sourceLabel}(${relDesign})`;

// Idempotent: if this slug already has a record anywhere, a re-run promotes nothing.
const existing = existingRecord(archDir, slug);

let adrId = existing?.id ?? "";
let wrote = false;
if (meaningful(decisions) && !existing) {
  adrId = `ADR-${nextAdrNumber(archDir)}`;
  /* Fields the source cannot supply are stated as absent rather than invented.
     A promoted record is a real ADR but a thin one — the options and the
     confidence lived in the deliberation, not in the design's Decisions. */
  const record = `## ${adrId} — ${slug}

- **Status:** Accepted
- **Date:** ${date}
- **Domain:** ${domain}
- **Confidence:** Medium — promoted from a design; confidence was not recorded at decision time
- **Supersedes:** None
- **Superseded by:** None

### Context

${meaningful(context) ? context : "See the source document below."}

### Options considered

Not captured in the source design's \`## Decisions\` section. Where alternatives were
weighed, they are in the linked document and in the deliberation.

### Decision

${decisions}

### Consequences

${meaningful(consequences) ? consequences : "Not recorded in the source document below."}

### Related

${sourceLink}
`;
  mkdirSync(yearDir, { recursive: true });
  const header = `# Architecture decisions — ${month}\n\nRecords in full. Append new records at the bottom; never edit an accepted one\nexcept to set its superseded pointer. Rules: [../DECISIONS.md](../DECISIONS.md).\n`;
  const prior = existsSync(monthPath) ? readFileSync(monthPath, "utf-8").replace(/\s*$/, "") : header;
  writeFileSync(monthPath, `${prior}\n\n---\n\n${record}`);
  wrote = true;

  // 2. year index row
  const yHeader = `# Architecture decisions — ${year}\n\nOne row per ADR, newest last. Detail lives in the monthly file.\n\n` +
    `| ADR | Date | Decision | Domain | Status | Confidence | Record |\n|-----|------|----------|--------|--------|------------|--------|\n`;
  const yRow = `| ${adrId} | ${date} | ${slug} | ${domain} | Accepted | Medium | [${month}.md](${month}.md) |`;
  /* Insert INSIDE the table, not at EOF. A real INDEX.md carries prose after
     its table ("## Months", "## Adding a row"); appending to the end puts the
     row below that prose where nothing renders it as a row. Find the table by
     its header separator, walk to the last contiguous `|` line, insert there. */
  const yLines = (existsSync(yearIndexPath) ? readFileSync(yearIndexPath, "utf-8") : yHeader).split("\n");
  if (!insertTableRow(yLines, 0, yRow)) yLines.push(yRow); // no table — append rather than lose it
  writeFileSync(yearIndexPath, yLines.join("\n").replace(/\s*$/, "") + "\n");

  // 3. master index line, filed under its domain
  const mHeader = `# Architecture Decisions — master index\n\nEvery ADR, grouped by domain. Rules and status values live here; other files\npoint at this one rather than restating them.\n`;
  let master = existsSync(masterPath) ? readFileSync(masterPath, "utf-8") : mHeader;
  const mRow = `| [${adrId}](${year}/${month}.md#${adrId.toLowerCase()}--${slug}) | ${slug} | Accepted | ${month} |`;
  const domainHeading = `### ${domain}`;
  if (master.includes(domainHeading)) {
    const mLines = master.split("\n");
    const at = mLines.findIndex((l) => l.trim() === domainHeading);
    if (insertTableRow(mLines, at, mRow)) master = mLines.join("\n");
    else master = `${master.replace(/\s*$/, "")}\n${mRow}\n`;
  } else {
    /* A new domain must land INSIDE "Decisions by domain", not at EOF. The
       master index ends with a "## Years" section, so appending puts the new
       `###` heading underneath it and markdown reads the domain as a child of
       Years. Insert before the first top-level `## ` that follows the domain
       sections; fall back to EOF only when there is none. */
    const block = `${domainHeading}\n\n| ADR | Decision | Status | Record |\n|-----|----------|--------|--------|\n${mRow}\n`;
    const mLines = master.split("\n");
    const lastDomain = mLines.reduce((acc, l, i) => (/^### /.test(l) ? i : acc), -1);
    const nextTop = mLines.findIndex((l, i) => i > lastDomain && /^## /.test(l));
    if (lastDomain !== -1 && nextTop !== -1) {
      mLines.splice(nextTop, 0, ...block.split("\n"));
      master = mLines.join("\n");
    } else {
      master = `${master.replace(/\s*$/, "")}\n\n${block}`;
    }
  }
  writeFileSync(masterPath, master);
}

const adrMsg = wrote
  ? `wrote ${adrId} to ${monthPath} (+ year index, + master index)`
  : existing
    ? `record already present (${existing.id} in ${basename(existing.file)}) — skipped`
    : "no ## Decisions — no ADR promoted";
console.log(`promote-adr: ${adrMsg}`);
