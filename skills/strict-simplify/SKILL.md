---
name: strict-simplify
description: Use when reviewing code to replace redundant or verbose logic with a provably-equivalent simpler form — custom code that duplicates a stdlib/builtin or an existing project function, dead/no-op arguments, collapsible redundant expressions, duplicate inline logic that reimplements something already defined in the codebase. Triggers on "strict simplify", "/strict-simplify", "reduce redundant code". Does not restructure, rename, reformat, optimize, or fix bugs.
---

# Strict Simplify

## Overview

Replace code **only** when the replacement is provably identical in behavior and the
equivalence is **clear from reading the diff**. The output is a git diff a human can
approve line-by-line without running the code to trust it.

This skill does **less than `simplify` on purpose.** It does not restructure, rename,
reformat, optimize, or fix bugs. Narrowness is the feature.

## The Equivalence Gate

A change is allowed **only if it passes ALL six checks.** Otherwise: **skip it.**

1. **Identical behavior** for every input, including edge cases and error paths.
2. **Clear by reading the diff** — equivalence is clear from reading the diff. No execution.
   Documented language/standard-library semantics count as "reading" (you may rely on what
   `sum`, `includes`, or a default argument is *specified* to do); assumptions about *your
   own* untested code paths do not.
3. **No signature / type / API change** — nothing observable to callers changes.
4. **No change to side effects, evaluation order, or error/exception behavior.**
5. **Local** — not a cross-function move. Inlining a single-use variable into the very next
   line counts as local.
6. **When in doubt about equivalence, skip.** The doubt that blocks a change is doubt about
   *behavioral equivalence* — checks 1–5. It is **never** a subjective "the result reads
   worse," "the original is prettier," or "it's a stylistic wash." Once checks 1–5 hold, the
   change is a candidate; apply it. Do not withhold a provably-equivalent simplification on
   taste. Aesthetic preference is not a gate.

> Violating the letter of these is violating the spirit. "Basically the same" that fails any
> one check is not a candidate. If you cannot write a clear "why equivalent"
> justification, it is not a candidate. But the converse also binds: if you *can* write that
> justification and checks 1–5 hold, "I'd have written it differently" does not earn a skip.

## In-Scope Categories

1. **Custom → stdlib/builtin** — hand-rolled logic replaced by an exact standard-library
   equivalent (manual sum loop → `sum()`).
2. **Dead / no-op values & args** — remove arguments/values with no effect
   (`from("", "", "Zord")` → `from("Zord")`, when a matching signature exists).
3. **Redundant logic collapse** — `if x { true } else { false }` → `x`; double negation; a
   variable assigned once and used once on the next line. This explicitly includes a **chain**
   of such rebinds (commonly shadowing one name, e.g. `let line = …; let line = line.…; let
   line = line.…`), where each binding is consumed exactly once by the next: collapse the
   entire chain into a single expression. Each link independently passes the "single-use, next
   line" test in check 5, so the chain does too — the number of links is **not** a reason to
   stop, and the resulting method chain being longer or "flatter" than the named steps is a
   taste call, not a gate (see check 6). Evaluation order and every call are preserved, so
   this is inlining, not the reordering/restructuring that is out of scope.
4. **Verbose → idiomatic equivalent** — a verbose construct → a shorter one doing *exactly*
   the same thing (manual transform loop → `map`/comprehension).
5. **Duplicate inline logic → existing project function** — inline code that reimplements
   logic already defined elsewhere in the codebase, OR multiple call sites that each
   reimplement the same operation instead of calling the one function that already does it.
   Replace the inline copy with a call to the existing function.
   - The existing function must already exist — do not create one.
   - Its behavior must provably match for every input the call site handles.
   - If two project functions do the same thing with slight discrepancies, pick the one
     whose behavior is correct for the call site and route all call sites to it. Do not
     merge the functions themselves — that is restructuring.

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
- No new abstractions, helpers, or layers — but replacing inline logic with an *existing* project function is in scope (category 5).
- No dead-code removal (unused variables, imports, functions) — that is a separate concern.
- No formatting-only or whitespace-only changes.
- No changes that alter logs, errors, or serialized output.

## Process

1. **Preflight** — run `git status`. If the working tree is **not clean**, STOP and ask the
   user to commit or stash first, so the simplification diff stays isolated.
