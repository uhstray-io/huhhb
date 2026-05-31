# strict-simplify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `strict-simplify` skill to the huhhb marketplace that replaces redundant/verbose code with a provably-equivalent simpler form, applies the edits, and shows the diff — never restructuring, renaming, reformatting, optimizing, or fixing bugs.

**Architecture:** A single self-contained `SKILL.md` (no supporting scripts). The skill is a *discipline + technique* skill, so it is built and verified using the `writing-skills` TDD method: run a baseline pressure scenario WITHOUT the skill (watch an agent over-reach), write the skill, then re-run WITH the skill (verify it stays strict). After the skill passes, register it in the marketplace manifest, onboarding list, and bump the plugin version.

**Tech Stack:** Markdown + YAML frontmatter (skill authoring). No runtime code. Verification is done with subagents (the `Agent` tool) against a seeded sample file. Source of truth for all content: `docs/superpowers/specs/2026-05-31-strict-simplify-design.md`.

---

## File Structure

| File | Responsibility | Action |
| ---- | -------------- | ------ |
| `skills/strict-simplify/SKILL.md` | The skill itself: gate, scope, flow, examples, counter-examples | Create |
| `/tmp/strict-simplify-fixture.py` | Throwaway seeded fixture for baseline/verify scenarios (not committed) | Create (temp) |
| `marketplace.json` | Marketplace manifest entry | Modify |
| `onboarding/skills-list.md` | User-facing skill discovery list | Modify |
| `.claude-plugin/plugin.json` | Plugin version for update detection | Modify |

**Spec coverage note:** the spec's "Repo Integration" section maps to Tasks 4–6; "Testing" maps to Tasks 1 and 3; everything else (gate, scope, flow, frontmatter, examples, counter-examples) maps to Task 2.

---

### Task 1: RED — Baseline scenario without the skill

Establish what an agent does WITHOUT the skill, so we can prove the skill changes behavior. This is the "watch the test fail" step.

**Files:**
- Create (temp, do NOT commit): `/tmp/strict-simplify-fixture.py`

- [ ] **Step 1: Create the seeded fixture**

This file deliberately contains (a) genuine provably-equivalent simplifications, (b) tempting-but-unsafe near-misses, and (c) bait for out-of-scope over-reach (a stale comment, a renameable temp, a reorderable helper, a latent bug).

```python
# /tmp/strict-simplify-fixture.py

# legacy helper — kept around since the big refactor of 2019  (stale comment: BAIT, do not remove)
def helper_b(xs):
    return [x for x in xs if x > 0]


def summarize(nums):
    tmp = 0                     # renameable temp: BAIT, do not rename
    for n in nums:
        tmp += n                # category 1: provably -> sum(nums)
    return tmp


def has_value(arr, target):
    found = False
    for x in arr:               # category 1: provably -> target in arr
        if x == target:
            found = True
            break
    return found


def is_ok(flag):
    if flag == True:            # category 3: provably -> if flag: (flag is a real bool here)
        return True
    else:
        return False


def pick(cond, fallback):
    return cond if cond else fallback   # near-miss: -> cond or fallback ONLY if cond is bool; here cond is a value -> SKIP


def build(parts):
    out = "" + parts[0]         # near-miss: leading "" no-op ONLY if parts[0] is str; unknown -> judge, likely SKIP
    return out


def divide(a, b):
    return a / b                # latent bug (div by zero) — BAIT: must REPORT, not fix
```

- [ ] **Step 2: Run the baseline scenario WITHOUT the skill**

Dispatch a subagent with NO mention of the strict-simplify skill:

```
Use the Agent tool (subagent_type: general-purpose) with this prompt:

"Review /tmp/strict-simplify-fixture.py and simplify it. Apply your changes
directly to the file, then show me the diff."
```

- [ ] **Step 3: Record the baseline failures verbatim**

Write down what the agent did. Expected over-reach (these are the failures the skill must prevent):
- Removed or rewrote the stale comment.
- Renamed `tmp` to something "clearer".
- Reordered `helper_b` / functions.
- Applied `cond or fallback` and/or dropped the `"" +` without checking the operand type.
- "Fixed" the `divide` bug instead of reporting it.

Expected baseline PASS-ish: it will likely catch `sum`, `in`, and `if flag:`.

No commit (fixture is temporary). This task produces notes, not code.

---

### Task 2: GREEN — Write `skills/strict-simplify/SKILL.md`

**Files:**
- Create: `skills/strict-simplify/SKILL.md`

- [ ] **Step 1: Write the skill file**

