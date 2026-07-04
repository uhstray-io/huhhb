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


# ---------------------------------------------------------------- config

def load_config():
    cfg = {}
    if CONFIG_PATH.exists():
        try:
            cfg = json.loads(CONFIG_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            cfg = {}
    return {
        "url": os.environ.get("HONCHO_URL") or cfg.get("url"),
        "api_key": os.environ.get("HONCHO_API_KEY") or cfg.get("api_key"),
        "workspace": os.environ.get("HONCHO_WORKSPACE") or cfg.get("workspace") or "huhhb-evolve",
        "source": "env" if os.environ.get("HONCHO_URL") or os.environ.get("HONCHO_API_KEY")
                  else ("file" if cfg else "none"),
    }


def configured(cfg=None):
    cfg = cfg or load_config()
    return bool(cfg["url"] or cfg["api_key"])


def ensure_dirs():
    for d in (SPOOL_DIR, CONTEXT_DIR, PENDING_DIR):
        d.mkdir(parents=True, exist_ok=True)


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


def save_state(state):
    ensure_dirs()
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2))
    tmp.replace(STATE_PATH)


# ---------------------------------------------------------------- naming

def user_peer_id(state=None):
    return f"user:{(state or load_state())['profile_id']}"


def skill_peer_id(name):
    return f"skill:{name}"


def project_peer_id(cwd):
    slug = Path(cwd).name.lower().replace(" ", "-") if cwd else "unknown"
    return f"project:{slug}"


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
    if not configured(cfg):
        sys.stderr.write(
            "evolve is not configured. Set HONCHO_URL (self-hosted) or HONCHO_API_KEY "
            f"(managed), or write {CONFIG_PATH} — see docs/evolve.md.\n")
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
    h = client()
    n = add_observations(h, state, args.session or f"manual-{int(time.time())}", [obs])
    print(f"wrote {n} observation(s)")


def cmd_query(args):
    state = load_state()
    h = client()
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
    if configured(cfg):
        try:
            qs = client(cfg).queue_status()
            print(f"deriver queue : {qs}")
        except Exception as e:
            print(f"deriver queue : unreachable ({e})")


def cmd_init(args):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    cfg = {}
    if args.url:
        cfg["url"] = args.url
    if args.api_key:
        cfg["api_key"] = args.api_key
    cfg["workspace"] = args.workspace or "huhhb-evolve"
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n")
    os.chmod(CONFIG_PATH, 0o600)
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

    args = p.parse_args()
    {"smoke": cmd_smoke, "observe": cmd_observe, "query": cmd_query,
     "status": cmd_status, "init": cmd_init}[args.cmd](args)


if __name__ == "__main__":
    main()
