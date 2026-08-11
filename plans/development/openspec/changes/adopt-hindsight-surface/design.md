## Context

See proposal.md — Why. The design-relevant state, measured against every skill in
this repo plus the routing policy:

- **Covered:** `retain`, `sync_retain`, `recall`, `reflect`, bank create/list,
  `get_operation`.
- **Absent from all guidance:** the mental-model family (6 tools), the directive
  family (3), the document family (3), and curation — `invalidate_memory`,
  `update_memory`, `list_memories`, `clear_memories`, `list_tags`. Twelve of
  thirteen sampled names appear nowhere.
- The routing policy already carries measured operational facts: `recall` is free
  and ~0.35 s, `sync_retain` is two model calls and ~7 s, `reflect` is three and
  ~14 s and fails silently at low `max_tokens`. Banks run in `verbatim` mode; the
  advisory `retain_mission` was measured being ignored on structure-only input.
  Whatever this change adds should meet that evidentiary bar.
- Two live counter-examples of trusting names over behaviour, both already
  recorded: `tags` do not filter recall, and `PUT` on an existing bank updates
  rather than erroring.
- The policy is injected into every session on machines that install it, so its
  length is a running cost, not a one-off.

## Goals / Non-Goals

**Goals:**

- A stated correction path, so the policy's own warning about low-value memories
  has a remedy.
- Every capability family accounted for — adopted with a purpose, or declined
  with a reason.
- Anything adopted lands where routing already lives.

**Non-Goals:**

- **Replacing `reflect` with mental models.** They may overlap; deciding that is
  out of scope and would be its own change.
- Restructuring the existing bank layout or re-retaining anything already stored.
- Adopting a family because it exists. "Declined, because X" is a successful
  outcome here and should be as easy to write as an adoption.

## Decisions

**Curation first, and separately gated.** It is the only family where the policy
states a need and supplies no remedy, so it carries the least uncertainty and the
most value. Sequencing it first means the change delivers something real even if
the evaluation phases conclude "decline" across the board.

**Behaviour is established by exercising the tools, not by reading their names.**
This is not general caution — it is the specific lesson of `tags` and of `PUT`,
both of which behaved contrary to their names on this exact store and are already
written down. *Consequence:* the evaluation costs model calls, which the change
budgets rather than hides.

**Adoption extends the routing policy; it does not add a document.** A "hindsight
skill" restating routing the policy owns would be the fourth
duplicate-source-of-truth defect removed here in a week — and the in-repo example
of how that decays is `plan/explanation-principles.md`, which declares itself
canonical from inside a gitignored directory. *Alternative rejected:* a skill per
family — five documents describing one store, none authoritative.

**A skill is warranted only for a gated procedure.** The test is whether the
capability needs a *sequence with stops* rather than a *rule an agent applies in
place*. Rules go in the policy; procedures may earn a skill, proposed separately
so it cannot be smuggled in under an evaluation.

**Every adoption names its trigger.** Guidance with no trigger is dead text that
costs context on every load and changes nothing — the failure this repo's own
authoring standard exists to prevent. Naming the trigger also makes "never
triggered" observable, which is the only way an adoption can later be reversed on
evidence.

**A decline is written into the policy, not just into a session.** The question
"why aren't we using mental models?" will be asked again by someone reading the
tool list; an unanswered question gets re-evaluated at full cost.

## Risks / Trade-offs

- **Adopting a capability nobody then uses** — the policy grows, every session
  pays, and nothing changes. → Each adoption names its trigger, so disuse is
  detectable rather than invisible, and reversible on that evidence.

- **The evaluation costs real model calls** against the live store. → Bounded:
  roughly `reflect`-scale per probe, not bench-scale. Recorded in close-out so a
  future re-evaluation is budgeted rather than guessed.

- **Mental models may substantially overlap `reflect`.** If they do, adopting
  both without a stated boundary creates two ways to ask the same question. →
  Adoption is conditional on being able to state what belongs in a mental model
  *versus* a retained memory; failing to state it is a decline, not a shrug.

- **Curation guidance could encourage over-deletion.** A store that forgets
  aggressively is as broken as one that only accumulates, and the reasoning
  behind a superseded memory often outlives the fact. → The spec requires
  distinguishing update from invalidate precisely so a stale detail does not take
  its rationale with it.

- **The policy block grows on every machine.** → It is checked against its own
  budget in phase 4, on the same principle the authoring standard applies to
  skills: earn the tokens or do not ship.

## Migration Plan

No data migration. Nothing already stored is altered, re-retained, or moved;
this changes what agents are told they may do with it.

Rollout is ordered by certainty: curation (need already stated) → mental models
(capability, unevaluated) → directives and documents (capability, unevaluated) →
budget check across whatever survived.

Machines pick the guidance up when `memory-setup` next writes their routing
block. Existing memories are unaffected either way.

Rollback is per-section and covered in proposal.md — Rollback Plan.

## Open Questions

- **Does `create_directive` overlap `retain_mission`,** which this project
  already sets and has measured as advisory rather than enforced? If directives
  are enforced where the mission is not, that changes their value considerably —
  but it is a phase-3 finding, not a precondition for starting.
- **Do documents belong to this store at all,** given the repo already routes
  committed prose to `plans/architecture/` and structural truth to the code
  graph? Likely a decline; worth confirming rather than assuming.
- **Should the evaluation run against the project bank or a scratch bank?** A
  scratch bank isolates the experiment; the project bank exercises real data.
  Affects the probe setup only, not the specs or the task breakdown.