Create `skills/strict-simplify/SKILL.md` with EXACTLY this content:

````markdown
---
name: strict-simplify
description: Use when reviewing code to replace redundant or verbose logic with a provably-equivalent simpler form — custom code that duplicates a stdlib/builtin, dead/no-op arguments, collapsible redundant expressions. Triggers on "strict simplify", "/strict-simplify", "reduce redundant code". Does not restructure, rename, reformat, optimize, or fix bugs.
---

# Strict Simplify

## Overview

Replace code **only** when the replacement is provably identical in behavior and the
equivalence is **self-evident from reading the diff**. The output is a git diff a human can
approve line-by-line without running the code to trust it.

This skill does **less than `simplify` on purpose.** It does not restructure, rename,
reformat, optimize, or fix bugs. Narrowness is the feature.

## The Equivalence Gate

A change is allowed **only if it passes ALL six checks.** Otherwise: **skip it.**

1. **Identical behavior** for every input, including edge cases and error paths.
2. **Self-evident by reading** — equivalence is obvious from the diff alone. No execution,
   no assumptions about untested paths.
3. **No signature / type / API change** — nothing observable to callers changes.
4. **No change to side effects, evaluation order, or error/exception behavior.**
5. **Local** — within an expression/statement/line, not a cross-function move.
6. **When in doubt, skip.** Bias is always toward leaving code alone.

> Violating the letter of these is violating the spirit. "Basically the same" that fails any
> one check is not a candidate. If you cannot write a clean one-line "why equivalent"
> justification, it is not a candidate.

## In-Scope Categories

1. **Custom → stdlib/builtin** — hand-rolled logic replaced by an exact standard-library
   equivalent (manual sum loop → `sum()`).
2. **Dead / no-op values & args** — remove arguments/values with no effect
   (`from("", "", "Zord")` → `from("Zord")`, when a matching signature exists).
3. **Redundant logic collapse** — `if x { true } else { false }` → `x`; double negation; a
   variable assigned once and used once on the next line.
4. **Verbose → idiomatic equivalent** — a verbose construct → a shorter one doing *exactly*
   the same thing (manual transform loop → `map`/comprehension).

These name the common shapes; they are **not a closed list.** Be ambitious about *discovery*
— real codebases hold redundancies these four never named. Ambition applies to *what you
look for*, never to *how sure you must be*: every self-found candidate faces the same six
checks.

## Hard Out-of-Scope (forbidden)

- No comment removal or editing.
- No renaming (variables, functions, types, files).
- No reordering or restructuring of functions/blocks.
- No performance/efficiency changes (even if "obviously faster").
- No bug fixes — **if you find a bug, report it, do not fix it.**
- No new abstractions, helpers, or layers.
- No formatting-only or whitespace-only changes.
- No changes that alter logs, errors, or serialized output.

## Process

1. **Preflight** — run `git status`. If the working tree is **not clean**, STOP and ask the
   user to commit or stash first, so the simplification diff stays isolated.
2. **Target** — whole repo by default; if the user passed a path, restrict to it.
3. **Discover** — read the code and build a candidate ledger. Each row:
   `file:line · category · current → proposed · one-line why-equivalent`.
   Drop every row that fails the gate.
4. **Apply** — apply all surviving candidates. Leave edits **unstaged**.
5. **Report** — show `git diff` + the ledger, plus a short
   **"found but skipped — not provably equivalent"** list so nothing is silently dropped.
   If you found a bug, report it here too — do not fix it.

For very large repos you MAY delegate discovery to `cavecrew` subagents. Optional, not required.

## Examples — acceptable (each is provably equivalent by reading)

**Custom → stdlib/builtin**
```python
total = 0
for n in nums: total += n        # →
total = sum(nums)
```
```js
let found = false;
for (const x of arr) if (x === target) { found = true; break; }   // →
const found = arr.includes(target);   // SKIP if target may be NaN
```

**Dead / no-op values & args**
```rust
directories::from("", "", "Zord")   // →  directories::from("Zord")   // only if a 1-arg signature exists
```
```python
json.dumps(data, indent=None)   // →  json.dumps(data)   // None is the documented default
```

**Redundant logic collapse**
```go
if x > 0 { return true } else { return false }   // →  return x > 0
```
```python
result = compute(x)
return result            # →  return compute(x)   // assigned once, used once
```

**Verbose → idiomatic equivalent**
```python
out = []
for x in xs:
    if x > 0: out.append(x)      # →
out = [x for x in xs if x > 0]
```

## Counter-Examples — SKIP these (look simpler, fail the gate)

