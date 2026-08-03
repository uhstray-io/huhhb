/* Offline check for the ADR promotion helper (skills/openspec-conformance).
   Run: node --test tests/test_openspec_conformance.test.ts

   Promotion targets the repo-memory ADR store (ADR-0003): records append into
   plans/architecture/YYYY/YYYY-MM.md, with a row in that year's INDEX.md and a
   line in DECISIONS.md. Numbering is ADR-NNNN, globally sequential across every
   month and never reused. Guards: one record + one index row, no duplicate on
   re-run, and the no-Decisions path promotes nothing. Node stdlib only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "skills", "openspec-conformance", "promote-adr.ts");
const DATE = "2026-08-15"; // pinned so the target month file is deterministic
const MONTH = join("2026", "2026-08.md");
const YEAR_INDEX = join("2026", "INDEX.md");

const read = (root: string, ...p: string[]) => readFileSync(join(root, "plans", "architecture", ...p), "utf-8");
const monthOf = (root: string) => read(root, MONTH);

function scaffold(designBody: string): string {
  const root = mkdtempSync(join(tmpdir(), "opsx-"));
  const archived = join(root, "plans", "development", "openspec", "changes", "archive", "2026-07-15-add-widget");
  mkdirSync(archived, { recursive: true });
  mkdirSync(join(root, "plans", "architecture"), { recursive: true });
  writeFileSync(join(archived, "design.md"), designBody);
  writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"),
    "# idx\n\n| Change | Title | Status | Owner | Links |\n|--|--|--|--|--|\n" +
    "| add-widget | W | in-review | @j | [tasks](t) |\n");
  return root;
}

const run = (root: string, ...extra: string[]) =>
  execFileSync("node", [SCRIPT, join(root, "plans"), ...extra, "--date", DATE], { encoding: "utf-8" });

const WITH_DECISIONS = `## Context

Panels duplicate refresh logic.

## Decisions

- **Declarative config.** Config object over imperative API.

## Risks / Trade-offs

- [Many timers] → one scheduler later.

## Migration Plan

Flag off to roll back.
`;

test("promotes one record into the month file and wires both indexes", () => {
  const root = scaffold(WITH_DECISIONS);
  run(root, "2026-07-15-add-widget");

  const month = monthOf(root);
  assert.match(month, /^## ADR-0001 — add-widget$/m, "record headed ADR-NNNN — slug");
  assert.match(month, /Declarative config/, "carries the Decisions content");
  assert.doesNotMatch(month, /Migration Plan/, "does NOT copy the full design doc");
  assert.match(month, /design\.md\)/, "links back to the source design");
  assert.match(month, /\*\*Status:\*\*/, "uses the template's field block");

  assert.match(read(root, YEAR_INDEX), /\|\s*ADR-0001\s*\|/, "year index has a row");
  assert.match(read(root, "DECISIONS.md"), /ADR-0001/, "master index references it");

  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  assert.equal(idx.split("\n").filter((l) => /\|\s*archived\s*\|/.test(l)).length, 1, "exactly one row flipped");
  assert.match(idx, /ADR-0001/, "implementation-plan row links the ADR");
});

