# strict-simplify — Design Spec

**Date:** 2026-05-31
**Status:** Approved design, pending implementation plan
**Skill name:** `strict-simplify`

## Purpose & One-Line Identity

A strict, verifiable code-simplification reviewer. It replaces code **only** when the
replacement is provably identical in behavior and the equivalence is self-evident from
reading the diff. It does **not** restructure, rename, reformat, optimize, fix bugs, or
touch comments.

The output of a run is a git diff a human can parse line-by-line and approve without
needing to run the code to trust it.

## How It Differs From Neighboring Tools

| Tool | What it does | Bar |
| ---- | ------------ | --- |
| built-in `simplify` | broad reuse/simplification/efficiency/altitude cleanups, applies them | quality judgment |
| built-in `code-review` | hunts for correctness bugs + cleanups | finds problems |
| **`strict-simplify`** | replaces redundant/verbose logic with a provably-equivalent simpler form | **provable equivalence only** |

`strict-simplify` is intentionally the narrowest of the three. It does less, on purpose,
so its diffs are trustworthy by inspection.

## The Equivalence Gate (core of the skill)

A candidate is allowed **only if it passes ALL** of these. Otherwise it is **skipped**.

1. **Identical behavior** for every input, including edge cases and error paths.
2. **Self-evident by reading** — equivalence is obvious from the diff alone. No execution,
   no assumptions about untested paths.
3. **No signature/type/API change** — nothing observable to callers changes.
4. **No change to side effects, evaluation order, or error/exception behavior.**
5. **Local** — the change lives within an expression/statement/line, not a cross-function
   move or reorganization.
6. **When in doubt, skip.** The bias is always toward leaving code alone.

> Violating the letter of these is violating the spirit. A change that "is basically the
> same" but fails any single check is not a candidate.

## In-Scope Categories

1. **Custom → stdlib/builtin** — hand-rolled logic replaced by an exact standard-library
   equivalent.
2. **Dead / no-op values & args** — remove arguments or values that have no effect.
3. **Redundant logic collapse** — collapse provably-redundant expressions and single-use
   plumbing.
4. **Verbose → idiomatic equivalent** — a verbose construct replaced by a shorter one that
   does *exactly* the same thing.

These four name the common shapes; they are not a closed list. Generalize the underlying
principle to novel redundancies you find (see Examples §5), holding every new candidate to
the same gate.

## Hard Out-of-Scope (forbidden)

Stated explicitly in the skill so the agent can self-check:

- No comment removal or editing.
- No renaming (variables, functions, types, files).
- No reordering or restructuring of functions/blocks.
- No performance/efficiency changes (even if "obviously faster").
- No bug fixes — **if a bug is found, report it, do not fix it.**
- No new abstractions, helpers, or layers.
- No formatting-only or whitespace-only changes.
- No changes that alter what appears in logs, errors, or serialized output.

## Behavior & Flow

1. **Preflight** — check `git status`. If the working tree is not clean, stop and ask the
   user to commit or stash first, so the simplification diff stays isolated.
2. **Target** — whole repo by default; `/strict-simplify <path>` narrows it.
3. **Discover** — read code and build the candidate ledger:
   `file:line · category · current → proposed · one-line equivalence justification`.
   Drop everything that fails the gate.
4. **Apply** — apply all surviving candidates. Edits are left **unstaged**.
5. **Report** — show `git diff` + the ledger, plus a short
   *"found but skipped — not provably equivalent"* list so nothing is silently dropped.

For very large repos the skill **may** delegate discovery to `cavecrew` subagents; this is
an optional note, not built-in behavior for v1.

## Frontmatter

No `triggers` field (unsupported by VS Code agents — trigger phrases live in `description`).
Description states *when to use* only, never the workflow.

```yaml
name: strict-simplify
description: Use when reviewing code to replace redundant or verbose logic with a provably-equivalent simpler form — custom code that duplicates a stdlib/builtin, dead/no-op arguments, collapsible redundant expressions. Triggers on "strict simplify", "/strict-simplify", "reduce redundant code". Does not restructure, rename, reformat, optimize, or fix bugs.
```

---

# Examples (the calibration set)

These examples ARE the specification of the gate. The skill embeds them. Each acceptable
example shows `before → after` and **why it is provably equivalent**. The counter-examples
show changes that *look* like simplifications but fail the gate and **must be skipped**.

Examples span several languages to make the gate language-agnostic. The principle, not the
syntax, is what transfers.

## Category 1 — Custom → stdlib/builtin