| Tempting change | Why skip |
| --------------- | -------- |
| Reorder/regroup for cleanliness | Restructuring, not simplification; risks init/side-effect order |
| "Faster" rewrite (bitwise trick, swap data structure) | Performance is out of scope; equivalence not readable |
| Drop a guard that looks redundant (`if items:` before a loop) | May protect a downstream assumption; changes empty-input behavior |
| Inline a call across a side effect (`f()` that logs/mutates) | Equivalent only if `f` is visibly pure |
| Delete stale comment / collapse blank lines / reflow | Forbidden; not a logic change |
| `cond ? cond : fallback` → `cond \|\| fallback` on a **value** | Differs on `0`, `""`, `NaN` — only safe when `cond` is boolean |
| `user && user.x` → `user?.x` when `user` may be `0`/`""` | `?.` guards nullish only, `&&` guards falsiness |
| Rename `tmp` → `userCount` | Renaming is out of scope |
| Fix a bug you noticed | Report it separately; do not fix in this pass |

## Red Flags — STOP, you are over-reaching

- You're editing a comment, blank line, or whitespace.
- You're renaming or moving something.
- You're about to write "this is basically the same" instead of a clean equivalence line.
- You're "improving" performance.
- You're fixing a bug.
- You can't be 100% sure by reading alone — that means **skip**, not "probably fine".
````

- [ ] **Step 2: Verify the file is valid and within frontmatter limits**

Run:
```bash
head -4 skills/strict-simplify/SKILL.md
python3 -c "import sys; s=open('skills/strict-simplify/SKILL.md').read().split('---')[1]; print('frontmatter chars:', len(s)); assert len(s) < 1024, 'frontmatter too long'"
```
Expected: prints the frontmatter, `frontmatter chars:` under 1024, no assertion error. Confirm there is **no `triggers:` field** (trigger phrases live in `description`).

- [ ] **Step 3: Commit**

```bash
git add skills/strict-simplify/SKILL.md
git commit -m "feat(strict-simplify): add provably-equivalent simplification skill"
```

---

### Task 3: GREEN verification — Re-run the scenario WITH the skill

Prove the skill changes behavior: the same fixture, now reviewed under the skill, must stay strict.

**Files:**
- Reuse temp fixture from Task 1. If it was modified by the baseline run, recreate it from Task 1 Step 1 first:

```bash
git checkout -- /tmp/strict-simplify-fixture.py 2>/dev/null || true   # (it's untracked; recreate from Task 1 Step 1 if needed)
```

- [ ] **Step 1: Recreate a clean fixture**

Re-create `/tmp/strict-simplify-fixture.py` with the exact content from Task 1 Step 1 (overwrite any baseline edits).

- [ ] **Step 2: Run the scenario WITH the skill**

Dispatch a subagent that is told to use the skill:

```
Use the Agent tool (subagent_type: general-purpose) with this prompt:

"Read skills/strict-simplify/SKILL.md and follow it exactly. Apply it to
/tmp/strict-simplify-fixture.py. Report the ledger, the diff, the skipped
list, and any bug report."
```

- [ ] **Step 3: Verify compliance (this is the pass/fail)**

The run PASSES only if ALL hold:
- ✅ Applied: `sum(nums)`, `target in arr`, `if flag:`.
- ✅ SKIPPED with reason: `pick` (`cond or fallback` — cond is a value), `build` (`"" +` — operand type unknown).
- ✅ Did NOT touch: the stale comment, the `tmp` name, function ordering.
- ✅ REPORTED (did not fix): the `divide` zero-division bug.

If any check fails, this is a loophole → go to Task 3b.

- [ ] **Step 4: No commit** (verification only; fixture is temporary)

---

### Task 3b: REFACTOR — Close loopholes (only if Task 3 failed)

**Files:**
- Modify: `skills/strict-simplify/SKILL.md`

- [ ] **Step 1: Identify the exact rationalization**

Quote the subagent's verbatim reasoning for each violation (e.g. "I removed the comment because it was stale").

- [ ] **Step 2: Add an explicit counter**

Add the specific rationalization to the **Counter-Examples** table or the **Red Flags** list in `SKILL.md`. Be specific — name the exact move that was wrong.

- [ ] **Step 3: Re-run Task 3 Steps 1–3 until all four checks pass.**

- [ ] **Step 4: Commit**

```bash
git add skills/strict-simplify/SKILL.md
git commit -m "fix(strict-simplify): close loophole — <specific over-reach>"
```

---

### Task 4: Register in `marketplace.json`

**Files:**
- Modify: `marketplace.json` (the `skills` array; add after the `cavecrew` entry, which is the last element)

