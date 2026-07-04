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


def main():
    cfg = hc.load_config()
    if not hc.configured(cfg):
        return
    if not acquire_lock():
        return
    try:
        state = hc.load_state()
        had_work = any(hc.SPOOL_DIR.glob("*.json"))
        if had_work:
            honcho = hc.client(cfg)
            n = drain(honcho, state)
            log(f"flushed {n} spool file(s)")
    except SystemExit:
        pass  # client() exits 2 when honcho-ai missing; spool persists
    except Exception as e:
        log(f"flush error: {e}")
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
