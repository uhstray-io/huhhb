// repo-memory write-lint — the Record Contract as a gate.
//
// Two entry points:
//   stdin mode (default): Claude Code PreToolUse payload for Write/Edit on
//     .claude/memory/** — BLOCKS structural violations (in-place edits to a
//     kind:-bearing record's content; only status:/promote: metadata flips
//     are permitted), WARNS on prose heuristics. Split by precision per the
//     2026-07-16 hook-suite plan.
//   --staged mode: the vendor-agnostic git pre-commit variant — runs the
//     same checks over staged .claude/memory/ files; exits 1 on a block.
//
// A one-shot override file (.claude/memory/.lint-override) downgrades a
// block to a warn and is consumed. MEMORY.md and human-curated memories
// (no kind: in frontmatter) are never gated.

import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const MEMORY_PATH = /(^|\/)\.claude\/memory\/[^/]+\.md$/;
const METADATA_LINE = /^\s*(status|promote):.*$/;
const IMPERATIVE = /(^|\n)\s*(?:[-*>]\s*)?(Always|Never|You must|Do not|Skip)\b/;
const POLICY_REF = /(Merge Authorization|routing rule|routing polic|permission)/i;

export function is_record(content: string): boolean {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return !!m && /^\s*kind:\s*\S/m.test(m[1]);
}

function strip_metadata_lines(content: string): string {
  return content
    .split("\n")
    .filter((l) => !METADATA_LINE.test(l))
    .join("\n");
}

export function warn_reasons(content: string): string[] {
  const reasons: string[] = [];
  const body = content.replace(/^---\n[\s\S]*?\n---/, "");
  if (IMPERATIVE.test(body))
    reasons.push(
      "imperative language directed at an agent — records are observational (facts, dates, outcomes); quarantine or rephrase",
    );
  if (POLICY_REF.test(body))
    reasons.push(
      "references policy (Merge Authorization / routing / permissions) — policy lives only in config and is memory-immune",
    );
  if (is_record(content) && !/^\s*status:\s*\S/m.test(content))
    reasons.push("agent record missing its status: field (active | superseded-by:<date>)");
  return reasons;
}

// Pure classification — testable without fs.
// existing: current file content ('' if new). proposed: content after the
// tool call (for Edit, caller applies old->new to existing first).
export function classify(
  existing: string,
  proposed: string,
  overridden: boolean,
): { action: "allow" | "warn" | "block"; reasons: string[] } {
  // Structural rule: an existing kind:-record's non-metadata content is
  // immutable — supersede, never edit. Metadata-only flips are whitelisted.
  if (existing && is_record(existing)) {
    const before = strip_metadata_lines(existing);
    const after = strip_metadata_lines(proposed);
    if (before !== after) {
      const reason =
        "in-place edit to an agent record's content — the Record Contract is supersede-never-edit: write a replacement record and flip the old one's status: (only status:/promote: metadata changes are permitted in place)";
      return overridden
        ? { action: "warn", reasons: [reason + " [lint override consumed — proceeding as a warn]"] }
        : { action: "block", reasons: [reason] };
    }
  }
  // Prose heuristics apply to agent records only — human-curated memories
  // (no kind:) legitimately contain guidance and stay ungated.
  const warns = is_record(proposed) ? warn_reasons(proposed) : [];
  return warns.length ? { action: "warn", reasons: warns } : { action: "allow", reasons: [] };
}

function apply_edit(existing: string, old_s: string, new_s: string, all: boolean): string {
  if (!old_s) return existing;
  return all ? existing.split(old_s).join(new_s) : existing.replace(old_s, new_s);
}

function consume_override(dir_hint: string): boolean {
  const marker = dir_hint.replace(/(\.claude\/memory)\/.*$/, "$1/.lint-override");
  if (existsSync(marker)) {
    try {
      unlinkSync(marker);
    } catch {
      /* read-only fs — treat as not overridden */
      return false;
    }
    return true;
  }
  return false;
}

function run_stdin_mode(): void {
  let payload: any;
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return; // malformed payload — never break the session
  }
  const tool = payload.tool_name;
  const input = payload.tool_input || {};
  const file: string = input.file_path || "";
  if (!["Write", "Edit"].includes(tool)) return;
  if (!MEMORY_PATH.test(file) || file.endsWith("MEMORY.md") || /\/wip\//.test(file)) return;

  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  const proposed =
    tool === "Write"
      ? String(input.content ?? "")
      : apply_edit(existing, String(input.old_string ?? ""), String(input.new_string ?? ""), !!input.replace_all);

  const verdict = classify(existing, proposed, consume_override(file));
  if (verdict.action === "block") {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `repo-memory lint: ${verdict.reasons.join("; ")} — a human may say "override the memory lint" to downgrade this once (touch .claude/memory/.lint-override).`,
        },
      }),
    );
  } else if (verdict.action === "warn") {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: `repo-memory lint (warn, write proceeding): ${verdict.reasons.join("; ")}.`,
        },
      }),
    );
  }
}

function run_staged_mode(): void {
  let files: string[] = [];
  try {
    files = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
      .split("\n")
      .filter((f) => MEMORY_PATH.test(f) && !f.endsWith("MEMORY.md") && !/\/wip\//.test(f));
  } catch {
    return; // not a git repo — nothing to do
  }
  let blocked = false;
  for (const f of files) {
    const show = (ref: string): string => {
      try {
        // execFileSync + arg array: filenames never touch a shell
        return execFileSync("git", ["show", `${ref}:${f}`], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
      } catch {
        return "";
      }
    };
    const verdict = classify(show("HEAD"), show(":0"), false);
    for (const r of verdict.reasons) console.error(`repo-memory lint [${verdict.action}] ${f}: ${r}`);
    if (verdict.action === "block") blocked = true;
  }
  if (blocked) {
    console.error("repo-memory lint: commit blocked — supersede records, never edit them in place.");
    process.exit(1);
  }
}

if (process.argv[1] && /repo-memory-lint/.test(process.argv[1])) {
  if (process.argv.includes("--staged")) run_staged_mode();
  else run_stdin_mode();
}
