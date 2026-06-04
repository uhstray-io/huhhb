---
name: strict-refactor
description: Use when a large function, component, or call site needs decomposing into named single-purpose units — extract computation blocks, guard clauses, setup phases, UI subtrees, or bundled parameter groups, or move a function to a better module. Triggers on "strict refactor", "/strict-refactor", "extract function", "extract component", "break up this function", "split into smaller functions", "group these parameters". Changes structure only — no logic, no renames, no designed abstractions.
---

# Strict Refactor

## Overview

Decompose large functions into named, single-purpose units **only when the extraction is
mechanical** — identical logic, only a naming decision was made. The body of the extracted
function must be the original block verbatim, with outer-scope variables replaced by
parameters. The output is a git diff a human can approve line-by-line without running the
code to trust it.

This skill does **less than a general refactor on purpose.** It does not rename, optimize,
restructure control flow, or introduce designed abstractions. It introduces only mechanical
containers — named homes for verbatim-moved blocks where the only decisions made were a
name and the list of inputs to thread through. Narrowness is the feature.

## The Extraction Gate

An extraction is allowed **only if it passes ALL seven checks.** Otherwise: **skip it.**

1. **Behavior identical** — the extracted function called with the same inputs produces
   the same outputs and side effects as the original block. The body is verbatim — outer-
   scope variables become parameters, nothing else changes.
2. **Single entry, single exit** — the block has no `return`, `break`, or `continue`
   that exits the *outer* function. Extraction would change control flow, not just structure.
   For declarative subtrees (UI, templates), the subtree has one clear boundary and replaces
   a single expression at the call site.
3. **Explicit inputs** — every variable the block reads from the outer scope becomes an
   explicit parameter. No closures over mutable outer state.
4. **One logical result** — the block produces a value, a tuple of tightly related values,
   pure side effects, or one rendered subtree — not a mix of unrelated outputs.
5. **Name is obvious** — the function's name must be immediately clear from the logic.
   If you can't name it in 2–3 words without "and", the block has two responsibilities
   and is not ready to extract.
6. **Diff is readable** — new function + call site are both short enough to verify
   correctness at a glance, without running the code.
7. **When in doubt, skip.** Bias is always toward leaving code alone.

> Violating the letter of these is violating the spirit. "Basically the same" that fails
> any one check is not a candidate. If you cannot write a clear "why equivalent"
> justification, it is not a candidate.

**Mechanical vs designed test.** Introducing a new named unit (function, component,
parameter object, or module) is allowed only if the entire design required exactly two
decisions: (1) what to name it, and (2) which inputs to thread through explicitly. The
moment a third decision appeared — choosing an interface, generalizing for reuse,
adding indirection, changing a type's meaning — it became a designed abstraction and
is out of scope.

**Behavior and identity rule.** When a captured input carries behavior or identity rather
than a plain value — a reactive handle or signal, a reference or pointer, a callback or
handler, a mutable borrow, a channel — thread the handle itself through unchanged. Never
substitute a snapshot, clone, or copied value; that silently changes behavior even when
the code looks verbatim. This is the single most common way a "verbatim-looking"
extraction can break behavior.

A single call site is not a reason to skip. A block with a meaningful boundary and a
clear name is justified by readability alone.

## In-Scope Categories

1. **Extract pure computation** — a block that reads inputs from outer scope, computes
   a result, has no side effects → extract to a function returning that result.
2. **Extract guard block** — a group of related validation or assertion conditions →
   extract to a void function that throws or returns on failure.
3. **Extract setup phase** — a sequential initialization block (build a context, configure
   a struct, assemble a request) → extract to a function returning the constructed value.
4. **Move function** — a function defined in the wrong module/class/file → move it
   unchanged, update imports at call sites.
5. **Extract into a component** — move a verbatim UI or template subtree into a named
   component; captured state becomes explicit inputs/props; reactive handles, signals,
   and callbacks pass through unchanged — never as snapshots. No hooks or state may
   move into the extracted component unless they were already isolated to that subtree.
6. **Bundle inputs into a parameter object** — a long verbatim cluster of related
   arguments grouped into a struct, record, or config object; fields are the original
   arguments, no defaults added, no logic changed.

These name common shapes; they are **not a closed list.** Any mechanical container with
a clear name and single responsibility is a candidate — the kind of container (function,
component, parameter object) is irrelevant; what qualifies it is that only a name and
an input list were decided. Ambition applies to *discovery* — the extraction gate is
non-negotiable.

## Hard Out-of-Scope (forbidden)

- No renaming variables, parameters, or functions.
- No reordering or restructuring control flow.
- No combining extraction with simplification — one pass at a time.
- No designed abstractions — no interfaces, traits, or base classes; no generalizing or
  parameterizing for reuse not already present in the original; no added indirection or
  configurability. Purely mechanical named containers (a function, component, or parameter
  object that required only a name and an input list) are allowed.
