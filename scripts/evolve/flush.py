#!/usr/bin/env python3
"""huhhb evolve — spool flusher (detached by the Stop hook, or run manually).

Write path: drain spool/*.json into Honcho via session.add_messages().
Runs outside any hook budget, so it may block on the network; a lock file
keeps concurrent Stop firings from double-flushing.

Failure policy: network/API errors leave the spool file in place for the next
flush (at-least-once delivery); unparseable spool files are renamed *.bad so
they can't wedge the queue. Errors are appended to flush.log — never silent,
never fatal.
"""

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import honcho_client as hc

LOCK = hc.DATA_DIR / "flush.lock"
LOG = hc.DATA_DIR / "flush.log"
LOCK_STALE_SECS = 600


def log(msg):
    try:
        with open(LOG, "a") as f:
            f.write(f"{hc.now_iso()} {msg}\n")
    except OSError:
        pass


def acquire_lock():
    hc.ensure_dirs()
    for _ in range(2):
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return True
        except FileExistsError:
            try:
                if time.time() - LOCK.stat().st_mtime > LOCK_STALE_SECS:
                    # ponytail: steal stale lock; worst case is a rare double
                    # flush of one spool file, not data loss
                    LOCK.unlink()
                    continue
            except OSError:
                pass
            return False
    return False


def drain(honcho, state):
    flushed = 0
    for spool_file in sorted(hc.SPOOL_DIR.glob("*.json")):
        try:
            data = json.loads(spool_file.read_text())
        except (json.JSONDecodeError, OSError) as e:
            log(f"bad spool file {spool_file.name}: {e}")
            spool_file.rename(spool_file.with_suffix(".bad"))
            continue
        try:
            hc.add_observations(honcho, state, data["session_id"], data["observations"])
        except Exception as e:  # network/API — retry on next flush
            log(f"flush failed for {spool_file.name}, keeping: {e}")
            continue
        spool_file.unlink()
        flushed += 1
    return flushed


CACHE_FRESH_SECS = 900   # skip refresh when no new work and cache younger than this
USER_BLOCK_CHARS = 2400  # ~600 tokens — the injection budget from the plan
SKILL_LINE_CHARS = 200


def refresh_injection(honcho, state):
    """Prefetch path: rebuild context/injection.md after a flush.

    This file is the whole reason injection costs zero (Law 3): the
    SessionStart hook only ever cats it — every Honcho read happens here,
    outside any hook budget. All reads are representation-tier (no LLM).
    Partial results still write: a stale-but-present cache beats none.
    """
    hc.wait_for_derivation(honcho, timeout=90)  # non-fatal; cache-first doctrine
    parts = [f"# evolve memory (cached from Honcho)\n_refreshed: {hc.now_iso()} — "
             "inferred knowledge, not ground truth; verify low-confidence items. "
             "Run /evolve-status for freshness._\n"]
    try:
        user = honcho.peer(hc.user_peer_id(state))
        block = []
        card = user.card()
        if card:
            block.extend(card)
        rep = user.representation(max_conclusions=12)
        if rep and rep.strip():
            block.append(rep.strip())
        if block:
            parts.append("## About this user\n" + "\n".join(block)[:USER_BLOCK_CHARS] + "\n")
    except Exception as e:
        log(f"prefetch user block failed: {e}")
    skill_lines = []
    agent = honcho.peer(hc.AGENT_PEER)
    for skill in state["recent_skills"][:5]:
        try:
            rep = agent.representation(target=hc.skill_peer_id(skill), max_conclusions=2)
            if rep and rep.strip():
                first = " ".join(rep.strip().split())[:SKILL_LINE_CHARS]
                skill_lines.append(f"- **{skill}**: {first}")
        except Exception as e:
            log(f"prefetch skill {skill} failed: {e}")
    if skill_lines:
        parts.append("## Recently used skills — the agent's own model\n" + "\n".join(skill_lines) + "\n")
    if len(parts) == 1:
        return  # nothing learned yet — keep whatever cache exists
    tmp = hc.INJECTION_PATH.with_suffix(".tmp")
    tmp.write_text("\n".join(parts))
    tmp.replace(hc.INJECTION_PATH)
    log("injection cache refreshed")


def main():
    cfg = hc.load_config()
    if not hc.configured(cfg):
        return
    if not acquire_lock():
        return
    try:
        state = hc.load_state()
        had_work = any(hc.SPOOL_DIR.glob("*.json"))
        cache_fresh = (hc.INJECTION_PATH.exists()
                       and time.time() - hc.INJECTION_PATH.stat().st_mtime < CACHE_FRESH_SECS)
        if had_work or not cache_fresh:
            honcho = hc.client(cfg)
            if had_work:
                n = drain(honcho, state)
                log(f"flushed {n} spool file(s)")
            refresh_injection(honcho, state)
    except SystemExit:
        pass  # client() exits 2 when honcho-ai missing; spool persists
    except Exception as e:
        log(f"flush error: {e}")
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