2. **Target** — whole repo by default; if the user passed a path, restrict to it.
3. **Discover** — read the code and build a candidate ledger. Each row:
   `file:line · category · current → proposed · why-equivalent`.
   Drop every row that fails the gate.
4. **Apply** — apply all surviving candidates. Leave edits **unstaged**.
5. **Report** — show `git diff` + the ledger, plus a short
   **"found but skipped — not provably equivalent"** list so nothing is silently dropped.
   If you found a bug, report it here too — do not fix it.

For very large repos you MAY delegate discovery to `cavecrew` subagents. Optional, not required.

## Examples — acceptable *only when the inline condition holds*

These are illustrative, not exhaustive. The gate applies to any redundancy you find, not
just these shapes.

Each example is a candidate, not a guarantee. The `// SKIP if …` and `// only if …` notes are
**gates, not footnotes**: if you cannot confirm the condition by reading, the change is not
acceptable — skip it.

**Custom → stdlib/builtin**
```python
total = 0
for n in nums: total += n        # →
total = sum(nums)
```
```python
biggest = items[0]
for x in items[1:]:
    if x > biggest: biggest = x   # →
biggest = max(items)   # items[0] already raises on empty — max([]) does too; behavior preserved
```
```js
let found = false;
for (const x of arr) if (x === target) { found = true; break; }   // →
const found = arr.includes(target);   // SKIP if target may be NaN
```
```python
out = ""
for i, part in enumerate(parts):
    out += part
    if i < len(parts) - 1: out += ", "   # →
out = ", ".join(parts)   # parts must be strings (already required by the +=)
```

**Dead / no-op values & args**
```rust
directories::from("", "", "Zord")   // →  directories::from("Zord")   // only if a 1-arg signature exists
```
```python
json.dumps(data, indent=None)   // →  json.dumps(data)   // None is the documented default
```
```js
const url = "" + base + "/" + path;   // →
const url = base + "/" + path;   // SKIP if base may be non-string (leading "" was coercing)
```
```rust
fn log_it(x: i32) { println!("{x}"); return; }   // →
fn log_it(x: i32) { println!("{x}"); }   // trailing bare return in a unit fn is a no-op
```

**Redundant logic collapse**
```go
if x > 0 { return true } else { return false }   // →  return x > 0
```
```python
result = compute(x)
return result            # →  return compute(x)   // assigned once, used once
```
```rust
// chain of single-use shadow rebinds — each `line` used once by the next
let line = raw.lines().find(|l| !l.is_empty()).unwrap_or("");
let line = line.trim_start_matches("Title:").trim();
let line = line.trim_matches(['"', '\'']);
line.chars().take(80).collect()
// →  collapse the whole chain; order and every call preserved:
raw.lines().find(|l| !l.is_empty()).unwrap_or("")
    .trim_start_matches("Title:").trim()
    .trim_matches(['"', '\''])
    .chars().take(80).collect()
```
```js
if (!(!isReady)) { ... }   // →  if (isReady) { ... }   // SKIP if isReady is non-boolean (!! was coercing)
```

**Verbose → idiomatic equivalent**
```python
out = []
for x in xs:
    if x > 0: out.append(x)      # →
out = [x for x in xs if x > 0]
```
```ts
const name = user && user.profile ? user.profile.name : undefined;   // →
const name = user?.profile?.name;   // SKIP if user may be 0/"" — ?. guards nullish, && guards falsiness
```

**Duplicate inline logic → existing project function**
```python
# call site A — reimplements logic inline
stem = Path(filename).stem.lower()
for room, keywords in ROOM_KEYWORDS.items():
    if any(k in stem for k in keywords):
        return room
return "general"

# call site B — existing function already does this
return infer_room(filename)   # only if infer_room() is provably identical for all inputs A handled
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
| Two functions differ slightly — merge them into one | Merging/restructuring functions is out of scope; only route call sites |
| Existing function handles a superset of inputs — assume it's safe | Verify the extra input handling doesn't change behavior at this call site |

## Red Flags — STOP, you are over-reaching

- You're editing a comment, blank line, or whitespace.
- You're renaming or moving something.
- You're about to write "this is basically the same" instead of a clean equivalence line.
- You're "improving" performance.
- You're fixing a bug.
- You're relying on assumptions rather than what you can read — that means **skip**, not "probably fine".
