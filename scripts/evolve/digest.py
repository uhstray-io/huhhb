#!/usr/bin/env python3
"""huhhb evolve — transcript digester (Stop-hook payload on stdin).

Reads the Claude Code hook JSON {session_id, transcript_path, cwd}, parses
the session transcript (.jsonl), and spools typed observations for flush.py.
Stdlib only — must run even where honcho-ai is not installed.

Capture doctrine (Law 1: purity beats volume). Emission is gated by explicit
detectors — nothing is captured unless a pattern votes for it:

  [preference]  "always use X", "never Y", "from now on", explicit "remember"
  [correction]  imperative repair of agent behavior ("stop explaining...",
                "don't add...", "that's not what I asked")
  [skill-usage] a huhhb skill was invoked; outcome=partial if a correction
                followed within 3 user turns, else outcome=used
  [environment] a missing-command failure THAT WAS FIXED in-session, phrased
                as the fix (never as the failure)

Anti-capture filter (non-negotiable, enforced here at write time):
  - no negative capability claims ("X is broken", "cannot use Y")
  - no environment failures without their fix
  - no transient errors that resolved in-session
  - no one-off task narratives (nothing is emitted without a detector vote)

Sanitization: system-reminder blocks and harness-injected command wrappers are
stripped BEFORE detection (store what the user asked, not what the harness
injected); secret-looking values are redacted.

A per-session cursor (state.json) makes repeated Stop firings incremental —
each digest run only sees transcript lines it has not processed before.
"""

import json
import os
import platform
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import guardrails
from honcho_client import (SPOOL_DIR, configured, ensure_dirs, load_state, now_iso,
                           save_state, state_lock)

SNIPPET_MAX = 200
CORRECTION_WINDOW = 3  # user turns after a skill invocation that still implicate it

# Sanitizer -------------------------------------------------------------
# Harness-injected content is never user speech. Tag-closed blocks are
# stripped in place (verified in the wild: a <task-notification> block was
# captured as a [correction] before this list included it); wrapper markers
# cause the whole message to be skipped (slash-command scaffolding).
# Known limitation: a session that WRITES test fixtures (e.g. a heredoc
# containing 'command not found: x' followed by an install command) is
# indistinguishable from a real failure+fix and will be captured — dev
# sessions on this repo itself are pathological input.
HARNESS_BLOCK = re.compile(
    r"<(system-reminder|task-notification|local-command-caveat|command-name"
    r"|command-message|command-args|local-command-stdout|ci-monitor-event)>.*?</\1>", re.S)
# a message that STARTS as harness output is wholly harness-authored;
# a marker merely embedded in user text gets its block stripped instead
HARNESS_PREFIXES = ("<command-name>", "<local-command-stdout>", "<command-message>",
                    "<command-args>", "<task-notification>", "<local-command-caveat>",
                    "<ci-monitor-event>", "[SYSTEM NOTIFICATION")
SECRET = re.compile(
    r"(sk-[A-Za-z0-9_\-]{10,}"
    r"|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}"
    r"|AKIA[0-9A-Z]{16}"
    r"|xox[baprs]-[A-Za-z0-9\-]{10,}"
    r"|(?:api[_-]?key|token|secret|password)\s*[=:]\s*\S{8,})",
    re.I,
)

# Detectors -------------------------------------------------------------
# Deliberately narrow: a missed preference costs one session; a poisoned
# observation costs months (Hermes). Tighten, never loosen, without evidence.
REMEMBER = re.compile(r"\bremember (?:this|that)\b", re.I)
PREFERENCE = re.compile(
    r"\b(?:always use|never use|i prefer|from now on|going forward, use)\b", re.I)
