/* Offline check for the ADR promotion helper (skills/openspec-conformance).
   Run: node --test tests/test_openspec_conformance.test.ts
   Guards the criterion-3 contract: one ADR + one index row, no dup, and the
   no-Decisions path promotes zero ADRs. Node stdlib only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "skills", "openspec-conformance", "promote-adr.ts");

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

const WITH_DECISIONS = `## Context

Panels duplicate refresh logic.

## Decisions

- **Declarative config.** Config object over imperative API.

## Risks / Trade-offs

- [Many timers] → one scheduler later.

## Migration Plan

Flag off to roll back.
`;

test("promotes exactly one ADR and updates exactly one index row", () => {
  const root = scaffold(WITH_DECISIONS);
  execFileSync("node", [SCRIPT, join(root, "plans"), "2026-07-15-add-widget"], { encoding: "utf-8" });

  const adrs = readdirSync(join(root, "plans", "architecture"));
  assert.deepEqual(adrs, ["001-add-widget.md"], "exactly one ADR");

  const adr = readFileSync(join(root, "plans", "architecture", "001-add-widget.md"), "utf-8");
  assert.match(adr, /Declarative config/, "carries the Decisions content");
  assert.doesNotMatch(adr, /Migration Plan/, "does NOT copy the full design doc");
  assert.match(adr, /design\.md\)/, "links back to the source design");

  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  const archivedRows = idx.split("\n").filter((l) => /\|\s*archived\s*\|/.test(l));
  assert.equal(archivedRows.length, 1, "exactly one row flipped to archived");
  assert.match(idx, /ADR 001/, "index links the ADR");
});

test("re-running is idempotent — no duplicate ADR, no double-appended link", () => {
  const root = scaffold(WITH_DECISIONS);
  const run = () => execFileSync("node", [SCRIPT, join(root, "plans"), "2026-07-15-add-widget"], { encoding: "utf-8" });
  run();
  run(); // second run must be a no-op
  assert.deepEqual(readdirSync(join(root, "plans", "architecture")), ["001-add-widget.md"], "still exactly one ADR");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  assert.equal(idx.match(/ADR 001/g)?.length, 1, "ADR link appended exactly once");
});

test("no ## Decisions section promotes zero ADRs but still updates the index", () => {
  const root = scaffold("## Context\n\nTrivial doc-only change.\n");
  execFileSync("node", [SCRIPT, join(root, "plans"), "2026-07-15-add-widget"], { encoding: "utf-8" });
  assert.equal(readdirSync(join(root, "plans", "architecture")).length, 0, "no ADR");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  assert.match(idx, /\|\s*archived\s*\|/, "index row still flipped");
});

/* Source-file mode (inception promotion): promotes ## Decisions from an
   arbitrary file (plans/product/<slug>/architecture.md), no index involved. */
function scaffoldProduct(archBody: string, withIndex = false): string {
  const root = mkdtempSync(join(tmpdir(), "opsx-"));
  const productDir = join(root, "plans", "product", "acme-app");
  mkdirSync(productDir, { recursive: true });
  mkdirSync(join(root, "plans", "architecture"), { recursive: true });
  writeFileSync(join(productDir, "architecture.md"), archBody);
  if (withIndex) {
    writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "placeholder");
    mkdirSync(join(root, "plans", "development"), { recursive: true });
  }
  return root;
}

const ARCH_WITH_DECISIONS = `## Design Paradigm

Modular monolith.

## Decisions

- **AD-1: Postgres over SQLite.** Concurrency needs it.

## Deferred

- Sharding.
`;

