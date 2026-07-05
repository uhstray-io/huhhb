#!/usr/bin/env python3
"""huhhb G0 static lint — the free quality gate (docs/skill-quality-bar.md S1-S8).

Checks every marketplace.json entry. FAIL blocks merge (exit 1); WARN is
advisory. Stdlib only, no network — safe for CI and pre-commit.

    python3 scripts/skill-lint.py [--strict]   # --strict promotes WARN to FAIL
"""

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BODY_WARN_CHARS = 6000   # ~1500 tokens injected on every load
BODY_FAIL_CHARS = 12000  # ~3000 tokens — progressive disclosure is overdue
TRIGGER_HINT = re.compile(r"\buse (when|to|during|for|this)\b|triggers? on|\"[^\"]+\"", re.I)

issues = []


def report(level, skill, code, msg):
    issues.append((level, skill, code, msg))


def parse_skill_md(text):
    """-> (frontmatter keys | None, frontmatter text, body)."""
    parts = text.split("---", 2)
    if len(parts) < 3 or parts[0].strip():
        return None, "", text
    keys = [line.split(":")[0].strip() for line in parts[1].strip().splitlines()
            if re.match(r"^\w[\w-]*:", line)]
    return keys, parts[1], parts[2]


def lint_entry(entry, seen_names, seen_descriptions):
    name = entry.get("name", "?")
    rel = entry.get("path")
    path = REPO / rel if rel else None

    if path is None or not path.is_file():                        # S1
        report("FAIL", name, "S1", f"missing file {rel or '(no path in entry)'}")
        return
    if name in seen_names:                                        # S5
        report("FAIL", name, "S5", "duplicate skill name")
    seen_names.add(name)

    desc = entry.get("description", "")
    if not (30 <= len(desc) <= 500):                              # S4
        report("FAIL", name, "S4", f"marketplace description length {len(desc)} (want 30-500)")
    if desc in seen_descriptions:
        report("FAIL", name, "S5", "identical description to another skill")
    seen_descriptions.add(desc)
    if "version" not in entry:                                    # S8
        report("FAIL", name, "S8", "marketplace entry missing version")

    text = path.read_text(encoding="utf-8", errors="replace")
    keys, fm, body = parse_skill_md(text)

    if path.name == "SKILL.md":
        if keys is None:
            report("FAIL", name, "S2", "no parseable frontmatter")
        else:
            if keys != ["name", "description"]:                   # S2
                report("FAIL", name, "S2", f"frontmatter keys {keys} (want [name, description])")
            fm_name = re.search(r"^name:\s*(\S+)", fm, re.M)
            if fm_name and fm_name.group(1) != path.parent.name:  # S3
                report("FAIL", name, "S3",
                       f"frontmatter name '{fm_name.group(1)}' != dir '{path.parent.name}'")
            fm_desc = re.search(r"^description:\s*(.+)$", fm, re.M)
            if fm_desc and not TRIGGER_HINT.search(fm_desc.group(1)):
                report("WARN", name, "S4", "description has no trigger phrasing "
                       "('use when...', quoted phrases)")
    elif keys and "triggers" in keys:                             # S2 — banned repo-wide
        report("FAIL", name, "S2", "frontmatter has unsupported 'triggers' field")
    # links/paths inside fenced code blocks are examples, not references
    prose = re.sub(r"```.*?```", "", body, flags=re.S)
    if len(body) > BODY_FAIL_CHARS:                               # S6
        report("FAIL", name, "S6", f"body {len(body)} chars > {BODY_FAIL_CHARS} — "
               "split into references/")
    elif len(body) > BODY_WARN_CHARS:
        report("WARN", name, "S6", f"body {len(body)} chars — consider progressive disclosure")

    for link in re.findall(r"\]\((?!http|#|mailto)([^)\s]+)\)", prose):  # S7
        target = (path.parent / link.split(":")[0]).resolve()
        alt = (REPO / link.split(":")[0]).resolve()
        if not target.exists() and not alt.exists():
            report("FAIL", name, "S7", f"broken relative link: {link}")
    for ref in set(re.findall(r"\$\{CLAUDE_PLUGIN_ROOT\}/([\w./-]+)", prose)):
        if not (REPO / ref).exists():
            report("FAIL", name, "S7", f"plugin-root path missing from repo: {ref}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="WARN also fails the gate")
    args = ap.parse_args()

    mp = json.loads((REPO / "marketplace.json").read_text())
    pj = json.loads((REPO / ".claude-plugin" / "plugin.json").read_text())
    if mp["version"] != pj["version"]:                            # S8
        report("FAIL", "(repo)", "S8",
               f"version drift: marketplace {mp['version']} != plugin {pj['version']}")

    seen_names, seen_descriptions = set(), set()
    for entry in mp["skills"]:
        lint_entry(entry, seen_names, seen_descriptions)

    # ratchet: pre-existing violations are grandfathered (visible, non-blocking);
    # anything NEW fails. Shrink this file over time, never grow it.
    baseline_path = REPO / "scripts" / "skill-lint-baseline.json"
    baseline = ({tuple(x) for x in json.loads(baseline_path.read_text())}
                if baseline_path.exists() else set())

    fails, warns, grandfathered = [], [], []
    for issue in issues:
        level, skill, code, _ = issue
        if level == "FAIL" and (skill, code) in baseline:
            grandfathered.append(issue)
        elif level == "FAIL":
            fails.append(issue)
        else:
            warns.append(issue)
    for tag, group in (("FAIL", fails), ("GRANDFATHERED", grandfathered), ("WARN", warns)):
        for _, skill, code, msg in group:
            print(f"{tag:13} {code} {skill:34} {msg}")
    print(f"\n{len(mp['skills'])} skills — {len(fails)} FAIL, "
          f"{len(grandfathered)} grandfathered, {len(warns)} WARN")
    sys.exit(1 if fails or (args.strict and warns) else 0)


if __name__ == "__main__":
    main()
