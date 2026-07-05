#!/usr/bin/env python3
"""huhhb evolve — Honcho client substrate.

Single choke point for all Honcho SDK calls (pinned honcho-ai==2.2.0).
Config chain: env (HONCHO_URL / HONCHO_API_KEY / HONCHO_WORKSPACE)
  > ~/.config/huhhb/evolve.json > unconfigured (suite is inert).

Subcommands:
  smoke                     6-step round-trip against the configured instance
  observe --type --target --content [--session]   write one observation now
  query  {card,rep,search,chat} --q ... [--target] [--level]
  status                    config source, queue status, local state dirs
  init   --url --api-key --workspace              write the config file

honcho-ai is imported lazily: everything except the network paths works
without it, and the install hint is printed once instead of a traceback.
"""

import argparse
import json
import os
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

HONCHO_PIN = "honcho-ai==2.2.0"
AGENT_PEER = "agent:claude-code"
LESSONS_SESSION = "lessons"

CONFIG_PATH = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "huhhb" / "evolve.json"
DATA_DIR = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "huhhb" / "evolve"
SPOOL_DIR = DATA_DIR / "spool"
CONTEXT_DIR = DATA_DIR / "context"
PENDING_DIR = DATA_DIR / "pending"
STATE_PATH = DATA_DIR / "state.json"
INJECTION_PATH = CONTEXT_DIR / "injection.md"
JOURNAL_PATH = DATA_DIR / "journal.jsonl"
CONCLUSIONS_PATH = DATA_DIR / "conclusions.md"
JOURNAL_MAX_LINES = 500


# ---------------------------------------------------------------- config