# per-verb gerund forms: e-dropping verbs (use->using) can't be matched by a
# bare (?:ing)? suffix, so each verb lists its real inflections
CORRECTION = re.compile(
    r"(?:\b(?:don'?t|do not|stop|never|quit) "
    r"(?:do(?:ing)?|us(?:e|ing)|add(?:ing)?|writ(?:e|ing)|explain(?:ing)?"
    r"|includ(?:e|ing)|putt?(?:ing)?|mak(?:e|ing)|creat(?:e|ing)"
    r"|mention(?:ing)?|say(?:ing)?)\b"
    r"|\bnot what i asked\b|\bi asked for\b|\byou always\b|^actually[ ,])",
    re.I,
)
# zsh: "zsh: command not found: foo" / bash: "bash: foo: command not found"
# the lookahead keeps the shell's own name from being captured as the command
CMD_NOT_FOUND = re.compile(
    r"(?:command not found:\s*([\w.-]+)"
    r"|\b(?!(?:zsh|bash|sh|dash|fish)\b)([\w.-]+):\s*command not found"
    r"|\bsh:\s*(?:\d+:\s*)?([\w.-]+):\s*not found)")
INSTALL_CMD = re.compile(
    r"\b(?:brew|apt|apt-get|dnf|yum|pacman|pip3?|uv|npm|pnpm|yarn|cargo|go|gem)\b"
    r"[^\n;|&]*\b(?:install|add|tool install|i)\b", re.I)

# Detection view — what the detectors are allowed to see. Pasted documents
# quote example phrases ("stop explaining before the diff", 'an explicit
# "remember this"') that must not masquerade as live user signal, so before
# detection we drop fenced/inline code, double-quoted spans, blockquote lines,
# and bracket-tagged observation examples. Snippets still come from the
# original text — this view exists only to decide WHETHER something fired.
FENCED_CODE = re.compile(r"```.*?```", re.S)
INLINE_CODE = re.compile(r"`[^`\n]*`")
QUOTED_SPAN = re.compile(r"\"[^\"\n]{0,300}\"|“[^”\n]{0,300}”")
EXAMPLE_LINE = re.compile(r"\s*(?:>|\[[a-zA-Z-]+\])")  # used with .match()

# Anti-capture gate — applied to every observation before spooling.
NEGATIVE_CAPABILITY = re.compile(
    r"(is broken|can'?t use|cannot use|doesn'?t work|does not work"
    r"|command not found|is unavailable|never works|failed to|is impossible)", re.I)
FIX_PHRASED = re.compile(
    r"(fixed by|installed|resolved by|works after|instead use|use .{1,60} instead|workaround)", re.I)


def redact_secrets(text):
    return SECRET.sub("[redacted]", text).strip()


def harness_filter(text):
    """Harness content is never user speech — one concept, one owner.
    Messages that BEGIN as harness output (slash-command scaffolding, system
    notifications) are skipped outright (None); tag-closed blocks embedded
    inside genuine user text are stripped in place, preserving the user's own
    words around them. New harness formats get added HERE, nowhere else."""
    if text.lstrip().startswith(HARNESS_PREFIXES):
        return None
    return HARNESS_BLOCK.sub("", text)


def snippet(text, limit=SNIPPET_MAX):
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def detection_view(text):
    text = FENCED_CODE.sub(" ", text)
    text = INLINE_CODE.sub(" ", text)
    text = QUOTED_SPAN.sub(" ", text)
    return "\n".join(line for line in text.splitlines() if not EXAMPLE_LINE.match(line))


def _text_blocks(content):
    if isinstance(content, str):
        return [content]
    out = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                out.append(block.get("text", ""))
    return out


def iter_events(lines):
    """Yield (kind, payload) events: user_text, skill_use, bash_cmd, tool_result."""
    for line in lines:
        try:
            rec = json.loads(line)
        except (json.JSONDecodeError, TypeError):
            continue
        msg = rec.get("message") or {}
        content = msg.get("content")
        if rec.get("type") == "user" and not rec.get("isMeta"):
            for text in _text_blocks(content):
                text = harness_filter(text)
                if text is None:
                    continue  # harness-injected, not the user speaking
                text = redact_secrets(text)
                if text:
                    yield "user_text", text
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        for text in _text_blocks(block.get("content")):
                            yield "tool_result", text
        elif rec.get("type") == "assistant" and isinstance(content, list):
            for block in content:
                if not (isinstance(block, dict) and block.get("type") == "tool_use"):
                    continue
                name = block.get("name", "")
                inp = block.get("input") or {}
                if name == "Skill" and inp.get("skill"):
                    yield "skill_use", inp["skill"]
                elif name == "Bash" and inp.get("command"):
                    yield "bash_cmd", inp["command"]


