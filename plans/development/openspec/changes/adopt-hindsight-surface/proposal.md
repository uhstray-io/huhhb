## Why

hindsight is the experience store this project routes to, and huhhb ships
guidance for roughly a fifth of what it can do. Measured against every skill in
this repo plus the routing policy, twelve of thirteen sampled capabilities appear
**nowhere**:

| Family | Tools | Mentioned |
|---|---|---|
| Mental models | create / get / list / update / refresh / clear | **no** |
| Directives | create / list / delete | **no** |
| Documents | get / list / delete | **no** |
| Memory curation | invalidate / update / list / clear / list_tags | **no** |
| Core | retain, sync_retain, recall, reflect, banks, operations | yes |

The curation gap is the one that costs something today. The routing policy warns
that *"a store full of low-value memories retrieves worse than a small one"* and
instructs deleting memories that turn out to be wrong — then names no tool for
doing it. `invalidate_memory` exists. A store that can only accumulate degrades
by construction, and the policy already knows it.

Mental models and directives are a different kind of gap: not a stated need with
no remedy, but capability nobody has evaluated. They may be the right home for
things this repo currently keeps elsewhere, or they may not fit at all. Either
answer is worth having deliberately.

## What Changes

- **Curation becomes reachable.** The routing policy gains a correction path:
  when a retained memory is wrong or superseded, which tool retires it, and what
  distinguishes invalidating from updating from clearing. This closes a gap the
  policy itself opens.
- **Mental models are evaluated and then either adopted or ruled out in
  writing.** If adopted, the policy says what belongs in one versus in a retained
  memory. If ruled out, the reason is recorded so the question is not re-opened
  every time someone reads the tool list.
- **Directives and documents get the same treatment** — adopted with a stated
  role, or ruled out with a stated reason.
- Whatever is adopted lands in the **routing policy**, which is where read/write
  routing already lives. Nothing here becomes a new skill unless a capability
  needs a procedure rather than a rule.

**The constraint that shapes this change:** huhhb has removed three separate
duplicate-source-of-truth defects in the past week. A "hindsight skill" that
restates routing the policy already owns would be the fourth. Adoption means
extending the one document that governs this, not standing up a second.

## Capabilities

### New Capabilities

- `hindsight-usage`: which of the experience store's capabilities this project
  uses, what each is for, and the obligation to record a rejection as
  deliberately as an adoption.

### Modified Capabilities

None. `memory-routing` governs which stores are installed; this governs how the
one we route to is used.

## Impact

- The routing policy block that `memory-setup` writes into the operator's global
  configuration (`reference.md` phase 3) — the correction path, and whatever
  mental-model or directive guidance survives evaluation.
- `skills/repo-memory/` and `skills/fix-memory/` may need to name the correction
  path where they currently describe retiring or migrating a record.
- **Cost:** evaluating mental models means exercising them against the live
  store — model calls at roughly the measured `reflect` cost, not free but not
  bench-scale.
- **Out of scope:** replacing `reflect` with mental models, or restructuring the
  existing bank layout. This change decides what to *use*, not how to reorganise
  what is already stored.

## Rollback Plan

Documentation and policy text; nothing executes against it.

- **The correction path** — revert the policy block. No memory is altered by
  documenting how to invalidate one.
- **Adopted capabilities** — revert their policy sections. Anything already
  created through them (a mental model, a directive) remains in the store and is
  removable through its own tool; the store outlives this repo's guidance either
  way.
- **Recorded rejections** — reverting loses the reasoning, which is the actual
  cost. That is why a rejection is written into the policy rather than into a
  session transcript.

The genuine risk is adopting a capability into the policy and then not using it:
guidance for a tool nobody reaches for is the dead text this repo's own standard
warns against. Each adoption should therefore name the situation that triggers
it, so "never triggered" is observable rather than invisible.
