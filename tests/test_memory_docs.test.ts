/* Offline checks for the memory-model docs added/changed in this PR:
   .claude/memory/MEMORY.md, .claude/memory/project-buhhdy-memory-model.md,
   AGENTS.md, CLAUDE.md.

   Mirrors the frontmatter-parsing approach in scripts/skill-lint.ts (S1-S8)
   but applied to repo-memory files and the two top-level agent-instruction
   docs, per the schema documented in skills/repo-memory/SKILL.md.

   Run: node --test tests/test_memory_docs.test.ts
   Node stdlib only, no network. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEMORY_DIR = join(REPO, ".claude", "memory");
const MEMORY_INDEX = join(MEMORY_DIR, "MEMORY.md");
const BUHHDY_MODEL_FILE = join(MEMORY_DIR, "project-buhhdy-memory-model.md");
const AGENTS_FILE = join(REPO, "AGENTS.md");
const CLAUDE_FILE = join(REPO, "CLAUDE.md");

/* str.split(sep, maxsplit) semantics — same helper skill-lint.ts uses so
   the frontmatter split behaves identically for these memory files. */
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

/** Parses `---\n<frontmatter>\n---\n<body>` -> top-level keys, raw fm text, body. */
function parseFrontmatter(text: string): { keys: string[] | null; fm: string; body: string } {
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

/** Extracts a scalar value nested one level under a top-level `key:` block. */
function nestedValue(fm: string, block: string, key: string): string | null {
  const blockMatch = fm.match(new RegExp(`^${block}:\\s*\\n((?:[ \\t]+\\S.*\\n?)+)`, "m"));
  if (!blockMatch) return null;
  const line = blockMatch[1].match(new RegExp(`^[ \\t]+${key}:\\s*(\\S.*)$`, "m"));
  return line ? line[1].trim() : null;
}

function charLen(s: string): number {
  return Array.from(s).length;
}

const memoryFiles = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");

describe(".claude/memory/MEMORY.md (index)", () => {
  const text = readFileSync(MEMORY_INDEX, "utf-8");
  const lines = text.split(/\r\n|\r|\n/);

  test("starts with the Memory Index heading", () => {
    assert.match(text, /^# Memory Index/);
  });

  test("stays under 200 lines (it loads every session)", () => {
    assert.ok(lines.length < 200, `MEMORY.md is ${lines.length} lines, want < 200`);
  });

  test("every markdown link resolves to a file that exists in .claude/memory/", () => {
    const links = Array.from(text.matchAll(/\]\(([^)]+)\)/g), (m) => m[1]);
    assert.ok(links.length > 0, "expected at least one entry link");
    for (const link of links) {
      assert.ok(existsSync(join(MEMORY_DIR, link)), `dangling link target: ${link}`);
    }
  });

  test("every memory file in .claude/memory/ (except MEMORY.md itself) is indexed", () => {
    for (const file of memoryFiles) {
      assert.match(text, new RegExp(`\\]\\(${file.replace(/\./g, "\\.")}\\)`),
        `${file} is not referenced from MEMORY.md`);
    }
  });

  test("includes exactly one entry for the new buhhdy memory model file", () => {
    const matches = lines.filter((l) => l.includes("project-buhhdy-memory-model.md"));
    assert.equal(matches.length, 1, "expected exactly one MEMORY.md line for the new file");
  });

  test("the buhhdy memory model entry summarizes the tier hierarchy and path-separation rule", () => {
    const entry = lines.find((l) => l.includes("project-buhhdy-memory-model.md")) ?? "";
    assert.match(entry, /\[buhhdy memory model\]\(project-buhhdy-memory-model\.md\)/);
    assert.match(entry, /user \(MemPalace\)/);
    assert.match(entry, /team \(Honcho\)/);
    assert.match(entry, /repo-memory in \.claude\/memory\/ only/);
    assert.match(entry, /buhhdy\/memory retired/);
  });
});