def detect(events):
    observations = []
    seen = set()
    skills_pending = {}   # skill -> user turns remaining in correction window
    skills_used = []
    missing_cmds = {}     # cmd -> True until an install fix is seen

    def emit(obs):
        key = (obs["type"], obs.get("skill"), obs["content"])
        if key not in seen:
            seen.add(key)
            observations.append(obs)

    for kind, payload in events:
        if kind == "skill_use":
            if payload not in skills_used:
                skills_used.append(payload)
            skills_pending[payload] = CORRECTION_WINDOW
        elif kind == "tool_result":
            m = CMD_NOT_FOUND.search(payload)
            if m:
                missing_cmds[next(g for g in m.groups() if g)] = True
        elif kind == "bash_cmd":
            if INSTALL_CMD.search(payload):
                for cmd in [c for c in missing_cmds if c in payload]:
                    # redact: install commands can carry inline credentials
                    # (--index-url https://user:token@...) and this observation
                    # leaves the machine when a remote Honcho is configured
                    emit({
                        "type": "environment", "target": "agent",
                        "content": f"[environment] os={platform.system().lower()} — "
                                   f"'{cmd}' was missing; fixed by `{snippet(redact_secrets(payload), 120)}`.",
                    })
                    del missing_cmds[cmd]
        elif kind == "user_text":
            view = detection_view(payload)
            corrected = CORRECTION.search(view)
            explicit = REMEMBER.search(view)
            if explicit or PREFERENCE.search(view):
                emit({
                    "type": "preference", "target": "user",
                    "explicit": bool(explicit),
                    "content": f"[preference] user — stated: \"{snippet(payload)}\"",
                })
            elif corrected:
                emit({
                    "type": "correction", "target": "user",
                    "content": f"[correction] user — corrected agent behavior: "
                               f"\"{snippet(payload)}\"",
                })
                for skill in [s for s, n in skills_pending.items() if n > 0]:
                    emit({
                        "type": "skill-usage", "skill": skill, "outcome": "partial",
                        "target": "skill",
                        "content": f"[skill-usage] skill={skill} outcome=partial — "
                                   f"user correction followed: \"{snippet(payload, 120)}\"",
                    })
                    skills_pending[skill] = 0
            skills_pending = {s: n - 1 for s, n in skills_pending.items() if n > 0}

    for skill in skills_used:
        if not any(o.get("skill") == skill for o in observations):
            emit({
                "type": "skill-usage", "skill": skill, "outcome": "used",
                "target": "skill",
                "content": f"[skill-usage] skill={skill} outcome=used — invoked this session.",
            })
    # unresolved missing commands emit NOTHING: a failure without its fix is
    # exactly the grudge the anti-capture list exists to keep out of memory
    return observations


def anti_capture(observations):
    return [o for o in observations
            if not NEGATIVE_CAPABILITY.search(o["content"]) or FIX_PHRASED.search(o["content"])]


def digest(session_id, transcript_path, cwd):
    with state_lock():  # two sessions' Stop hooks can race on state.json
        return _digest_locked(session_id, transcript_path, cwd)


def _read_new_observations(session_id, transcript_path, cursor):
    """Read the unprocessed tail from `cursor`, return (observations, new_cursor)
    or (None, cursor) if nothing/unreadable. Shared by live digest and
    backfill's dry-run so the tail-read and rotated-cursor guard live once."""
    # byte-offset cursor: Stop fires after every turn, so only ever read the
    # tail — a whole-file read here is O(n^2) I/O over a session's lifetime
    try:
        with open(transcript_path, "rb") as f:
            if cursor > os.fstat(f.fileno()).st_size:
                cursor = 0  # transcript rotated/rewritten — start over
            f.seek(cursor)
            chunk = f.read()
            new_cursor = f.tell()
    except OSError:
        return None, cursor
    if not chunk:
        return None, cursor
    lines = chunk.decode("utf-8", errors="replace").splitlines()
    observations = anti_capture(detect(iter_events(lines)))
    for obs in observations:  # GR1: tag signal strength for recall + review
        obs["trust"] = guardrails.assess_trust(obs)
    return observations, new_cursor


