# evolve anti-poisoning guardrails

Poisoning is the loop's costliest failure: a bad observation isn't a wrong
answer once — it's injected into *every* future session until someone catches
it (the Hermes scar behind the whole build plan). This document is the
defense-in-depth model: what "poisoning" means at each stage, and the
guardrail that stands there.

## Why one gate isn't enough

The capture-time anti-capture gate (`digest.py`) stops *known* poisoning
shapes — quoted examples, harness blocks, secrets. But this project's own
history proves the limit: `<ci-monitor-event>` blocks and eval-env
contamination both poisoned real memory *because they were novel* — no
pattern existed for them yet. Pattern-matching is necessary and always one
vector behind. So the guardrails add a **behavioral** layer that catches
bulk/anomalous poisoning regardless of shape, plus write-time refusal for the
one artifact that can hijack future agents: a skill body.

**Invariant across every guardrail:** nothing deletes evidence. The journal
keeps everything (audit trail). Guardrails filter the *view* the next session
trusts and *refuse* unsafe writes — hold-and-flag, never silent-drop.

## The guardrails

| # | Stage | Threat | Guardrail | Where | Scenario |
|---|---|---|---|---|---|
| **GR1** | capture | weak signal trusted as strong | **trust tiers** — every observation tagged `explicit`/`stated`/`inferred` by signal strength | `guardrails.assess_trust`, tagged in `digest.py` | S21 |
| **GR2** | inject/recall | a bulk batch (pasted doc, contaminated env, injection) poisons the cache | **volume-anomaly quarantine** — a session over the durable-observation cap is held out of injection and recall | `guardrails.screen_for_injection`, applied in `honcho_client.local_representation` | S22 |
| **GR3** | inject | leaked eval/sandbox state writes fixture data into real memory | **sandbox detection** — `status` warns loudly when the state dir looks like a temp/eval path | `guardrails.looks_like_sandbox`, surfaced in `status` | S24 |
| **GR4** | adapt | a learned skill body hijacks every future agent | **skill-write scan** — instruction-override / exfiltration patterns refuse the write, whatever the source | `guardrails.scan_skill_content`, enforced in `overlay.py` scaffold+patch | S23 |
| **GR5** | operate/review | poison silently dropped, or a poisoned observation supersedes a good conclusion | **visibility + supersession doctrine** — quarantine surfaced in `status`; review weighs trust before superseding | `quarantined_observations()`; `evolve-review` prose | (doctrine) |

Each traces to the pipeline in [docs/evolve.md](evolve.md): GR1 guards
capture, GR2/GR3 guard deliver→inject, GR4 guards adapt, GR5 guards the
human-in-the-loop review.

## GR2 in detail — the behavioral net

A real session states 0–2 durable facts (preferences, corrections). A pasted
document, a contaminated environment, or a bulk-injection attack produces
many at once. So any single session over `DURABLE_VOLUME_CAP` (5) durable
observations has those observations **quarantined** — recomputed live from the
journal, never persisted, never deleted:

- **Journal**: keeps all of them (evidence).
- **Injection + recall (`rep`/`search`)**: exclude them.
- **`status`**: reports `quarantined: N observation(s) held from injection`.
- **`/evolve-review`**: triages them — a genuine burst gets promoted; a
  poisoning batch is left quarantined (and its source noted as a `[strategic]`
  lesson).

Its skill-usage/environment entries still pass (a session legitimately touches
many skills). A false positive costs a review glance, never lost memory — the
correct asymmetry (hold suspicious, never silently trust).

## GR5 — the review doctrine guardrails

Two rules `/evolve-review` follows that no code can enforce (they need
judgment):

1. **Triage quarantine before new analysis.** Quarantined observations are
   presented; each is promoted (genuine burst), discarded (poison — with the
   anti-capture list applied), or left held. Never silently trusted, never
   silently dropped.
2. **Supersession respects trust (GR1).** A new observation may only overwrite
   an established conclusion if its trust tier is ≥ the conclusion's. A
   low-trust `inferred` observation cannot un-learn a `stated`/`explicit`
   conclusion — that's exactly the poison-driven un-learning the Hermes scar
   warns about. Contradictions below that bar are surfaced, not applied.

## Scope & limits

- **GR2/GR3 are local-mode-first.** In honcho mode the deriver forms
  conclusions server-side; the volume net there is future work (screen the
  representation, or cap per-session `add_messages`). GR1 (trust tags travel
  as observation metadata) and GR4 (write-time) apply in both modes.
- **GR4 is deliberately tight** — it refuses only agent-hijacking patterns a
  legitimate procedure skill never needs. It is a trust-boundary check, not a
  content filter; it does not judge whether a skill is *good*, only whether it
  is *safe to install*.
- **The cap is a fixed constant.** If false positives appear (a real
  onboarding session stating many preferences), make `DURABLE_VOLUME_CAP`
  per-user-configurable — the upgrade path is noted in `guardrails.py`.

## Running the guardrail scenarios

```bash
python3 scripts/evolve/guardrails.py --selfcheck    # the module's own assertions
python3 scripts/evolve/evals.py --only s21          # (…s22, s23, s24)
python3 tests/test_evolve.py                        # GuardrailTests + the rest
```
