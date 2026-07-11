#!/usr/bin/env node
// huhhb evolve — spool flusher (detached by the Stop hook, or run manually). (Full docstring in __doc__ below.)

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import * as hc from "./honcho_client.ts";

const __doc__ = `huhhb evolve — spool flusher (detached by the Stop hook, or run manually).

Write path: drain spool/*.json into Honcho via session.addMessages().
Runs outside any hook budget, so it may block on the network; a lock file
keeps concurrent Stop firings from double-flushing.

Failure policy: network/API errors leave the spool file in place for the next
flush (at-least-once delivery); unparseable spool files are renamed *.bad so
they can't wedge the queue. Errors are appended to flush.log — never silent,
never fatal.`;

export const LOCK = path.join(hc.DATA_DIR, "flush.lock");
export const LOG = path.join(hc.DATA_DIR, "flush.log");
export const LOCK_STALE_SECS = 600;

export function log(msg: string): void {
  try {
    fs.appendFileSync(LOG, `${hc.now_iso()} ${msg}\n`);
  } catch {
    // OSError — best effort
  }
}

export function acquire_lock(): boolean {
  hc.ensure_dirs();
  for (let i = 0; i < 2; i++) {
    try {
      const fd = fs.openSync(LOCK, "wx");
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch (e: any) {
      if (e && e.code === "EEXIST") {
        try {
          if (Date.now() / 1000 - fs.statSync(LOCK).mtimeMs / 1000 > LOCK_STALE_SECS) {
            // ponytail: steal stale lock; worst case is a rare double
            // flush of one spool file, not data loss
            fs.unlinkSync(LOCK);
            continue;
          }
        } catch {
          // OSError — fall through to failure
        }
        return false;
      }
      return false;
    }
  }
  return false;
}

/* List spool/*.json files, sorted lexicographically (Path.glob + sorted). */
function _spool_files(): string[] {
  let files: string[];
  try {
    files = fs.readdirSync(hc.SPOOL_DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(hc.SPOOL_DIR, f));
}

/* Drain spool through `deliver(data)`: at-least-once (delivery errors keep
the file for the next flush), corrupt files quarantined as .bad. */
export async function drain(deliver: (data: any) => unknown): Promise<number> {
  let flushed = 0;
  for (const spool_file of _spool_files()) {
    let data: any;
    try {
      data = JSON.parse(fs.readFileSync(spool_file, "utf-8"));
    } catch (e) {
      log(`bad spool file ${path.basename(spool_file)}: ${hc.py_err(e)}`);
      const ext = path.extname(spool_file);
      const bad = ext ? spool_file.slice(0, -ext.length) + ".bad" : spool_file + ".bad";
      fs.renameSync(spool_file, bad);
      continue;
    }
    try {
      await deliver(data);
    } catch (e) {
      // network/API — retry on next flush
      log(`flush failed for ${path.basename(spool_file)}, keeping: ${hc.py_err(e)}`);
      continue;
    }
    fs.unlinkSync(spool_file);
    flushed += 1;
  }
  return flushed;
}

export function honcho_deliver(
  honcho: any,
  state: Record<string, any>,
): (data: any) => Promise<void> {
  return async (data: any): Promise<void> => {
    // Evidence first: the journal keeps every observation in BOTH modes,
    // and journaling before the screen lets it count this batch toward the
    // session's accumulated durable total.
    try {
      hc.journal_append(data);
    } catch (e: any) {
      // Python catches only OSError here; a filesystem error carries a string
      // .code (ENOENT, EACCES, …). Anything else propagates to drain()'s
      // retry-on-Exception path, exactly as the bare `except OSError` does.
      if (e && typeof e.code === "string") {
        log(`journal write failed: ${hc.py_err(e)}`);
      } else {
        throw e;
      }
    }
    // GR2 at the delivery boundary (the same gate local mode applies at
    // read time): a session whose accumulated durable count trips the cap
    // is a poisoning batch — hold it back from the server. The journal
    // still has it; /evolve-review surfaces it via quarantined_observations.
    // Residual: a session that only crosses the cap on a later digest may
    // have delivered earlier batches (fire-and-forget can't un-send) — a
    // single-turn bulk dump, the common vector, is caught in full.
    const [, quarantined] = hc.screened_journal();
    const held = new Set<unknown>();
    for (const [e] of quarantined) held.add(e.session_id);
    if (held.has(data.session_id)) {
      log(`held session ${data.session_id} from Honcho (GR2 volume quarantine)`);
      return;
    }
    await hc.add_observations(honcho, state, data.session_id, data.observations);
  };
}

export const CACHE_FRESH_SECS = 900; // skip refresh when no new work and cache younger than this
export const USER_BLOCK_CHARS = 2400; // ~600 tokens — the injection budget from the plan
export const SKILL_LINE_CHARS = 200;

// R5: every injected context carries the standing skepticism preamble —
// memory guides, reality decides; deviations are new signal, not disobedience.
export const SKEPTICISM =
  "_Historical experience, not absolute truth: when reality deviates from " +
  "anything below, exit the guidance and record the deviation as new signal._\n";

/* Prefetch path: rebuild context/injection.md after a flush.

This file is the whole reason injection costs zero (Law 3): the
SessionStart hook only ever cats it — every Honcho read happens here,
outside any hook budget. All reads are representation-tier (no LLM).
Partial results still write: a stale-but-present cache beats none. */
export async function refresh_injection(honcho: any, state: Record<string, any>): Promise<void> {
  await hc.wait_for_derivation(honcho, 90); // non-fatal; cache-first doctrine
  const parts = [
    `# evolve memory (cached from Honcho)\n_refreshed: ${hc.now_iso()} — ` +
      "inferred knowledge, not ground truth; verify low-confidence items. " +
      "Run /evolve-status for freshness._\n" + SKEPTICISM,
  ];
  try {
    const user = await honcho.peer(hc.user_peer_id(state));
    const block: string[] = [];
    const card = await user.card();
    if (card) {
      block.push(...card);
    }
    const rep = await user.representation({ max_conclusions: 12 });
    if (rep && String(rep).trim()) {
      block.push(String(rep).trim());
    }
    if (block.length) {
      parts.push("## About this user\n" + hc.py_cut(block.join("\n"), USER_BLOCK_CHARS) + "\n");
    }
  } catch (e) {
    log(`prefetch user block failed: ${hc.py_err(e)}`);
  }
  const skill_lines: string[] = [];
  try {
    // a skills-block failure must not discard the user block above
    const agent = await honcho.peer(hc.AGENT_PEER);
    for (const skill of state.recent_skills.slice(0, 5)) {
      try {
        const rep = await agent.representation({
          target: hc.skill_peer_id(skill),
          max_conclusions: 2,
        });
        if (rep && String(rep).trim()) {
          const first = hc.py_cut(
            String(rep).trim().split(/\s+/).filter((x: string) => x !== "").join(" "),
            SKILL_LINE_CHARS,
          );
          skill_lines.push(`- **${skill}**: ${first}`);
        }
      } catch (e) {
        log(`prefetch skill ${skill} failed: ${hc.py_err(e)}`);
      }
    }
  } catch (e) {
    log(`prefetch skills block failed: ${hc.py_err(e)}`);
  }
  if (skill_lines.length) {
    parts.push("## Recently used skills — the agent's own model\n" + skill_lines.join("\n") + "\n");
  }
  write_cache(parts);
}

export function write_cache(parts: string[], label = ""): void {
  if (parts.length === 1) {
    return; // nothing learned yet — keep whatever cache exists
  }
  hc.atomic_write(hc.INJECTION_PATH, parts.join("\n"));
  log(`injection cache refreshed${label}`);
}

/* Local-mode prefetch: no deriver, so the injection is built from
/evolve-review's conclusions.md plus recent journal signal directly.
Cruder than a derived representation, but zero infrastructure. */
export function refresh_injection_local(state: Record<string, any>): void {
  const parts = [
    `# evolve memory (local mode, cached)\n_refreshed: ${hc.now_iso()} — ` +
      "conclusions are derived by /evolve-review; run it to distill " +
      "recent sessions. Inferred knowledge, not ground truth._\n" + SKEPTICISM,
  ];
  const rep = hc.local_representation();
  if (rep) {
    parts.push(hc.py_cut(rep, USER_BLOCK_CHARS) + "\n");
  }
  const partials = new Map<string, string>();
  const [admitted] = hc.screened_journal(); // GR2: never build the friction block
  for (const e of admitted) {
    // from a quarantined session's partials
    if (e.type === "skill-usage" && e.outcome === "partial") {
      partials.set(e.skill, e.content);
    }
  }
  if (partials.size) {
    const vals = [...partials.values()].slice(-5);
    parts.push("## Skill friction observed\n" + vals.map((c) => `- ${c}`).join("\n") + "\n");
  }
  write_cache(parts, " (local)");
}

/* R8 cutover bootstrap: deliver the pre-existing local-mode journal to a
newly configured Honcho, once. GR2 holds quarantined sessions exactly as
live delivery does; a cursor in state.json makes re-runs no-ops (new
observations after cutover flow through the normal spool path — the cursor
marks where replay ended and normal delivery began). Nothing is deleted:
the journal stays the evidence store in both modes. */
export async function replay_journal(
  honcho: any,
  state: Record<string, any>,
): Promise<{ delivered: number; held: number; skipped: number }> {
  const done = Number(state.journal_replayed_lines ?? 0);
  const entries = hc.journal_entries();
  if (entries.length <= done) {
    return { delivered: 0, held: 0, skipped: entries.length };
  }
  const fresh = entries.slice(done);
  // GR2: the same per-session quarantine decision that gates live delivery
  const quarantined = new Set(
    hc.quarantined_observations().map(([e]: [Record<string, any>, string]) => e.session_id),
  );
  // Map observations by session, tracking which journal lines each session owns
  const by_session = new Map<string, Record<string, any>[]>();
  const line_to_session = new Map<number, string>(); // abs line -> session id
  let held = 0;
  for (let i = 0; i < fresh.length; i++) {
    const e = fresh[i];
    const abs_line = done + i;
    const sid = String(e.session_id ?? "unknown");
    if (quarantined.has(sid)) {
      held += 1;
      // Quarantined lines are still tracked — cursor covers them (view decision)
      line_to_session.set(abs_line, sid);
      continue;
    }
    if (!by_session.has(sid)) by_session.set(sid, []);
    by_session.get(sid)!.push(e);
    line_to_session.set(abs_line, sid);
  }
  let delivered = 0;
  const processed_sessions = new Set<string>();
  // Process each session's observations; checkpoint after each successful
  // delivery to reflect the highest contiguous line we've fully processed
  for (const [sid, obs] of by_session) {
    delivered += await hc.add_observations(honcho, state, sid, obs);
    processed_sessions.add(sid);
    // Find the highest line index where all sessions up to that line have been
    // processed (or quarantined), enabling safe incremental checkpointing
    let checkpoint_line = done - 1;
    for (let line = done; line < done + fresh.length; line++) {
      const line_sid = line_to_session.get(line);
      if (line_sid && !quarantined.has(line_sid) && !processed_sessions.has(line_sid)) {
        break; // unprocessed session blocks advancement
      }
      checkpoint_line = line;
    }
    hc.state_lock(() => {
      const s = hc.load_state();
      s.journal_replayed_lines = checkpoint_line + 1;
      hc.save_state(s);
    });
  }
  return { delivered, held, skipped: done };
}

export async function main(): Promise<void> {
  const cfg = hc.load_config();
  if (!hc.configured(cfg)) {
    return;
  }
  if (process.argv.includes("--replay-journal")) {
    if (cfg.mode !== "honcho") {
      hc.sys_exit("--replay-journal needs honcho mode (it bootstraps a new " +
        "server from the local journal) — configure HONCHO_URL/API_KEY first");
    }
    // same mutual exclusion as the drain path: a Stop-hook flush racing a
    // manual replay (or two replays racing the cursor) must never both write
    if (!acquire_lock()) {
      hc.sys_exit("another flush is in progress — retry replay once it finishes");
    }
    try {
      const honcho = await hc.client(cfg);
      const state = hc.load_state();
      const r = await replay_journal(honcho, state);
      console.log(
        `replay: delivered ${r.delivered} observation(s), held ${r.held} ` +
          `(quarantined), cursor previously covered ${r.skipped} line(s)`,
      );
    } catch (e) {
      if (e instanceof hc.SystemExit) throw e; // client() exit-2 UX, like drain
      hc.sys_exit(`replay failed: ${hc.py_err(e)}`);
    } finally {
      try {
        fs.unlinkSync(LOCK);
      } catch {
        // missing_ok=True
      }
    }
    return;
  }
  if (!acquire_lock()) {
    return;
  }
  try {
    const state = hc.load_state();
    const had_work = _spool_files().length > 0;
    const cache_fresh =
      fs.existsSync(hc.INJECTION_PATH) &&
      Date.now() / 1000 - fs.statSync(hc.INJECTION_PATH).mtimeMs / 1000 < CACHE_FRESH_SECS;
    if (had_work || !cache_fresh) {
      if (cfg.mode === "local") {
        if (had_work) {
          log(`local-drained ${await drain(hc.journal_append)} spool file(s)`);
        }
        refresh_injection_local(state);
      } else {
        const honcho = await hc.client(cfg);
        if (had_work) {
          log(`flushed ${await drain(honcho_deliver(honcho, state))} spool file(s)`);
        }
        await refresh_injection(honcho, state);
      }
    }
  } catch (e) {
    if (e instanceof hc.SystemExit) {
      // client() exits 2 when honcho-ai missing; spool persists
    } else {
      log(`flush error: ${hc.py_err(e)}`);
    }
  } finally {
    try {
      fs.unlinkSync(LOCK);
    } catch {
      // missing_ok=True
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  hc.run_main(main);
}