def _digest_locked(session_id, transcript_path, cwd):
    state = load_state()
    observations, new_cursor = _read_new_observations(
        session_id, transcript_path, state["cursors"].get(session_id, 0))
    if observations is None:
        return 0
    state["cursors"][session_id] = new_cursor
    # track skills for injection prefetch even when nothing else is captured
    seen_skills = {o["skill"] for o in observations if o.get("skill")}
    if seen_skills:
        recent = [s for s in state["recent_skills"] if s not in seen_skills]
        state["recent_skills"] = (sorted(seen_skills) + recent)[:10]
    save_state(state)
    if not observations:
        return 0
    ensure_dirs()
    spool_file = SPOOL_DIR / f"{session_id}-{time.time_ns()}.json"
    spool_file.write_text(json.dumps({
        "session_id": session_id,
        "cwd": cwd,
        "repo": Path(cwd).name if cwd else "unknown",
        "ts": now_iso(),
        "observations": observations,
    }, indent=2))
    return len(observations)


TRANSCRIPTS_ROOT = Path(os.environ.get(
    "EVOLVE_TRANSCRIPTS_DIR", Path.home() / ".claude" / "projects"))


def _decode_project_cwd(project_dir_name):
    """Claude Code encodes the cwd as a dash-sanitized dir name; the last
    path-ish segment is a good-enough repo slug for the observation record."""
    return project_dir_name.rsplit("-", 1)[-1] or "unknown"


def backfill(limit=None, dry_run=False):
    """Mine historical ~/.claude/projects/*/*.jsonl transcripts through the
    SAME capture pipeline as live sessions — redaction, harness-block
    stripping, anti-capture, trust tagging, and (at flush) GR2 volume
    quarantine all apply. Idempotent via the per-session byte cursor:
    re-running skips transcripts already processed (live or backfilled).
    """
    if not TRANSCRIPTS_ROOT.exists():
        print(f"no transcripts at {TRANSCRIPTS_ROOT}")
        return
    transcripts = sorted(TRANSCRIPTS_ROOT.glob("*/*.jsonl"),
                         key=lambda p: p.stat().st_mtime, reverse=True)
    if limit is not None:                 # limit=0 means "none", not "unlimited"
        transcripts = transcripts[:limit]
    sessions, total = 0, 0
    cursors = load_state()["cursors"] if dry_run else None  # read once, not per-transcript
    for t in transcripts:
        sid, cwd = t.stem, _decode_project_cwd(t.parent.name)
        if dry_run:
            obs, _ = _read_new_observations(sid, str(t), cursors.get(sid, 0))
            n = len(obs) if obs else 0
        else:
            n = digest(sid, str(t), cwd)
        if n:
            sessions += 1
            total += n
    verb = "would capture" if dry_run else "spooled"
    print(f"backfill: {len(transcripts)} transcript(s) scanned, {verb} "
          f"{total} observation(s) from {sessions} session(s)")
    if not dry_run and total:
        # drain spool -> journal (+ GR2 screening) via the normal flusher
        subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "flush.py")],
                       check=False)
        print("flushed to journal — run /evolve-status to see counts and any "
              "quarantined batches, then /evolve-review to distill.")


def main():
    if "--backfill" in sys.argv:
        if not configured():
            sys.exit("evolve is not configured — nothing to backfill into. "
                     "See docs/evolve.md (init --local, or HONCHO_URL/API_KEY).")
        args = sys.argv[sys.argv.index("--backfill") + 1:]
        limit = None
        for a in args:
            if a.startswith("--limit="):
                raw = a.split("=", 1)[1]
                if not raw.isdigit() or int(raw) < 1:
                    sys.exit(f"--limit must be a positive integer (got {raw!r})")
                limit = int(raw)
        backfill(limit=limit, dry_run="--dry-run" in args)
        return
    if not configured():
        return  # the sh guard is a latency fast-path; this is the enforcement
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    session_id = payload.get("session_id")
    transcript = payload.get("transcript_path")
    if not session_id or not transcript or not os.path.exists(transcript):
        return
    n = digest(session_id, transcript, payload.get("cwd", ""))
    if n:
        print(f"spooled {n} observation(s)")


if __name__ == "__main__":
    main()
