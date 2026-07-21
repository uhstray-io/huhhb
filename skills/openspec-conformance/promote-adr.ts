#!/usr/bin/env node
/* openspec-conformance — ADR promotion (Path 3).

Run at archive time (pr-shepherd post-merge close-out). Given a repo's plans/
dir and the dated archive dirname that `openspec archive` printed, it:

  1. extracts ONLY the archived design.md "## Decisions" section (the durable
     architecture record — never the whole design doc),
  2. writes exactly one plans/architecture/NNN-<slug>.md ADR (next number),
  3. flips that change's row in plans/development/00-implementation-plan.md to
     `archived` and links the ADR — exactly one row touched.

A design with no "## Decisions" section promotes NO ADR (not every change earns
one) but still updates the index row. Node stdlib only; no deps.

    node promote-adr.ts <plans-dir> <archived-dirname> [--change-url <url>]

Source-file mode (inception promotion — openspec-conformance "Inception
promotion"): promote the ## Decisions section of an arbitrary file (e.g.
plans/product/<slug>/architecture.md), same extraction/numbering/idempotency,
NO index involvement (there is no change row at inception time):

    node promote-adr.ts <plans-dir> --from <file> --slug <slug> [--change-url <url>]

Exit 0 on success (prints what it did), 1 on a usage/precondition error.
*/
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

function nextAdrNumber(archDir: string): string {
  let max = 0;
  if (existsSync(archDir)) {
    for (const f of readdirSync(archDir)) {
      const m = f.match(/^(\d+)-.*\.md$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return String(max + 1).padStart(3, "0");
}

const args = process.argv.slice(2);
const VALUE_FLAGS = ["--change-url", "--from", "--slug"];
const flags: Record<string, string> = {};
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (VALUE_FLAGS.includes(args[i])) { flags[args[i]] = args[i + 1] ?? ""; i++; }
  else positional.push(args[i]);
}
const changeUrl = flags["--change-url"] ?? "";
const fromPath = flags["--from"] ?? "";
const sourceMode = fromPath !== "";
const [plansDir, archivedDirname] = positional;
const USAGE = "usage: promote-adr.ts <plans-dir> <archived-dirname> [--change-url <url>]\n" +
  "       promote-adr.ts <plans-dir> --from <file> --slug <slug> [--change-url <url>]";
if (!plansDir || (!sourceMode && !archivedDirname)) die(USAGE);
if (sourceMode && !flags["--slug"]) die("--from requires --slug");
if (!sourceMode && /(^|[/\\])\.\.([/\\]|$)/.test(archivedDirname)) die(`invalid archived dirname (path traversal): ${archivedDirname}`);

const archDir = join(plansDir, "architecture");
const indexPath = join(plansDir, "development", "00-implementation-plan.md");

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
  ? relative(archDir, designPath)
  : `../development/openspec/changes/archive/${archivedDirname}/design.md`;
const sourceLabel = sourceMode ? "full architecture: [architecture.md]" : "full design: [design.md]";
const sourceLink = changeUrl
  ? `Change \`${slug}\` — [${changeUrl}](${changeUrl}) · ${sourceLabel}(${relDesign})`
  : `Change \`${slug}\` · ${sourceLabel}(${relDesign})`;

// Idempotent: if this slug already has an ADR, a re-run promotes nothing new.
const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const adrFilePattern = new RegExp(`^\\d+-${escapedSlug}\\.md$`);
const existingAdrFile = existsSync(archDir)
  ? readdirSync(archDir).find((f) => adrFilePattern.test(f))
  : undefined;

let adrWritten = "";
if (meaningful(decisions) && !existingAdrFile) {
  const num = nextAdrNumber(archDir);
  const adrPath = join(archDir, `${num}-${slug}.md`);
  const adr = `# ${num}. ${slug}

_Status: accepted — ${sourceMode ? "promoted on architecture approval (inception)" : "promoted on archive"}._

## Context

${meaningful(context) ? context : "See the source change below."}

## Decision

${decisions}

## Consequences

${meaningful(consequences) ? consequences : "See the source document below."}

## Source

${sourceLink}
`;
  mkdirSync(archDir, { recursive: true });
  writeFileSync(adrPath, adr);
  adrWritten = adrPath;
}

// 3. flip exactly the one index row for this slug → archived, link the ADR.
// The 5-column table splits into 7 cells (empty leading + trailing edges):
// ['', Change, Title, Status, Owner, Links, ''].
const adrBase = adrWritten ? (adrWritten.split("/").pop() ?? "") : (existingAdrFile ?? "");
const adrLink = adrBase
  ? `[ADR ${adrBase.match(/^(\d+)-/)?.[1] ?? ""}](../architecture/${adrBase})`
  : "";
let rowUpdated = false;
let rowFound = false;
if (!sourceMode && existsSync(indexPath)) {
  const lines = readFileSync(indexPath, "utf-8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split("|").map((c) => c.trim());
    if (cells.length >= 6 && cells[1] === slug) {
      rowFound = true;
      if (cells[3] === "archived") break; // already promoted — idempotent no-op
      cells[3] = "archived"; // Status
      if (adrLink && !cells[5].includes(adrLink)) {
        cells[5] = cells[5] ? `${cells[5]} · ${adrLink}` : adrLink; // Links
      }
      lines[i] = `| ${cells.slice(1, cells.length - 1).join(" | ")} |`;
      rowUpdated = true;
      break;
    }
  }
  if (rowUpdated) writeFileSync(indexPath, lines.join("\n"));
}

const adrMsg = adrWritten
  ? `wrote ${adrWritten}`
  : existingAdrFile
    ? `ADR already present (${existingAdrFile}) — skipped`
    : "no ## Decisions — no ADR promoted";
const rowMsg = rowUpdated
  ? "updated → archived"
  : rowFound
    ? "already archived — no change"
    : "NOT found";
console.log(`promote-adr: ${adrMsg}`);
if (sourceMode) {
  // Inception promotion: no change row exists yet, the index is not this
  // mode's concern — report and exit clean.
  console.log(`promote-adr: source-file mode — index untouched`);
  process.exit(0);
}
console.log(`promote-adr: index row for '${slug}' ${rowMsg}`);
if (!rowFound) {
  // A missing row means archive would complete without the status flip —
  // fail loudly so the caller (pr-shepherd close-out) surfaces it instead
  // of reporting a clean archive.
  console.error(
    `promote-adr: FAIL — no index row for '${slug}' in 00-implementation-plan.md; add the row (see openspec-conformance "Index writers") and re-run`,
  );
  process.exit(1);
}