### ✅ 1a. Manual sum loop → builtin (Python)
```python
# before
total = 0
for n in nums:
    total += n
# after
total = sum(nums)
```
**Why equivalent:** `sum` over the same iterable yields the identical numeric result and
iterates in the same order. No side effects in the loop body beyond accumulation.

### ✅ 1b. Hand-rolled max → builtin (Python)
```python
# before
biggest = items[0]
for x in items[1:]:
    if x > biggest:
        biggest = x
# after
biggest = max(items)
```
**Why equivalent:** `max` uses the same `>` comparison and the same first-wins tie behavior.
**Edge note:** only valid if `items` is known non-empty in both forms (the original indexes
`items[0]`, so emptiness already raises — `max([])` also raises). Behavior on empty is
preserved: both raise.

### ✅ 1c. Manual membership flag → `in` (JavaScript)
```js
// before
let found = false;
for (const x of arr) { if (x === target) { found = true; break; } }
// after
const found = arr.includes(target);
```
**Why equivalent:** `includes` uses SameValueZero; `===` matches it for all non-`NaN`
values. **Edge note:** if `target` could be `NaN`, behavior differs (`includes` finds `NaN`,
`===` does not) → in that case **skip**.

### ✅ 1d. Manual string join (Python)
```python
# before
out = ""
for i, part in enumerate(parts):
    out += part
    if i < len(parts) - 1:
        out += ", "
# after
out = ", ".join(parts)
```
**Why equivalent:** `join` produces the same separator placement. Requires `parts` to be
strings, which the `+=` already requires.

## Category 2 — Dead / no-op values & args

