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
2. **Self-evident by reading** — equivalence is obvious from the diff alone. No execution.
   Documented language/standard-library semantics count as "reading" (you may rely on what
   `sum`, `includes`, or a default argument is *specified* to do); assumptions about *your
   own* untested code paths do not.
3. **No signature / type / API change** — nothing observable to callers changes.
4. **No change to side effects, evaluation order, or error/exception behavior.**
5. **Local** — within an expression/statement/line, not a cross-function move. Inlining a
   single-use variable into the very next line counts as local.
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
- No dead-code removal (unused variables, imports, functions) — that is a separate concern.
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

## Examples — acceptable *only when the inline condition holds*

Each row is a candidate, not a guarantee. The `// SKIP if …` and `// only if …` notes are
**gates, not footnotes**: if you cannot confirm the condition by reading, the change is not
acceptable — skip it.

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
| `flag == True` → `bool(flag)` or `if flag:` when type unknown | `is_ok(2)`: `2 == True` is `False` but `bool(2)` is `True` — differs unless `flag` is provably bool |
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