test("re-running is idempotent — no duplicate record, no double-appended rows", () => {
  const root = scaffold(WITH_DECISIONS);
  run(root, "2026-07-15-add-widget");
  run(root, "2026-07-15-add-widget");

  assert.equal(monthOf(root).match(/^## ADR-/gm)?.length, 1, "still exactly one record");
  assert.equal(read(root, YEAR_INDEX).match(/\|\s*ADR-0001\s*\|/g)?.length, 1, "year index row written once");
  assert.equal(read(root, "DECISIONS.md").match(/ADR-0001/g)?.length, 1, "master index line written once");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  assert.equal(idx.match(/ADR-0001/g)?.length, 1, "ADR link appended exactly once");
});

test("numbering is global across months, not per-file", () => {
  const root = scaffold(WITH_DECISIONS);
  // a record already exists in an EARLIER month — the next number must be 0008
  mkdirSync(join(root, "plans", "architecture", "2026"), { recursive: true });
  writeFileSync(join(root, "plans", "architecture", "2026", "2026-05.md"),
    "# 2026-05\n\n## ADR-0007 — something-else\n\n- **Status:** Accepted\n");
  run(root, "2026-07-15-add-widget");

  assert.match(monthOf(root), /^## ADR-0008 — add-widget$/m, "continues from the highest number anywhere");
  assert.doesNotMatch(monthOf(root), /ADR-0007/, "does not reuse or move the earlier record");
});

test("no ## Decisions section promotes nothing but still flips the index row", () => {
  const root = scaffold("## Context\n\nTrivial doc-only change.\n");
  run(root, "2026-07-15-add-widget");
  assert.equal(existsSync(join(root, "plans", "architecture", MONTH)), false, "no month file created");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  assert.match(idx, /\|\s*archived\s*\|/, "index row still flipped");
});

test("exact-slug match: an existing add-widget record does not block promoting 'widget'", () => {
  const root = mkdtempSync(join(tmpdir(), "opsx-"));
  mkdirSync(join(root, "plans", "architecture", "2026"), { recursive: true });
  writeFileSync(join(root, "plans", "architecture", "2026", "2026-08.md"),
    "# 2026-08\n\n## ADR-0001 — add-widget\n\n- **Status:** Accepted\n");
  const changeDir = join(root, "plans", "development", "openspec", "changes", "archive", "2026-07-16-widget");
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, "design.md"), WITH_DECISIONS);
  writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"),
    "# idx\n\n| Change | Title | Status | Owner | Links |\n|--|--|--|--|--|\n" +
    "| add-widget | W | archived | @j | [ADR-0001](../architecture/2026/2026-08.md) |\n" +
    "| widget | Wid | in-review | @j | [tasks](t) |\n");

  run(root, "2026-07-16-widget");

  const month = monthOf(root);
  assert.match(month, /^## ADR-0001 — add-widget$/m, "the unrelated record survives");
  assert.match(month, /^## ADR-0002 — widget$/m, "widget gets its own new record");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  const widgetRow = idx.split("\n").find((l) => /^\|\s*widget\s*\|/.test(l)) ?? "";
  assert.match(widgetRow, /archived/, "the widget row flipped");
  assert.match(widgetRow, /ADR-0002/, "widget row links its own record");
  assert.equal(idx.split("\n").find((l) => /^\|\s*add-widget\s*\|/.test(l)),
    "| add-widget | W | archived | @j | [ADR-0001](../architecture/2026/2026-08.md) |",
    "the unrelated add-widget row is untouched");
});

/* Source-file mode (inception promotion): promotes ## Decisions from an
   arbitrary file (plans/product/<slug>/architecture.md), no implementation
   plan involved. */
function scaffoldProduct(archBody: string): string {
  const root = mkdtempSync(join(tmpdir(), "opsx-"));
  const productDir = join(root, "plans", "product", "acme-app");
  mkdirSync(productDir, { recursive: true });
  mkdirSync(join(root, "plans", "architecture"), { recursive: true });
  writeFileSync(join(productDir, "architecture.md"), archBody);
  return root;
}

const ARCH_WITH_DECISIONS = `## Design Paradigm

Modular monolith.

## Decisions

- **AD-1: Postgres over SQLite.** Concurrency needs it.

## Deferred

- Sharding.
`;

test("source-file mode promotes one record and never touches the implementation plan", () => {
  const root = scaffoldProduct(ARCH_WITH_DECISIONS);
  mkdirSync(join(root, "plans", "development"), { recursive: true });
  writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "untouched-sentinel");
  run(root, "--from", join(root, "plans", "product", "acme-app", "architecture.md"), "--slug", "acme-app");

  const month = monthOf(root);
  assert.match(month, /^## ADR-0001 — acme-app$/m, "exactly one record");
  assert.match(month, /AD-1: Postgres over SQLite/, "carries the Decisions content");
  assert.doesNotMatch(month, /Deferred/, "does NOT copy the full architecture doc");
  assert.match(month, /architecture\.md\)/, "links back to the source file");
  assert.equal(readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8"),
    "untouched-sentinel", "implementation plan is not modified in source-file mode");
});

test("source-file mode re-run is idempotent", () => {
  const root = scaffoldProduct(ARCH_WITH_DECISIONS);
  const go = () => run(root, "--from", join(root, "plans", "product", "acme-app", "architecture.md"), "--slug", "acme-app");
  go();
  go();
  assert.equal(monthOf(root).match(/^## ADR-/gm)?.length, 1, "still exactly one record");
});

test("source-file mode with no ## Decisions promotes nothing and exits 0", () => {
  const root = scaffoldProduct("## Design Paradigm\n\nNothing durable yet.\n");
  const out = run(root, "--from", join(root, "plans", "product", "acme-app", "architecture.md"), "--slug", "acme-app");
  assert.equal(existsSync(join(root, "plans", "architecture", MONTH)), false, "no month file");
  assert.match(out, /no ## Decisions/, "reports why nothing promoted");
});

test("year-index row lands INSIDE the table, not after trailing prose", () => {
  /* Regression: the real INDEX.md has prose AFTER its table ("## Months",
     "## Adding a row"). Appending at EOF put the row below that prose, outside
     the table, where nothing renders it as a row. A fresh-dir test cannot catch
     this because there the table IS last. */
  const root = scaffold(WITH_DECISIONS);
  const yDir = join(root, "plans", "architecture", "2026");
  mkdirSync(yDir, { recursive: true });
  // the record is the source of truth for numbering, so seed it too
  writeFileSync(join(yDir, "2026-01.md"), "# 2026-01\n\n## ADR-0003 — earlier\n\n- **Status:** Accepted\n");
  writeFileSync(join(yDir, "INDEX.md"),
    "# Architecture decisions — 2026\n\n" +
    "| ADR | Date | Decision | Domain | Status | Confidence | Record |\n" +
    "|-----|------|----------|--------|--------|------------|--------|\n" +
    "| ADR-0003 | 2026-01-02 | earlier | D | Accepted | High | [2026-01.md](2026-01.md) |\n\n" +
    "## Adding a row\n\nSome trailing prose that must stay last.\n");
  run(root, "2026-07-15-add-widget");

  const lines = read(root, YEAR_INDEX).split("\n");
  const newRow = lines.findIndex((l) => /^\|\s*ADR-0004\s*\|/.test(l));
  const prose = lines.findIndex((l) => /^## Adding a row/.test(l));
  assert.notEqual(newRow, -1, "the new row exists");
  assert.ok(newRow < prose, `row must precede the trailing prose (row ${newRow}, prose ${prose})`);
  assert.match(lines[newRow - 1] ?? "", /^\|/, "row sits directly after another table row");
});

test("--domain files the record under the named domain in DECISIONS.md", () => {
  const root = scaffold(WITH_DECISIONS);
  run(root, "2026-07-15-add-widget", "--domain", "Tooling and CI");
  const master = read(root, "DECISIONS.md");
  const section = master.split(/^### /m).find((s) => s.startsWith("Tooling and CI")) ?? "";
  assert.match(section, /ADR-0001/, "record filed under the requested domain");
});