### ✅ 2a. Empty path segments (Rust — the motivating example)
```rust
// before
let dirs = directories::from("", "", "Zord");
// after
let dirs = directories::from("Zord");
```
**Why equivalent:** the empty leading arguments contribute nothing to the constructed path.
**Gate caveat:** only acceptable if a single-argument overload/signature exists and is
documented to produce the identical result; if the API requires three arguments, this is a
signature change → **skip**. (This is exactly the "self-evident by reading + no signature
change" check in action.)

### ✅ 2b. Redundant default argument (Python)
```python
# before
json.dumps(data, indent=None)
# after
json.dumps(data)
```
**Why equivalent:** `indent=None` is the documented default; passing it changes nothing.

### ✅ 2c. No-op concatenation (JavaScript)
```js
// before
const url = "" + base + "/" + path;
// after
const url = base + "/" + path;
```
**Why equivalent:** a leading `""` in string concatenation is a no-op. **Edge note:** only
when `base` is already a string; if the leading `""` was coercing a non-string `base`, the
behavior differs → **skip**.

### ✅ 2d. Redundant explicit return of unit/void
```rust
// before
fn log_it(x: i32) {
    println!("{x}");
    return;
}
// after
fn log_it(x: i32) {
    println!("{x}");
}
```
**Why equivalent:** a trailing bare `return;` in a unit function is a no-op.

## Category 3 — Redundant logic collapse

### ✅ 3a. Boolean if/else → expression (any language; Go shown)
```go
// before
if x > 0 {
    return true
} else {
    return false
}
// after
return x > 0
```
**Why equivalent:** the condition already is the boolean being returned.

### ✅ 3b. Double negation (JavaScript)
```js
// before
if (!(!isReady)) { ... }
// after
if (isReady) { ... }
```
**Why equivalent:** `!!x` on an already-boolean `isReady` is identity. **Edge note:** if
`isReady` is non-boolean and `!!` was being used to coerce, this changes the value in some
contexts → confirm it is already boolean, else **skip**.

### ✅ 3c. Single-use intermediate variable (Python)
```python
# before
result = compute(x)
return result
# after
return compute(x)
```
**Why equivalent:** `result` is assigned once and used once on the next line; inlining
changes nothing observable. **Edge note:** skip if `result` is referenced again later, or if
removing the name harms a debugger/breakpoint workflow the team relies on (out of scope to
judge — default skip if used more than once).

### ✅ 3d. Redundant boolean comparison (Python)
```python
# before
if is_active == True:
# after
if is_active:
```
**Why equivalent:** only when `is_active` is a genuine boolean. If it can be a truthy
non-`True` value (e.g. `1`), `== True` differs → **skip**.

### ✅ 3e. Ternary returning its own operands (TypeScript)
```ts
// before
const v = cond ? cond : fallback;
// after
const v = cond || fallback;
```
**Why equivalent:** **only** when `cond` is boolean. If `cond` is a value (e.g. `0`, `""`),
`||` changes behavior → **skip**. (Listed here deliberately as a near-miss.)

## Category 4 — Verbose → idiomatic equivalent

### ✅ 4a. Manual transform loop → map (Python)
```python
# before
out = []
for x in xs:
    out.append(x * 2)
# after
out = [x * 2 for x in xs]
```
**Why equivalent:** same order, same elements, same resulting list. No side effects in the
body beyond the append.

### ✅ 4b. Manual filter loop → filter comprehension (Python)
```python
# before
out = []
for x in xs:
    if x > 0:
        out.append(x)
# after
out = [x for x in xs if x > 0]
```
**Why equivalent:** identical predicate, order, and result.

### ✅ 4c. Verbose null guard → optional chaining (TypeScript)
```ts
// before
const name = user && user.profile ? user.profile.name : undefined;
// after
const name = user?.profile?.name;
```
**Why equivalent:** optional chaining short-circuits on `null`/`undefined` at each step and
yields `undefined`, matching the guard. **Edge note:** the original guards on falsiness
(`user && ...`), `?.` guards only on nullish — if `user` could be `0`/`""`, behavior differs
→ **skip**.

### ✅ 5. Others — generalize the principle, don't stop at this list

The examples above are **illustrative, not exhaustive.** They teach the *shape* of a valid
simplification; they do not enumerate every one. Be ambitious about discovery: a real
codebase will hold redundancies these four categories never named — language idioms, library
helpers, dead parameters, and collapsible expressions specific to the stack in front of you.
Hunt for them.

**The only thing that does not flex is the gate.** Ambition applies to *what you look for*,
never to *how sure you must be*. A novel candidate you discover yourself is held to the exact
same six checks as `1a`–`4c`: identical behavior, self-evident by reading, no signature/type
change, no side-effect/ordering/error change, local, and — when in doubt — skip. If you
cannot write the one-line "why equivalent" justification for a new find as cleanly as the
examples above do, it is not a candidate.

So: use judgment to find more than was listed, and use the same discipline to reject most of
what you find.

---

# Counter-Examples — looks simpler, but SKIP

These fail the gate. The skill must recognize and leave them alone. They are as important as
the positives.

### ❌ C1. Reordering for "cleanliness"
Moving a helper above its caller, regrouping imports, or sorting fields. **Why skip:**
restructuring, not simplification — and risks behavior changes (init order, side effects).

### ❌ C2. "Faster" rewrite
Replacing a readable loop with a bitwise trick, or swapping a data structure for a faster
one. **Why skip:** performance is explicitly out of scope; equivalence is also harder to
verify by reading.

### ❌ C3. Removing a "redundant" check that guards an edge case
```python
if items:               # looks redundant before a loop
    for x in items: ...
```
**Why skip:** the guard may protect a downstream assumption; removing it can change behavior
on empty input. Not self-evidently equivalent.

### ❌ C4. Collapsing across a side effect
```js
const a = f();   // f() logs / mutates
const b = a + 1;
return b;
```
Inlining `f()` is fine only if `f` is pure. **Why skip by default:** purity is not
self-evident from the diff alone unless `f` is visibly pure.

### ❌ C5. Comment or formatting cleanup
Deleting a stale comment, collapsing blank lines, reflowing a long line. **Why skip:**
explicitly forbidden; not a logic simplification.

### ❌ C6. `||` / `?.` substitutions on non-boolean values
The near-misses from 3e and 4c when the operand can be falsy-but-not-nullish. **Why skip:**
behavior differs on `0`, `""`, `NaN`, `[]`-vs-null distinctions.

### ❌ C7. Renaming for clarity
`tmp` → `userCount`. **Why skip:** renaming is out of scope even though it "improves" code.

### ❌ C8. Fixing a bug found along the way
If a simplification candidate reveals a bug, **report it separately, do not fix it** in the
same pass.

---

# Repo Integration

- New `skills/strict-simplify/SKILL.md`.
- Add entry to `marketplace.json` — `category: "review"`, `tags: ["review","simplify","refactor"]`.
- Add to `onboarding/skills-list.md`.
- Bump version in **both** `marketplace.json` and `.claude-plugin/plugin.json` (release process).

# Testing (writing-skills Iron Law)

Before finalizing, run a baseline scenario **without** the skill on a file seeded with both
real candidates and the counter-examples above. Expected baseline failure: the agent
over-reaches (removes comments, restructures, applies `||`/`?.` substitutions on non-boolean
operands, "fixes" bugs). Then run **with** the skill and verify it applies only the provable
candidates and skips every counter-example, reporting the skips.
