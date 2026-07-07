#!/usr/bin/env python3
"""huhhb evolve — cross-skill inventory & relationship substrate.

The deterministic half of /evolve-map: discover every skill across tiers,
parse it, dedup, and surface structural near-duplicates. The SEMANTIC half
(relationship edges, improvement recommendations, approach-gaps) is the
agent's judgment in /evolve-map, seeded by this data so it is grounded rather
than guessed. Stdlib only, read-only, no network.

Tiers (the delineation the user asked for):
  repo    — huhhb's own skills/ (the marketplace source of truth)
  user    — ~/.claude/skills/* (hand-written; *-local = evolve overlays)
  plugin  — ~/.claude/plugins/**/skills/* (installed, upstream-owned, read-only)

  inventory [--json] [--tier T]     normalized catalog across tiers
  overlaps  [--json] [--min S]      near-duplicate / cross-tier collision pairs
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# repo root: the tree above scripts/evolve that carries marketplace.json —
# works from a checkout and from the installed plugin (its skills/ is huhhb's)
_repo = HERE.parent.parent
REPO_SKILLS = (_repo / "skills") if (_repo / "marketplace.json").exists() else None
USER_SKILLS = Path(os.environ.get("EVOLVE_USER_SKILLS", Path.home() / ".claude" / "skills"))
PLUGINS_ROOT = Path(os.environ.get("EVOLVE_PLUGINS_ROOT", Path.home() / ".claude" / "plugins"))

_STOP = set("use when the a an to for of and or with in on this that your you it is are be "
            "skill using used uses via across before after into from as at by them their "
            "user agent code claude if not no do does".split())
_FM_NAME = re.compile(r"^name:\s*(\S+)", re.M)
_FM_DESC = re.compile(r"^description:\s*(.+(?:\n[ \t]+.+)*)", re.M)


def _parse(path):
    # mirrors skill-lint.py's parse_skill_md (name+description frontmatter);
    # kept local rather than cross-importing a sibling top-level script for
    # ~10 lines — if a third caller appears, extract a shared module
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    fm = text.split("---", 2)[1] if text.count("---") >= 2 else ""
    name = _FM_NAME.search(fm)
    desc = _FM_DESC.search(fm)
    return {
        "name": (name.group(1) if name else path.parent.name),
        "description": " ".join((desc.group(1) if desc else "").split()),
        "path": str(path),
    }


def _plugin_source(path):
    """The owning plugin name from a ~/.claude/plugins/**/skills/<name>/SKILL.md
    path — the segment two levels above skills/."""
    parts = path.parts
    try:
        return parts[parts.index("skills") - 1]
    except (ValueError, IndexError):
        return "?"


def inventory(tier_filter=None):
    """Normalized, deduped catalog. Dedup rules: plugin version dirs collapse
    by (source, name) keeping the newest; the huhhb plugin mirror is dropped
    (it IS the repo tier)."""
    records, seen = [], {}

    def _mtime(p):
        try:
            return Path(p).stat().st_mtime
        except OSError:
            return 0.0  # vanished/unreadable between glob and here — degrade, don't crash

    def add(rec, tier, source):
        rec.update(tier=tier, source=source,
                   is_overlay=rec["name"].endswith("-local"))
        # key on (tier, name): the plugin cache vendors the same skill across
        # version/marketplace dirs (descriptions even drift between copies), so
        # collapse to one per tier+name (newest). Cross-tier same-name pairs —
        # the real dedup signal, e.g. a user skill shadowing a repo one —
        # survive because the tier differs.
        key = (tier, rec["name"])
        prev = seen.get(key)
        if prev is None or _mtime(rec["path"]) > _mtime(prev["path"]):
            seen[key] = rec

    if REPO_SKILLS and REPO_SKILLS.exists():
        for p in REPO_SKILLS.glob("*/SKILL.md"):
            r = _parse(p)
            if r:
                add(r, "repo", "huhhb")
    if USER_SKILLS.exists():
        for p in USER_SKILLS.glob("*/SKILL.md"):
            r = _parse(p)
            if r:
                add(r, "user", "user")
    if PLUGINS_ROOT.exists():
        for p in PLUGINS_ROOT.glob("**/skills/*/SKILL.md"):
            # drop the huhhb mirror (marketplaces/huhhb, cache/huhhb) — it's repo
            if "/huhhb/" in str(p):
                continue
            r = _parse(p)
            if r:
                add(r, "plugin", _plugin_source(p))

    records = list(seen.values())
    if tier_filter:
        records = [r for r in records if r["tier"] == tier_filter]
    return sorted(records, key=lambda r: (r["tier"], r["source"], r["name"]))


def _tokens(desc):
    return {w for w in re.findall(r"[a-z0-9-]+", desc.lower()) if w not in _STOP and len(w) > 2}


def overlaps(records, min_score=0.35):
    """Structural near-duplicate pairs (Jaccard over description tokens), plus
    every exact same-name pair across tiers (a strong collision signal — the
    dedup-before-create net). The agent decides merge vs. complement; this
    only says 'look here'."""
    toks = {i: _tokens(r["description"]) for i, r in enumerate(records)}
    pairs = []
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            same_name = records[i]["name"] == records[j]["name"]
            a, b = toks[i], toks[j]
            score = len(a & b) / len(a | b) if (a or b) else 0.0
            if same_name or score >= min_score:
                pairs.append({
                    "a": f"{records[i]['tier']}:{records[i]['name']}",
                    "b": f"{records[j]['tier']}:{records[j]['name']}",
                    "score": round(score, 2),
                    "same_name": same_name,
                    "cross_tier": records[i]["tier"] != records[j]["tier"],
                })
    return sorted(pairs, key=lambda p: (-p["same_name"], -p["score"]))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    pi = sub.add_parser("inventory")
    pi.add_argument("--json", action="store_true")
    pi.add_argument("--tier", choices=["repo", "user", "plugin"])
    po = sub.add_parser("overlaps")
    po.add_argument("--json", action="store_true")
    po.add_argument("--min", type=float, default=0.35)
    args = ap.parse_args()

    if args.cmd == "inventory":
        recs = inventory(args.tier)
        if args.json:
            print(json.dumps(recs, indent=2))
            return
        by_tier = {}
        for r in recs:
            by_tier.setdefault(r["tier"], []).append(r)
        for tier in ("repo", "user", "plugin"):
            group = by_tier.get(tier, [])
            print(f"\n== {tier} ({len(group)}) ==")
            for r in group:
                tag = " [overlay]" if r["is_overlay"] else ""
                src = "" if r["source"] in ("huhhb", "user") else f" ({r['source']})"
                print(f"  {r['name']}{src}{tag}: {r['description'][:70]}")
        print(f"\ntotal: {len(recs)} skills")
    else:
        pairs = overlaps(inventory(), args.min)
        if args.json:
            print(json.dumps(pairs, indent=2))
            return
        if not pairs:
            print("no structural overlaps above threshold")
            return
        print(f"{len(pairs)} overlap pair(s) — merge/dedup candidates "
              "(agent judges merge vs. complement):")
        for p in pairs:
            flags = ("SAME-NAME " if p["same_name"] else "") + ("CROSS-TIER" if p["cross_tier"] else "")
            print(f"  {p['a']:38} ~ {p['b']:38} {p['score']}  {flags}")


if __name__ == "__main__":
    main()
