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

// The gate covers files directly under .claude/memory/ only — MEMORY.md is
// the human-curated index and wip/ journals (like every subdirectory) sit
// outside MEMORY_PATH's [^/]+ match by construction.
export function is_gated_path(file: string): boolean {
  return MEMORY_PATH.test(file) && !file.endsWith("MEMORY.md");
}

// Sole frontmatter parser — is_record and warn_reasons derive from it so
// "what counts as frontmatter/body" can never diverge between the gate and
// the warn heuristics.
function split_doc(content: string): { fm: string; body: string } {
  const m = content.match(/^(---\n[\s\S]*?\n---)([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: "", body: content };
}

export function is_record(content: string): boolean {
  const { fm } = split_doc(content);
  return !!fm && /^\s*kind:\s*\S/m.test(fm);
}

const STATUS_VALUE = /^\s*status:\s*(active|superseded-by:\d{4}-\d{2}-\d{2})\s*$/;
const PROMOTE_VALUE = /^\s*promote:\s*(candidate|done:\d{4}-\d{2}-\d{2})\s*$/;

// A change is a permitted metadata flip iff: the body is byte-identical,
// the frontmatter differs only in status:/promote: lines, and every such
// line in the NEW frontmatter carries an exactly-permitted value.
function is_permitted_metadata_flip(existing: string, proposed: string): boolean {
  const a = split_doc(existing);
  const b = split_doc(proposed);
  if (a.body !== b.body) return false;
  const strip = (fm: string) =>
    fm
      .split("\n")
      .filter((l) => !METADATA_LINE.test(l))
      .join("\n");
  if (strip(a.fm) !== strip(b.fm)) return false;
  for (const l of b.fm.split("\n")) {
    if (METADATA_LINE.test(l) && !STATUS_VALUE.test(l) && !PROMOTE_VALUE.test(l)) return false;
  }
  return true;
}

export function warn_reasons(content: string): string[] {
  const reasons: string[] = [];
  const { body } = split_doc(content);
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
  // immutable — supersede, never edit. The ONLY whitelisted change is a
  // frontmatter-scoped status:/promote: flip to an exactly-valid value
  // (body byte-identical; bogus values fail the whitelist).
  if (existing && is_record(existing) && existing !== proposed) {
    if (!is_permitted_metadata_flip(existing, proposed)) {
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

export function apply_edit(existing: string, old_s: string, new_s: string, all: boolean): string {
  if (!old_s) return existing;
  if (all) return existing.split(old_s).join(new_s);
  // Literal substitution only: String.replace(string, string) interprets
  // $-sequences ($&, $`, $', $$) in the replacement, but the real Edit tool
  // substitutes literally — a $-bearing new_string would make the gate
  // classify content that differs from what actually lands on disk.
  const i = existing.indexOf(old_s);
  return i === -1 ? existing : existing.slice(0, i) + new_s + existing.slice(i + old_s.length);
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
  if (!is_gated_path(file)) return;

  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  const proposed =
    tool === "Write"
      ? String(input.content ?? "")
      : apply_edit(existing, String(input.old_string ?? ""), String(input.new_string ?? ""), !!input.replace_all);

  // Classify first; consume the one-shot override ONLY when it would
  // actually downgrade a block — warns/allows never burn it.
  let verdict = classify(existing, proposed, false);
  if (verdict.action === "block" && consume_override(file)) {
    verdict = classify(existing, proposed, true);
  }
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
      .filter(is_gated_path);
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