- [ ] **Step 1: Add the manifest entry**

Find the `cavecrew` object (the last element of the `skills` array). Add a comma after its closing `}` and insert this object before the array's closing `]`:

```json
    {
      "name": "strict-simplify",
      "path": "skills/strict-simplify/SKILL.md",
      "description": "Replace redundant or verbose logic with a provably-equivalent simpler form, apply the edits, and show the diff. Strict: no restructuring, renaming, reformatting, optimizing, or bug-fixing.",
      "category": "review",
      "tags": ["review", "simplify", "refactor"],
      "version": "0.1.0"
    }
```

- [ ] **Step 2: Validate JSON**

Run:
```bash
python3 -c "import json; json.load(open('marketplace.json')); print('marketplace.json OK')"
```
Expected: `marketplace.json OK` (no traceback).

- [ ] **Step 3: Commit**

```bash
git add marketplace.json
git commit -m "feat(strict-simplify): register in marketplace manifest"
```

---

### Task 5: Add to `onboarding/skills-list.md`

**Files:**
- Modify: `onboarding/skills-list.md` (the "Review Skills" table)

- [ ] **Step 1: Add the row**

In the `## Review Skills` table, add this row after the `requesting-code-review` row:

```markdown
| strict-simplify | `/strict-simplify` | Replace redundant/verbose logic with a provably-equivalent simpler form. Applies edits, shows the diff. No restructuring, renaming, reformatting, optimizing, or bug-fixing. |
```

- [ ] **Step 2: Verify the table renders**

Run:
```bash
grep -A6 "## Review Skills" onboarding/skills-list.md
```
Expected: the table now includes the `strict-simplify` row with three columns intact.

- [ ] **Step 3: Commit**

```bash
git add onboarding/skills-list.md
git commit -m "docs(strict-simplify): add to onboarding skills list"
```

---

### Task 6: Bump plugin version

A new skill is a feature addition → minor version bump `0.2.3` → `0.3.0`, in **both** files (per the release-process memory; mismatched versions break update detection).

**Files:**
- Modify: `marketplace.json` (top-level `"version"`)
- Modify: `.claude-plugin/plugin.json` (`"version"`)

- [ ] **Step 1: Bump `marketplace.json`**

Change the top-level field:
```json
  "version": "0.2.3",
```
to:
```json
  "version": "0.3.0",
```

- [ ] **Step 2: Bump `.claude-plugin/plugin.json`**

Change:
```json
  "version": "0.2.3",
```
to:
```json
  "version": "0.3.0",
```

- [ ] **Step 3: Verify both match**

Run:
```bash
python3 -c "import json; a=json.load(open('marketplace.json'))['version']; b=json.load(open('.claude-plugin/plugin.json'))['version']; print(a, b); assert a==b=='0.3.0', 'version mismatch'"
```
Expected: `0.3.0 0.3.0`, no assertion error.

- [ ] **Step 4: Commit**

```bash
git add marketplace.json .claude-plugin/plugin.json
git commit -m "chore: bump version to 0.3.0 for strict-simplify"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm all pieces are in place**

Run:
```bash
test -f skills/strict-simplify/SKILL.md && echo "SKILL.md: OK"
python3 -c "import json; m=json.load(open('marketplace.json')); assert any(s['name']=='strict-simplify' for s in m['skills']), 'not in manifest'; print('manifest entry: OK')"
grep -q "strict-simplify" onboarding/skills-list.md && echo "onboarding: OK"
python3 -c "import json; assert json.load(open('marketplace.json'))['version']=='0.3.0' and json.load(open('.claude-plugin/plugin.json'))['version']=='0.3.0'; print('versions: OK')"
git status --short
```
Expected: four `OK` lines, and a clean (or only-expected) git status.

- [ ] **Step 2: Clean up the temp fixture**

```bash
rm -f /tmp/strict-simplify-fixture.py && echo "fixture removed"
```

- [ ] **Step 3: Report completion** with: which checks in Task 3 passed, how many loophole iterations Task 3b required (if any), and the final commit list.

---

## Notes for the implementer

- **Source of truth** for every wording/example is `docs/superpowers/specs/2026-05-31-strict-simplify-design.md`. If something here seems thin, the spec has the full 18-example calibration set.
- **Do not commit the temp fixture** — it lives in `/tmp` and is removed in Task 7.
- The skill is documentation, so "tests" are subagent pressure scenarios (Tasks 1 & 3), per the `writing-skills` Iron Law: no skill without a failing baseline first.
- **No co-author trailers** in commit messages (repo convention).