- No performance changes.
- No bug fixes — **if you find a bug, report it, do not fix it.**
- No dead-code removal.
- No formatting-only changes.
- No moving AND renaming in the same operation.

## Process

1. **Preflight** — run `git status`. If the working tree is **not clean**, STOP and ask
   the user to commit or stash first, so the refactor diff stays isolated.
2. **Target** — whole repo by default; if the user passed a path, restrict to it.
3. **Discover** — read the code and build a candidate ledger. Each row:
   `file:line · category · block description → proposed name · one-line why-equivalent`.
   Drop every row that fails the gate.
4. **Apply** — apply all surviving candidates. Leave edits **unstaged**.
5. **Report** — show `git diff` + the ledger, plus a short **"found but skipped"** list
   so nothing is silently dropped. If you found a bug, report it here — do not fix it.

## Examples — acceptable *only when the inline condition holds*

Each example is a candidate, not a guarantee. The `// SKIP if …` and `// only if …` notes
are **gates, not footnotes**: if you cannot confirm the condition by reading, skip it.

**Extract pure computation (Python)**
```python
# Before — inside a 90-line render_invoice()
subtotal = 0
for item in line_items:
    subtotal += item.qty * item.unit_price
tax = subtotal * tax_rate
total = subtotal + tax

# After
def _compute_invoice_totals(line_items, tax_rate):
    subtotal = 0
    for item in line_items:
        subtotal += item.qty * item.unit_price
    tax = subtotal * tax_rate
    return subtotal, tax, subtotal + tax

subtotal, tax, total = _compute_invoice_totals(line_items, tax_rate)
# Why equivalent: verbatim block, outer vars became parameters
```

**Extract pure computation (Rust)**
```rust
// Before — inside a 70-line process_report()
let mut buckets: HashMap<String, Vec<f64>> = HashMap::new();
for record in &records {
    buckets
        .entry(record.category.clone())
        .or_default()
        .push(record.value);
}

// After
fn group_by_category(records: &[Record]) -> HashMap<String, Vec<f64>> {
    let mut buckets: HashMap<String, Vec<f64>> = HashMap::new();
    for record in records {
        buckets
            .entry(record.category.clone())
            .or_default()
            .push(record.value);
    }
    buckets
}

let buckets = group_by_category(&records);
// Why equivalent: verbatim loop, records became parameter
```

**Extract guard block (TypeScript)**
```typescript
// Before — inside an 80-line processOrder()
if (!order.items || order.items.length === 0) {
    throw new Error('Order has no items');
}
if (!order.customerId) {
    throw new Error('Order has no customer');
}
if (order.total < 0) {
    throw new Error('Order total cannot be negative');
}

// After
function assertOrderIsValid(order: Order): void {
    if (!order.items || order.items.length === 0) {
        throw new Error('Order has no items');
    }
    if (!order.customerId) {
        throw new Error('Order has no customer');
    }
    if (order.total < 0) {
        throw new Error('Order total cannot be negative');
    }
}

assertOrderIsValid(order);
// Why equivalent: same conditions, same throws, verbatim body
```

**Extract guard block (Go)**
```go
// Before — inside a 60-line SaveUser()
if user.Email == "" {
    return fmt.Errorf("email required")
}
if len(user.Password) < 8 {
    return fmt.Errorf("password too short")
}
if user.Role != "admin" && user.Role != "member" {
    return fmt.Errorf("invalid role: %s", user.Role)
}

// After
func validateUser(user User) error {
    if user.Email == "" {
        return fmt.Errorf("email required")
    }
    if len(user.Password) < 8 {
        return fmt.Errorf("password too short")
    }
    if user.Role != "admin" && user.Role != "member" {
        return fmt.Errorf("invalid role: %s", user.Role)
    }
    return nil
}

if err := validateUser(user); err != nil {
    return err
}
// Why equivalent: same conditions, same errors, verbatim body
// SKIP if the outer function had additional error handling around these checks
```

**Extract setup phase (Go)**
```go
// Before — inside a 120-line handleRequest()
ctx := context.Background()
ctx = context.WithValue(ctx, "requestID", uuid.New().String())
ctx = context.WithValue(ctx, "userID", req.Header.Get("X-User-ID"))
logger := log.With(ctx, "requestID", ctx.Value("requestID"))

// After
func buildRequestContext(req *http.Request) (context.Context, *log.Logger) {
    ctx := context.Background()
    ctx = context.WithValue(ctx, "requestID", uuid.New().String())
    ctx = context.WithValue(ctx, "userID", req.Header.Get("X-User-ID"))
    return ctx, log.With(ctx, "requestID", ctx.Value("requestID"))
}

ctx, logger := buildRequestContext(req)
// Why equivalent: verbatim block, req became parameter
```