test("source-file mode promotes one ADR from architecture.md and never touches the index", () => {
  const root = scaffoldProduct(ARCH_WITH_DECISIONS);
  mkdirSync(join(root, "plans", "development"), { recursive: true });
  writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "untouched-sentinel");
  execFileSync("node", [SCRIPT, join(root, "plans"),
    "--from", join(root, "plans", "product", "acme-app", "architecture.md"),
    "--slug", "acme-app"], { encoding: "utf-8" });

  assert.deepEqual(readdirSync(join(root, "plans", "architecture")), ["001-acme-app.md"], "exactly one ADR");
  const adr = readFileSync(join(root, "plans", "architecture", "001-acme-app.md"), "utf-8");
  assert.match(adr, /AD-1: Postgres over SQLite/, "carries the Decisions content");
  assert.doesNotMatch(adr, /Deferred/, "does NOT copy the full architecture doc");
  assert.match(adr, /architecture\.md\)/, "links back to the source file");
  assert.equal(readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8"),
    "untouched-sentinel", "index file is not modified in source-file mode");
});

test("source-file mode re-run is idempotent", () => {
  const root = scaffoldProduct(ARCH_WITH_DECISIONS);
  const run = () => execFileSync("node", [SCRIPT, join(root, "plans"),
    "--from", join(root, "plans", "product", "acme-app", "architecture.md"),
    "--slug", "acme-app"], { encoding: "utf-8" });
  run();
  run();
  assert.deepEqual(readdirSync(join(root, "plans", "architecture")), ["001-acme-app.md"], "still exactly one ADR");
});

test("source-file mode with no ## Decisions promotes nothing and exits 0, even with no index file", () => {
  const root = scaffoldProduct("## Design Paradigm\n\nNothing durable yet.\n");
  const out = execFileSync("node", [SCRIPT, join(root, "plans"),
    "--from", join(root, "plans", "product", "acme-app", "architecture.md"),
    "--slug", "acme-app"], { encoding: "utf-8" }); // throws if exit != 0
  assert.equal(readdirSync(join(root, "plans", "architecture")).length, 0, "no ADR");
  assert.match(out, /no ## Decisions/, "reports why nothing promoted");
});

test("exact-slug match: an existing '001-add-widget.md' does not block promoting slug 'widget'", () => {
  // Regression for the suffix-match bug: endsWith('-widget.md') would treat the
  // unrelated add-widget ADR as widget's own → widget's ADR never written and
  // its index row mislinked. Exact slug match must distinguish the two.
  const root = mkdtempSync(join(tmpdir(), "opsx-"));
  const arch = join(root, "plans", "architecture");
  mkdirSync(arch, { recursive: true });
  writeFileSync(join(arch, "001-add-widget.md"), "# 1. add-widget\n"); // a DIFFERENT change's ADR
  const changeDir = join(root, "plans", "development", "openspec", "changes", "archive", "2026-07-16-widget");
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, "design.md"), WITH_DECISIONS);
  writeFileSync(join(root, "plans", "development", "00-implementation-plan.md"),
    "# idx\n\n| Change | Title | Status | Owner | Links |\n|--|--|--|--|--|\n" +
    "| add-widget | W | archived | @j | [ADR 001](../architecture/001-add-widget.md) |\n" +
    "| widget | Wid | in-review | @j | [tasks](t) |\n");

  execFileSync("node", [SCRIPT, join(root, "plans"), "2026-07-16-widget"], { encoding: "utf-8" });

  assert.deepEqual(readdirSync(arch).sort(), ["001-add-widget.md", "002-widget.md"],
    "widget gets its own new ADR (002), not mislinked to the add-widget ADR");
  const idx = readFileSync(join(root, "plans", "development", "00-implementation-plan.md"), "utf-8");
  const widgetRow = idx.split("\n").find((l) => /^\|\s*widget\s*\|/.test(l)) ?? "";
  assert.match(widgetRow, /archived/, "the widget row (not add-widget) flipped to archived");
  assert.match(widgetRow, /ADR 002/, "widget row links its own ADR 002");
  const addWidgetRow = idx.split("\n").find((l) => /^\|\s*add-widget\s*\|/.test(l)) ?? "";
  assert.equal(addWidgetRow,
    "| add-widget | W | archived | @j | [ADR 001](../architecture/001-add-widget.md) |",
    "the unrelated add-widget row is left untouched");
});