def load_config():
    cfg = {}
    if CONFIG_PATH.exists():
        try:
            cfg = json.loads(CONFIG_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            cfg = {}
    url = os.environ.get("HONCHO_URL") or cfg.get("url")
    api_key = os.environ.get("HONCHO_API_KEY") or cfg.get("api_key")
    # mode: honcho (a server to talk to) > local (no server — /evolve-review
    # is the deriver, all state stays in DATA_DIR) > off (suite inert)
    if url or api_key:
        mode = "honcho"
    elif cfg.get("mode") == "local" or os.environ.get("EVOLVE_MODE") == "local":
        mode = "local"
    else:
        mode = "off"
    return {
        "url": url,
        "api_key": api_key,
        "workspace": os.environ.get("HONCHO_WORKSPACE") or cfg.get("workspace") or "huhhb-evolve",
        "mode": mode,
        "source": "env" if any(os.environ.get(v) for v in
                               ("HONCHO_URL", "HONCHO_API_KEY", "EVOLVE_MODE"))
                  else ("file" if cfg else "none"),
    }


def configured(cfg=None):
    cfg = cfg or load_config()
    return cfg["mode"] != "off"


def ensure_dirs():
    # captured session content lives here — keep it private on shared machines,
    # same standard the config file already gets (0o600)
    for d in (DATA_DIR, SPOOL_DIR, CONTEXT_DIR, PENDING_DIR):
        d.mkdir(parents=True, exist_ok=True)
        os.chmod(d, 0o700)


def load_state():
    ensure_dirs()
    state = {}
    if STATE_PATH.exists():
        try:
            state = json.loads(STATE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            state = {}
    if "profile_id" not in state:
        state["profile_id"] = uuid.uuid4().hex[:12]
        save_state(state)
    state.setdefault("recent_skills", [])
    state.setdefault("cursors", {})
    return state


def atomic_write(path, text):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text)
    os.chmod(tmp, 0o600)
    tmp.replace(path)


@contextmanager
def state_lock():
    """Serialize state.json read-modify-write across concurrent hook runs —
    atomic_write only prevents torn writes, not lost updates when two
    sessions' Stop hooks race."""
    try:
        import fcntl
    except ImportError:
        # non-POSIX (Windows): no flock — degrade to lockless, same behavior
        # as before the lock existed; atomic_write still prevents torn files
        yield
        return
    ensure_dirs()
    with open(DATA_DIR / "state.lock", "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def save_state(state):
    ensure_dirs()
    atomic_write(STATE_PATH, json.dumps(state, indent=2))


# ---------------------------------------------------------------- naming

def user_peer_id(state=None):
    return f"user:{(state or load_state())['profile_id']}"


def skill_peer_id(name):
    return f"skill:{name}"


def cc_session_id(claude_session_id):
    return f"cc:{claude_session_id}"


# ---------------------------------------------------------------- client

def _import_honcho():
    try:
        from honcho import Honcho
        return Honcho
    except ImportError:
        sys.stderr.write(
            f"honcho-ai not installed. Install with:\n  uv pip install {HONCHO_PIN}\n"
            f"  (or: pip install {HONCHO_PIN})\n")
        sys.exit(2)


def client(cfg=None):
    cfg = cfg or load_config()
    if cfg["mode"] != "honcho":
        sys.stderr.write(
            "no Honcho client in this mode. Set HONCHO_URL (self-hosted) or "
            f"HONCHO_API_KEY (managed), use `init --local`, or write {CONFIG_PATH} "
            "— see docs/evolve.md.\n")
        sys.exit(2)
    Honcho = _import_honcho()
    kwargs = {"workspace_id": cfg["workspace"]}
    if cfg["url"]:
        kwargs["base_url"] = cfg["url"]
    if cfg["api_key"]:
        kwargs["api_key"] = cfg["api_key"]
    return Honcho(**kwargs)


def wait_for_derivation(honcho, timeout=90, poll=5):
    """Poll queue_status until the deriver drains (pending==0 and in_progress==0).

    Returns True if drained, False on timeout. Non-fatal by design — callers
    treat a stale representation as acceptable (cache-first doctrine).
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            qs = honcho.queue_status()
        except Exception:
            return False
        if not qs.pending_work_units and not qs.in_progress_work_units:
            return True
        time.sleep(poll)
    return False


# ---------------------------------------------------------------- local store
# Local mode has no deriver: the journal is the observation record and
# conclusions.md (maintained by /evolve-review — the agent IS the deriver)
# is the conclusion layer. Both are plain files under DATA_DIR.

def journal_append(data):
    """Append a digest's observations to the rolling journal (last 500)."""
    ensure_dirs()
    lines = JOURNAL_PATH.read_text().splitlines() if JOURNAL_PATH.exists() else []
    for obs in data["observations"]:
        lines.append(json.dumps({"session_id": data.get("session_id"),
                                 "repo": data.get("repo"), "ts": data.get("ts"), **obs}))
    atomic_write(JOURNAL_PATH, "\n".join(lines[-JOURNAL_MAX_LINES:]) + "\n")


def journal_entries():
    if not JOURNAL_PATH.exists():
        return []
    out = []
    for line in JOURNAL_PATH.read_text().splitlines():
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def local_representation(query=""):
    """Local stand-in for peer.representation: review-derived conclusions
    plus recent stated preferences/corrections straight from the journal."""
    parts = []
    if CONCLUSIONS_PATH.exists():
        parts.append(CONCLUSIONS_PATH.read_text().strip())
    recent = [e["content"] for e in journal_entries()
              if e.get("type") in ("preference", "correction")]
    seen, dedup = set(), []
    for c in reversed(recent):          # newest first, drop repeats
        if c not in seen:
            seen.add(c)
            dedup.append(c)
    if dedup:
        parts.append("## Recent stated preferences & corrections\n"
                     + "\n".join(f"- {c}" for c in dedup[:8]))
    text = "\n\n".join(parts)
    if query:
        hits = [l for l in text.splitlines() if query.lower() in l.lower()]
        return "\n".join(hits) if hits else text
    return text


# ---------------------------------------------------------------- observe

def add_observations(honcho, state, session_id, observations):
    """Write typed observations as Honcho messages.

    Routing (who 'speaks' decides whose representation the deriver builds):
      preference/correction (target user) -> user peer
      skill-usage                         -> the skill peer
      strategic                           -> agent peer, into the 'lessons' session
      everything else                     -> agent peer, into the cc session
    """
    by_session = {}
    for obs in observations:
        otype, content = obs["type"], obs["content"]
        if otype == "strategic":
            sid, peer_id = LESSONS_SESSION, AGENT_PEER
        elif obs.get("target") == "user":
            sid, peer_id = cc_session_id(session_id), user_peer_id(state)
        elif otype == "skill-usage" and obs.get("skill"):
            sid, peer_id = cc_session_id(session_id), skill_peer_id(obs["skill"])
        else:
            sid, peer_id = cc_session_id(session_id), AGENT_PEER
        peer = honcho.peer(peer_id)
        meta = {k: v for k, v in obs.items() if k not in ("content",)}
        by_session.setdefault(sid, []).append(peer.message(content, metadata=meta))
    for sid, msgs in by_session.items():
        honcho.session(sid).add_messages(msgs)
    return sum(len(m) for m in by_session.values())


# ---------------------------------------------------------------- smoke

def cmd_smoke(_args):
    cfg = load_config()
    state = load_state()
    steps_total = 6
    print(f"evolve smoke — workspace={cfg['workspace']} url={cfg['url'] or 'managed default'} (config: {cfg['source']})")

    def step(n, name):
        print(f"[{n}/{steps_total}] {name} ... ", end="", flush=True)

    def fail(msg):
        print(f"FAIL\n  {msg}")
        sys.exit(1)

    # 1. connectivity — first peer() call performs the workspace-ensure POST
    step(1, "connect + workspace ensure")
    h = client(cfg)
    try:
        probe_user = h.peer("user:smoke-probe")
        probe_agent = h.peer(AGENT_PEER)
    except Exception as e:
        fail(f"cannot reach Honcho: {e}")
    print("ok")

    # 2. seed observations (incl. one failure-mode-phrased-as-fix — the
    #    schema's living example, and step 6's grounding target)
    step(2, "seed observations")
    sid = f"cc:smoke-{int(time.time())}"
    try:
        session = h.session(sid)
        session.add_messages([
            probe_user.message(
                "[preference] user:smoke-probe — Prefers conventional commits "
                "with no emoji in commit subjects; stated explicitly."),
            probe_agent.message(
                "[technique] project=smoke-repo — pytest-xdist hangs under this "
                "repo's conftest; running with -p no:cacheprovider fixes it."),
        ])
    except Exception as e:
        fail(f"add_messages failed: {e}")
    print(f"ok (session {sid})")

    # 3. deriver drain
    step(3, "wait for derivation (<=120s)")
    drained = wait_for_derivation(h, timeout=120)
    print("ok" if drained else "TIMEOUT (deriver worker running? python -m src.deriver)")

    # 4. representation read (no LLM)
    step(4, "peer.representation")
    try:
        rep = probe_user.representation()
    except Exception as e:
        fail(f"representation failed: {e}")
    if not rep or not rep.strip():
        fail("empty representation — deriver likely not running or has no LLM keys")
    print(f"ok ({len(rep)} chars)")

    # 5. semantic search
    step(5, "peer.search")
    try:
        results = list(probe_user.search("commit message style", limit=3))
    except Exception as e:
        fail(f"search failed: {e}")
    print(f"ok ({len(results)} results)")

    # 6. dialectic grounding — seeded technique must surface in chat
    step(6, "peer.chat grounding check")
    try:
        answer = probe_agent.chat(
            "How should pytest-xdist be run in project smoke-repo?",
            reasoning_level="low") or ""
    except Exception as e:
        fail(f"chat failed: {e}")
    if "cacheprovider" not in str(answer):
        fail(f"seeded observation did not surface in chat. Got: {str(answer)[:300]}")
    print("ok")

    print(f"\nsmoke PASSED — profile_id={state['profile_id']}, smoke peers left in workspace (namespaced 'smoke-')")


# ---------------------------------------------------------------- other commands

def cmd_observe(args):
    state = load_state()
    obs = {"type": args.type, "target": args.target, "content": args.content, "explicit": True}
    if args.target.startswith("skill:"):
        obs["skill"] = args.target.split(":", 1)[1]
        obs["type"] = obs["type"] or "skill-usage"
    cfg = load_config()
    if cfg["mode"] == "local":
        journal_append({"session_id": args.session or f"manual-{int(time.time())}",
                        "ts": now_iso(), "observations": [obs]})
        print("journaled 1 observation (local mode)")
        return
    h = client(cfg)
    n = add_observations(h, state, args.session or f"manual-{int(time.time())}", [obs])
    print(f"wrote {n} observation(s)")


def cmd_query(args):
    state = load_state()
    cfg = load_config()
    if cfg["mode"] == "local":
        if args.what in ("rep", "card"):
            print(local_representation(args.q) or "(nothing learned yet)")
        elif args.what == "search":
            hits = [e["content"] for e in journal_entries()
                    if args.q.lower() in e.get("content", "").lower()]
            for h in hits[-(args.max or 5):]:
                print(f"- {h}")
        else:
            sys.exit("chat needs a Honcho deriver — local mode has none; "
                     "use `query rep` / `query search`, or /evolve-review for synthesis")
        return
    h = client(cfg)
    me = h.peer(args.perspective or user_peer_id(state))
    target = args.target
    if args.what == "card":
        card = me.card(target=target) if target else me.card()
        print("\n".join(card) if card else "(no card yet)")
    elif args.what == "rep":
        print(me.representation(target=target, search_query=args.q,
                                max_conclusions=args.max) or "(empty)")
    elif args.what == "search":
        for r in me.search(args.q, limit=args.max or 5):
            print(f"- {r}")
    elif args.what == "chat":
        print(me.chat(args.q, target=target, reasoning_level=args.level or "low"))


def cmd_status(_args):
    cfg = load_config()
    state = load_state()
    print(f"config source : {cfg['source']}  ({CONFIG_PATH if cfg['source'] == 'file' else 'env vars' if cfg['source'] == 'env' else 'unconfigured — suite inert'})")
    print(f"mode          : {cfg['mode']}")
    if cfg["mode"] == "local":
        n_journal = len(journal_entries())
        n_concl = (len([l for l in CONCLUSIONS_PATH.read_text().splitlines()
                        if l.startswith("- ")]) if CONCLUSIONS_PATH.exists() else 0)
        print(f"journal       : {n_journal} observation(s)")
        print(f"conclusions   : {n_concl} (derived by /evolve-review — run it to distill the journal)")
    else:
        print(f"url           : {cfg['url'] or ('api.honcho.dev (managed)' if cfg['api_key'] else '-')}")
        print(f"workspace     : {cfg['workspace']}")
    print(f"profile id    : {state['profile_id']}")
    spool = list(SPOOL_DIR.glob("*.json")) if SPOOL_DIR.exists() else []
    pending = list(PENDING_DIR.glob("*.json")) if PENDING_DIR.exists() else []
    print(f"spool depth   : {len(spool)}")
    print(f"pending       : {len(pending)} proposal(s)")
    if INJECTION_PATH.exists():
        age = time.time() - INJECTION_PATH.stat().st_mtime
        print(f"cache age     : {int(age // 60)} min ({INJECTION_PATH})")
    else:
        print("cache age     : no injection cache yet")
    if cfg["mode"] == "honcho":
        try:
            qs = client(cfg).queue_status()
            print(f"deriver queue : {qs}")
        except Exception as e:
            print(f"deriver queue : unreachable ({e})")


def cmd_init(args):
    if args.local and (args.url or args.api_key):
        sys.exit("--local excludes --url/--api-key: local mode means no server")
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    cfg = {}
    if args.local:
        cfg["mode"] = "local"
    if args.url:
        cfg["url"] = args.url
    if args.api_key:
        cfg["api_key"] = args.api_key
    cfg["workspace"] = args.workspace or "huhhb-evolve"
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n")
    os.chmod(CONFIG_PATH, 0o600)
    if args.local:
        print(f"wrote {CONFIG_PATH} — local mode active; no server, no smoke test needed. "
              "The loop starts capturing immediately; /evolve-review derives conclusions.")
    else:
        print(f"wrote {CONFIG_PATH} — run `honcho_client.py smoke` to verify")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("smoke")

    po = sub.add_parser("observe")
    po.add_argument("--type", default="preference",
                    choices=["preference", "skill-usage", "technique", "correction",
                             "environment", "strategic"])
    po.add_argument("--target", default="user")
    po.add_argument("--content", required=True)
    po.add_argument("--session")

    pq = sub.add_parser("query")
    pq.add_argument("what", choices=["card", "rep", "search", "chat"])
    pq.add_argument("--q", default="")
    pq.add_argument("--target")
    pq.add_argument("--perspective")
    pq.add_argument("--level", choices=["minimal", "low", "medium", "high", "max"])
    pq.add_argument("--max", type=int)

    sub.add_parser("status")

    pi = sub.add_parser("init")
    pi.add_argument("--url")
    pi.add_argument("--api-key", dest="api_key")
    pi.add_argument("--workspace")
    pi.add_argument("--local", action="store_true",
                    help="no-server mode: journal + review-derived conclusions only")

    args = p.parse_args()
    {"smoke": cmd_smoke, "observe": cmd_observe, "query": cmd_query,
     "status": cmd_status, "init": cmd_init}[args.cmd](args)


if __name__ == "__main__":
    main()