**Extract setup phase (JavaScript)**
```js
// Before — inside a 100-line submitForm()
const headers = new Headers();
headers.append('Content-Type', 'application/json');
headers.append('Authorization', `Bearer ${token}`);
headers.append('X-Request-ID', crypto.randomUUID());
const request = new Request(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });

// After
function buildApiRequest(endpoint, token, payload) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);
    headers.append('X-Request-ID', crypto.randomUUID());
    return new Request(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
}

const request = buildApiRequest(endpoint, token, payload);
// Why equivalent: verbatim block, outer vars became parameters
```

**Extract into a component (TSX/JSX)**
```tsx
// Before — inside a 90-line OrderPage component
<div className="order-summary">
  <h2>{order.id}</h2>
  <p>{order.customerName}</p>
  <ul>
    {order.items.map(item => (
      <li key={item.id}>{item.name} × {item.qty}</li>
    ))}
  </ul>
</div>

// After
function OrderSummary({ order }: { order: Order }) {
    return (
        <div className="order-summary">
            <h2>{order.id}</h2>
            <p>{order.customerName}</p>
            <ul>
                {order.items.map(item => (
                    <li key={item.id}>{item.name} × {item.qty}</li>
                ))}
            </ul>
        </div>
    );
}

<OrderSummary order={order} />
// Why equivalent: verbatim subtree, order is a prop not a snapshot, no state or hooks moved
// SKIP if the subtree uses hooks (useState, useEffect) that are not isolated to this subtree
// SKIP if passing a snapshot of a ref/signal instead of the handle itself
```

**Bundle inputs into a parameter object (TypeScript)**
```typescript
// Before — long argument cluster repeated across call sites
createReport(userId, startDate, endDate, format, locale, timezone);

// After
interface ReportParams {
    userId: string;
    startDate: Date;
    endDate: Date;
    format: string;
    locale: string;
    timezone: string;
}

function createReport(params: ReportParams) { ... }  // verbatim body, args → params.x

createReport({ userId, startDate, endDate, format, locale, timezone });
// Why equivalent: fields are the original args verbatim, no defaults added, no logic changed
// SKIP if any call site passes a different value for any field — each must match exactly
```

**Move function (Python)**
```python
# Before — utils.py contains calculate_discount() but it only operates on membership tiers

# utils.py
def calculate_discount(membership: str, subtotal: float) -> float:
    if membership == 'premium':
        return subtotal * 0.1
    elif membership == 'gold':
        return subtotal * 0.2
    return 0.0

# billing.py
from utils import calculate_discount
discount = calculate_discount(user.membership, subtotal)

# After — move verbatim to pricing.py; update the import

# pricing.py
def calculate_discount(membership: str, subtotal: float) -> float:
    if membership == 'premium':
        return subtotal * 0.1
    elif membership == 'gold':
        return subtotal * 0.2
    return 0.0

# billing.py
from pricing import calculate_discount  # only this line changes
discount = calculate_discount(user.membership, subtotal)

# Why equivalent: body unchanged, only module location changed
# SKIP if moving and renaming in the same operation
# SKIP if other modules also import from utils — update all call sites or skip
```

## Counter-Examples — SKIP These

| Block | Why skip |
|-------|----------|
| Block contains `return` that exits the outer function | Extraction changes it to a local return — control flow differs |
| Block contains `break` or `continue` inside a loop in the outer function | Same — control flow escapes the block; extraction changes semantics |
| Block mutates 3+ unrelated outer-scope variables | Output tuple becomes unwieldy; mutation semantics differ by language |
| Block is inside a `try/except` that catches its errors | Extraction changes which frame catches the exception |
| You can't name it without "and" (`load_and_validate`) | Two responsibilities — extract each separately or skip |
| Moving a function AND renaming it in one step | One operation at a time |
| You changed a variable name "for clarity" during extraction | Renaming is out of scope; revert and extract without renaming |
| Block reads from a variable that is mutated earlier in the same function and order matters | Extraction breaks the execution-order dependency |

## Red Flags — STOP, You Are Over-Reaching

- You renamed a variable during extraction ("cleaner this way").
- You added a default argument to make the signature "nicer".
- You're about to write "basically the same" instead of a clean equivalence line.
- You're combining this extraction with a simplification in the same change.
- You can't name the block without using "and".
- The block contains a `return`, `break`, or `continue` that exits the outer scope.
- You can't be 100% sure by reading alone — that means **skip**, not "probably fine".
- You generalized the signature or parameterized for a use case that doesn't exist yet.
- You introduced an interface, trait, or base class to make it pluggable or swappable.
- You passed a snapshot, clone, or copied value of a reactive handle, reference, or
  callback instead of the handle itself.