describe(".claude/memory/project-buhhdy-memory-model.md (new memory file)", () => {
  const text = readFileSync(BUHHDY_MODEL_FILE, "utf-8");
  const { keys, fm, body } = parseFrontmatter(text);

  test("has parseable frontmatter", () => {
    assert.notEqual(keys, null, "no parseable frontmatter block");
  });

  test("frontmatter has exactly [name, description, metadata] at top level", () => {
    assert.deepEqual(keys, ["name", "description", "metadata"]);
  });

  test("frontmatter name matches the file's slug", () => {
    const nameMatch = fm.match(/^name:\s*(\S+)/m);
    assert.ok(nameMatch, "no name: field");
    assert.equal(nameMatch![1], "project-buhhdy-memory-model");
  });

  test("metadata.node_type is 'memory'", () => {
    assert.equal(nestedValue(fm, "metadata", "node_type"), "memory");
  });

  test("metadata.type is one of the four repo-memory types", () => {
    const type = nestedValue(fm, "metadata", "type");
    assert.ok(type, "no metadata.type field");
    assert.ok(["project", "feedback", "reference", "user"].includes(type!),
      `unexpected metadata.type: ${type}`);
    assert.equal(type, "project");
  });

  test("frontmatter has no unsupported 'triggers' field", () => {
    assert.ok(!(keys ?? []).includes("triggers"));
  });

  test("description length is within the repo-wide 30-500 char lint window", () => {
    const descMatch = fm.match(/^description:\s*(.+(?:\n[ \t]+.+)*)/m);
    assert.ok(descMatch, "no description: field");
    const len = charLen(descMatch![1]);
    assert.ok(len >= 30 && len <= 500, `description length ${len} out of [30, 500]`);
  });

  test("documents all three memory tiers in precedence order", () => {
    const userIdx = body.indexOf("**user memory**");
    const teamIdx = body.indexOf("**team memory**");
    const configIdx = body.indexOf("**buhhdy config defaults");
    assert.ok(userIdx !== -1 && teamIdx !== -1 && configIdx !== -1, "missing a tier heading");
    assert.ok(userIdx < teamIdx && teamIdx < configIdx, "tiers are not in precedence order");
  });

  test("states the hard path-separation rule for .claude/memory/ vs plans/", () => {
    assert.match(body, /\*\*Path separation \(hard rule\):\*\*/);
    assert.match(body, /repo memory lives in `\.claude\/memory\/` ONLY/);
    assert.match(body, /no memory of any kind is ever written under `plans\/`/);
  });

  test("records retirement of the bespoke buhhdy/memory store", () => {
    assert.match(body, /bespoke `buhhdy\/memory\/` store was retired/);
    assert.match(body, /`repo-kickstart` is idempotent and registry-free/);
  });

  test("has no dangling relative markdown links", () => {
    const prose = body.replace(/```[\s\S]*?```/g, "");
    for (const m of prose.matchAll(/\]\((?!http|#|mailto)([^)\s]+)\)/g)) {
      const link = m[1];
      const target = resolve(dirname(BUHHDY_MODEL_FILE), link.split(":")[0]);
      const alt = resolve(REPO, link.split(":")[0]);
      assert.ok(existsSync(target) || existsSync(alt), `broken relative link: ${link}`);
    }
  });
});

describe("AGENTS.md", () => {
  const text = readFileSync(AGENTS_FILE, "utf-8");

  test("declares itself the canonical agent-instructions file and names CLAUDE.md", () => {
    assert.match(text, /single agent-instructions file/);
    assert.match(text, /Claude Code additionally reads `CLAUDE\.md`/);
  });

  test("has a Key Files section", () => {
    assert.match(text, /^## Key Files$/m);
  });

  test("every path documented by a Key Files bullet exists in the repo", () => {
    // Each bullet is "- `path`[, `path2`...] — description". Only the
    // backticked paths *before* the em dash are the documented file/dir
    // itself; backticked words after it are incidental prose references
    // (e.g. "must match `plugin.json` mcpServers") and are not checked.
    const section = text.split(/^## Key Files$/m)[1]?.split(/^## /m)[0] ?? "";
    const bulletLines = section.split(/\r\n|\r|\n/).filter((l) => l.startsWith("- `"));
    assert.ok(bulletLines.length > 5, "expected several Key Files bullets");
    let checked = 0;
    for (const line of bulletLines) {
      const prefix = line.split(" — ")[0];
      for (const m of prefix.matchAll(/`([\w./-]+)`/g)) {
        const p = m[1].replace(/\/$/, "");
        assert.ok(existsSync(join(REPO, p)), `Key Files references a path that does not exist: ${p}`);
        checked++;
      }
    }
    assert.ok(checked > 5, "expected several paths to be checked");
  });

  test("Key Files calls out CLAUDE.md as a pointer, AGENTS.md as canonical", () => {
    assert.match(text, /`CLAUDE\.md` — a one-line pointer to this file \(AGENTS\.md is canonical\)/);
  });

  test("has a Marketplace Manifest section with a valid JSON example", () => {
    const section = text.split(/^## Marketplace Manifest/m)[1] ?? "";
    const jsonBlock = section.match(/```json\n([\s\S]*?)```/);
    assert.ok(jsonBlock, "no fenced json block under Marketplace Manifest");
    const parsed = JSON.parse(jsonBlock![1]);
    assert.equal(parsed.name, "huhhb");
    assert.equal(parsed.publisher, "uhstray-io");
    assert.ok(Array.isArray(parsed.skills) && parsed.skills.length === 1);
    const entry = parsed.skills[0];
    for (const field of ["name", "path", "description", "category", "tags", "version"]) {
      assert.ok(field in entry, `example skill entry is missing '${field}'`);
    }
  });

  test("the example skill-entry fields match the real marketplace.json schema", () => {
    const marketplace = JSON.parse(readFileSync(join(REPO, "marketplace.json"), "utf-8"));
    const section = text.split(/^## Marketplace Manifest/m)[1] ?? "";
    const jsonBlock = section.match(/```json\n([\s\S]*?)```/)![1];
    const exampleKeys = Object.keys(JSON.parse(jsonBlock).skills[0]).sort();
    const realKeys = Object.keys(marketplace.skills[0]).sort();
    assert.deepEqual(exampleKeys, realKeys,
      "AGENTS.md's example skill entry has drifted from the real marketplace.json shape");
  });

  test("has an Onboarding section referencing files that exist", () => {
    assert.match(text, /^## Onboarding$/m);
    assert.match(text, /`onboarding\/welcome\.md`/);
    assert.match(text, /`onboarding\/skills-list\.md`/);
    assert.ok(existsSync(join(REPO, "onboarding", "welcome.md")));
    assert.ok(existsSync(join(REPO, "onboarding", "skills-list.md")));
  });

  /* Repo-memory was repurposed as the ADR store (ADR-0004, 2026-08-02): the typed
     record table (project/feedback/reference/user in .claude/memory/) is retired, and
     the section now routes each kind of fact to the store that owns it. Asserting the
     routing rather than the old types. */
  test("Repo Memory section routes each fact kind to its owning store", () => {
    const section = text.split(/^## Repo Memory$/m)[1]?.split(/^## /m)[0] ?? "";
    assert.match(section, /\| What \| Where \|/);
    assert.match(section, /plans\/architecture\//, "ADRs must name plans/architecture/");
    assert.match(section, /Hindsight bank/, "deliberation must route to the Hindsight bank");
    assert.match(section, /code graph/, "structure must route to the code graph");
    assert.match(section, /architecturally significant/,
      "the section must state the bar for recording a decision");
  });

  test("What NOT to save references AGENTS.md, not CLAUDE.md", () => {
    const section = text.split(/^## Repo Memory$/m)[1]?.split(/^## /m)[0] ?? "";
    assert.match(section, /Anything already in AGENTS\.md/);
    assert.doesNotMatch(section, /Anything already in this CLAUDE\.md/);
  });

  test("references the repo-memory skill for save/retrieve", () => {
    assert.match(text, /saved\/retrieved via the `\/repo-memory`\s+skill/);
  });
});

describe("CLAUDE.md", () => {
  const text = readFileSync(CLAUDE_FILE, "utf-8");

  test("is a short one-line pointer to AGENTS.md", () => {
    const body = text.replace(/^# CLAUDE\.md\s*/, "").trim();
    assert.ok(charLen(body) < 400, `CLAUDE.md body is ${charLen(body)} chars, expected a short pointer`);
  });

  test("links to AGENTS.md and that target exists", () => {
    assert.match(text, /\[AGENTS\.md\]\(AGENTS\.md\)/);
    assert.ok(existsSync(AGENTS_FILE));
  });

  test("no longer duplicates content that now lives only in AGENTS.md", () => {
    for (const heading of [
      "## Skill Structure",
      "## Key Files",
      "## Marketplace Manifest",
      "## Onboarding",
      "## Skill Quality Bar",
      "## Commit & PR Conventions",
      "## Repo Memory",
    ]) {
      assert.doesNotMatch(text, new RegExp(`^${heading}$`, "m"),
        `CLAUDE.md still contains '${heading}' — should live only in AGENTS.md now`);
    }
  });

  test("has no YAML frontmatter of its own", () => {
    assert.doesNotMatch(text, /^---\n/);
  });
});

describe("AGENTS.md <-> CLAUDE.md cross references stay consistent", () => {
  test("AGENTS.md and CLAUDE.md each point at the other", () => {
    const agents = readFileSync(AGENTS_FILE, "utf-8");
    const claude = readFileSync(CLAUDE_FILE, "utf-8");
    assert.match(agents, /CLAUDE\.md/);
    assert.match(claude, /AGENTS\.md/);
  });
});