#!/usr/bin/env python3
"""huhhb evolve — overlay skill manager.

Overlays are user-scope skills at ~/.claude/skills/<name>-local/ that carry
per-user learned procedure. Hub-installed huhhb skills are NEVER edited
(D7): personalization lands here, so `claude plugin update` stays clean and
the learned layer is portable and inspectable.

Subcommands:
  scaffold NAME --description ... [--body ...] [--pinned]
  patch    NAME --file NEW_SKILL.md --signal "..." [--sessions a,b]
  record   NAME --outcome {success,failure} [--error "..."]
  set-status NAME {active,deprecated}
  archive  NAME                      move to _archive/ (never delete; pinned exempt)
  report   [--json]                  confidence table for evolve-status
  propose  [--kind ...]              stdin JSON -> pending/ (headless review's
                                     ONLY write path — everything else needs
                                     interactive approval)
  apply-pending FILE                 replay an approved staged proposal

Confidence is earned, never granted: min(runs/10, 1.0) * success_rate.
One green run scores 0.1, not 1.0 — recall surfaces the number so a
low-confidence overlay is verified before it is trusted.
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from honcho_client import PENDING_DIR, ensure_dirs, now_iso

import os
OVERLAY_ROOT = Path(os.environ.get("EVOLVE_OVERLAY_DIR", Path.home() / ".claude" / "skills"))
ARCHIVE_ROOT = OVERLAY_ROOT / "_archive"
PROPOSAL_KINDS = ("overlay-create", "overlay-patch", "repo-memory", "observation", "archive")


def overlay_dir(name):
    if not name.endswith("-local"):
        sys.exit(f"overlay names must end in '-local' (got '{name}') — "
                 "the suffix is what marks the learned layer as yours, not the hub's")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", name):
        sys.exit(f"invalid overlay name '{name}'")
    return OVERLAY_ROOT / name


def load_meta(name):
    path = overlay_dir(name) / "meta.json"
    if not path.exists():
        sys.exit(f"no overlay '{name}' (looked in {path.parent})")
    return json.loads(path.read_text()), path


def save_meta(meta, path):
    path.write_text(json.dumps(meta, indent=2) + "\n")


def confidence(meta):
    runs = meta.get("runs", 0)
    if not runs:
        return 0.0
    return round(min(runs / 10, 1.0) * meta.get("successes", 0) / runs, 2)


def bump_patch(version):
    major, minor, patch = version.split(".")
    return f"{major}.{minor}.{int(patch) + 1}"


def scaffold_overlay(name, description, body=None, pinned=False, signal=None, sessions=None):
    d = overlay_dir(name)
    if d.exists():
        sys.exit(f"overlay '{name}' already exists — patch it instead of duplicating "
                 "(update-over-duplicate)")
    d.mkdir(parents=True)
    body = body or "## Learned adjustments\n\n(none yet)\n"
    (d / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n\n"
        f"# {name}\n\n"
        f"Personal overlay learned by huhhb evolve — verify low-confidence guidance "
        f"(see meta.json) before trusting it.\n\n{body}\n")
    save_meta({
        "version": "0.1.0", "runs": 0, "successes": 0, "last_error": None,
        "status": "new", "pinned": bool(pinned),
        "provenance": [{"version": "0.1.0", "sessions": sessions or [],
                        "signal": signal or "scaffolded", "ts": now_iso()}],
    }, d / "meta.json")
    print(f"scaffolded {d}")


def patch_overlay(name, content, signal, sessions=None):
    meta, meta_path = load_meta(name)
    meta["version"] = bump_patch(meta["version"])
    meta["provenance"].append({
        "version": meta["version"], "sessions": sessions or [],
        "signal": signal, "ts": now_iso(),
    })
    (meta_path.parent / "SKILL.md").write_text(content)
    save_meta(meta, meta_path)
    print(f"patched {name} -> v{meta['version']}")


def archive_overlay(name):
    meta, path = load_meta(name)
    if meta.get("pinned"):
        sys.exit(f"'{name}' is pinned — pinned overlays are never archived or "
                 "consolidated, only patched")
    ARCHIVE_ROOT.mkdir(parents=True, exist_ok=True)
    dest = ARCHIVE_ROOT / f"{name}-{int(time.time())}"
    path.parent.rename(dest)
    print(f"archived to {dest} (archive-never-delete)")


def _split_sessions(raw):
    return raw.split(",") if raw else []


def cmd_scaffold(args):
    scaffold_overlay(args.name, args.description, args.body, args.pinned,
                     args.signal, _split_sessions(args.sessions))


def cmd_patch(args):
    content = Path(args.file).read_text() if args.file else sys.stdin.read()
    patch_overlay(args.name, content, args.signal, _split_sessions(args.sessions))


def cmd_record(args):
    meta, path = load_meta(args.name)
    meta["runs"] = meta.get("runs", 0) + 1
    if args.outcome == "success":
        meta["successes"] = meta.get("successes", 0) + 1
    else:
        meta["last_error"] = args.error or "unspecified failure"
    if meta["status"] == "new" and meta.get("successes"):
        meta["status"] = "validated"
    if meta["status"] == "validated" and confidence(meta) >= 0.5:
        meta["status"] = "active"
    meta["last_used"] = now_iso()
    save_meta(meta, path)
    print(f"{args.name}: runs={meta['runs']} confidence={confidence(meta)} status={meta['status']}")


def cmd_set_status(args):
    meta, path = load_meta(args.name)
    meta["status"] = args.status
    save_meta(meta, path)
    print(f"{args.name}: status={args.status}")


def cmd_archive(args):
    archive_overlay(args.name)


def cmd_report(args):
    rows = []
    if OVERLAY_ROOT.exists():
        for meta_path in sorted(OVERLAY_ROOT.glob("*-local/meta.json")):
            try:
                meta = json.loads(meta_path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            rows.append({
                "name": meta_path.parent.name, "version": meta.get("version", "?"),
                "status": meta.get("status", "?"), "confidence": confidence(meta),
                "runs": meta.get("runs", 0), "pinned": meta.get("pinned", False),
                "last_error": meta.get("last_error"), "last_used": meta.get("last_used"),
            })
    if args.json:
        print(json.dumps(rows, indent=2))
        return
    if not rows:
        print("no overlays yet")
        return
    print(f"{'overlay':32} {'ver':8} {'status':11} {'conf':5} {'runs':4} pinned last_error")
    for r in rows:
        print(f"{r['name']:32} {r['version']:8} {r['status']:11} {r['confidence']:<5} "
              f"{r['runs']:<4} {'yes' if r['pinned'] else 'no ':5} {r['last_error'] or '-'}")


def cmd_propose(args):
    ensure_dirs()
    proposal = json.load(sys.stdin)
    kind = proposal.get("kind")
    if kind not in PROPOSAL_KINDS:
        sys.exit(f"proposal kind must be one of {PROPOSAL_KINDS}")
    for field in ("summary", "signal"):
        if not proposal.get(field):
            sys.exit(f"proposal missing required field '{field}'")
    proposal["ts"] = now_iso()
    dest = PENDING_DIR / f"{kind}-{int(time.time() * 1000)}.json"
    dest.write_text(json.dumps(proposal, indent=2) + "\n")
    print(f"staged {dest}")


def cmd_apply_pending(args):
    path = Path(args.file)
    proposal = json.loads(path.read_text())
    kind = proposal["kind"]
    if kind == "overlay-create":
        scaffold_overlay(proposal["name"], proposal["description"], proposal.get("body"),
                         proposal.get("pinned", False), proposal["signal"],
                         proposal.get("sessions", []))
    elif kind == "overlay-patch":
        patch_overlay(proposal["name"], proposal["content"], proposal["signal"],
                      proposal.get("sessions", []))
    elif kind == "archive":
        archive_overlay(proposal["name"])
    else:
        # repo-memory / observation proposals are applied by the review skill
        # itself (git-tracked writes and Honcho writes need its judgment)
        sys.exit(f"'{kind}' proposals are applied by /evolve-review directly, not this command")
    path.unlink()
    print(f"applied and removed {path.name}")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    ps = sub.add_parser("scaffold")
    ps.add_argument("name")
    ps.add_argument("--description", required=True)
    ps.add_argument("--body")
    ps.add_argument("--pinned", action="store_true")
    ps.add_argument("--signal")
    ps.add_argument("--sessions")

    pp = sub.add_parser("patch")
    pp.add_argument("name")
    pp.add_argument("--file")
    pp.add_argument("--signal", required=True)
    pp.add_argument("--sessions")

    pr = sub.add_parser("record")
    pr.add_argument("name")
    pr.add_argument("--outcome", choices=["success", "failure"], required=True)
    pr.add_argument("--error")

    pt = sub.add_parser("set-status")
    pt.add_argument("name")
    pt.add_argument("status", choices=["active", "deprecated"])

    pa = sub.add_parser("archive")
    pa.add_argument("name")

    pj = sub.add_parser("report")
    pj.add_argument("--json", action="store_true")

    sub.add_parser("propose")

    pap = sub.add_parser("apply-pending")
    pap.add_argument("file")

    args = p.parse_args()
    {"scaffold": cmd_scaffold, "patch": cmd_patch, "record": cmd_record,
     "set-status": cmd_set_status, "archive": cmd_archive, "report": cmd_report,
     "propose": cmd_propose, "apply-pending": cmd_apply_pending}[args.cmd](args)


if __name__ == "__main__":
    main()
