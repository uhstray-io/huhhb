# buhhdy Model Manifest

All 11 models currently wired into buhhdy, cross-referenced by use-case,
cross-review role, and workflow. Generated from the current state of
`config.yaml`, `skills/routing-guide/SKILL.md`, and `skills/core-workflows/SKILL.md`.

**Updated 2026-07-08 (later same day — ACP migration):** buhhdy now targets
stock upstream omnigent; the uhstray-io/omnigent fork and its custom
`gemini` harness are retired. Upstream's generic ACP harness cannot switch
gemini models per-dispatch, so the single `gemini` worker became three
tier-pinned workers: `gemini-complex` (gemini-3.1-pro-preview),
`gemini-standard` (gemini-3.5-flash), `gemini-lite` (gemini-3.1-flash-lite).
Every worker-level "gemini" reference below maps to the tier-appropriate
gemini-* worker; never pass args.model to them.

**Updated 2026-07-08 (third directive — Fable tightened):** `claude-fable-5`
is now ESCALATION-ONLY even within planning/orchestration: routine
planning, decomposition, and orchestration dispatches run `claude-opus-4-8`
or lower; Fable is reserved for the most complex work — large
multi-workstream decomposition, novel/hard-to-reverse architecture, or the
heaviest cross-agent orchestration — and every Fable dispatch states why
Opus 4.8 is insufficient.

**Updated 2026-07-08:** Two operator directives. (1) `claude-fable-5` is
now ORCHESTRATOR/ARCHITECT ONLY — initial decomposition, architecture, and
plan-level judgment; NEVER implementation, review, or exploration
dispatches (development work always runs COMPLEX tier or lower). Its Claude
Max flat-subscription window ended 2026-07-07; it is now metered per-token
($10/$50 per MTok) via a separate API key — every dispatch is a real cost
decision. (2) `openrouter/z-ai/glm-5.2` promoted on operator calibration —
performance just below `gemini-3.1-pro-preview` at a far lower per-token
price — from diversity-only pick to the cost-effective COMPLEX ALT on
routing rule 3 (complex coding), alongside its standing cross-review role.

**Updated 2026-07-07:** `openrouter/z-ai/glm-5.2` added via the new fourth
worker `opencode` (OpenCode CLI, harness `opencode-native`, auth = user's
OpenRouter credentials). GLM is a fourth model family — its headline role is
cross-review diversity (reviewer whose family differs from ALL three
incumbents) plus deliberate ALT dispatch. Initially not wired into any of
routing rules 1–9 (unbenchmarked in this stack at the time) — SUPERSEDED by
the 07-08 update above, which promotes it to the cost-effective COMPLEX ALT
on routing rule 3. Billing is metered OpenRouter credits, outside the
flat-subscription cost model the rest of this manifest assumes — the
standing quota tie-break never applies to it.

**Updated 2026-07-01:** `claude-fable-5` added as a new FRONTIER tier
(claude_code only) — Anthropic's most capable widely-released model, per
direct operator confirmation corroborated by Anthropic's own claude-api
model catalog. It's an explicit escalation from COMPLEX, not wired into any
default routing rule. **Time-bound access** (per direct operator statement,
not independently cross-checked): usable via the existing Claude Max
subscription only through 2026-07-07; from 2026-07-08 it requires a
separate API key and is billed per-token ($10/$50 per MTok) — outside the
flat-subscription cost model the rest of this manifest assumes.

**Updated 2026-06-30:** Gemini was previously under-wired (2 of ~27 skills,
neither core workflow) because both workflows were designed while its auth
was broken. Once fixed, all three providers (`claude_code`, `codex`,
`gemini` itself) independently proposed where gemini genuinely fits, then
were reconciled — see `routing-guide/SKILL.md`'s "Gemini Wiring" section for
the full rationale. This revision reflects that reconciliation.

## Read this caveat first

Cross-review in buhhdy is pinned at the **worker** level almost
everywhere (`claude_code` / `codex` / `gemini`) — the Skill Dispatch Guide
and mattpocock/skills tables name a reviewing *worker*, not a reviewing
*model tier*. A handful of steps (marked ★ below) now pin an explicit tier
for the reviewer/pre-pass; everywhere else, the reviewer's tier is an
orchestrator judgment call at dispatch time, not a documented default.

**Verified 2026-07-01, re-verified same day after installation:** `triage`
(rows for `gpt-5.5` and `gemini-3.1-flash-lite` below) and `loop-me`
(`claude-sonnet-5` row) are now confirmed installed and live — these model
assignments are actively exercised, not intended-design placeholders.
`triage` has a single `/triage` entrypoint (no separate discovery/deep
commands); the gpt-5.5 / gemini-3.1-flash-lite split reflects how buhhdy
words the dispatch, not a different command. `loop-me` ships
`disable-model-invocation` like grill-me/handoff/improve-codebase-architecture
— dispatch input must literally start with `/loop-me`. See routing-guide's
"Verified Availability" section for detail.

## The 11 models

| Model | Provider · Tier | Status | Primary use-cases | Cross-review / pre-pass role | Workflow(s) |
|---|---|---|---|---|---|
| **claude-fable-5** | Claude · FRONTIER | GA (metered per-token as of 2026-07-08) | ESCALATION-ONLY (operator directives 2026-07-08, tightened later same day): reserved for the MOST complex work — large multi-workstream decomposition, novel/hard-to-reverse architecture, heaviest cross-agent orchestration — with a stated reason why claude-opus-4-8 is insufficient. Routine planning/decomposition runs Opus 4.8 (or Sonnet 5 when stakes are modest). NEVER implementation, review, or exploration — development dispatches always run COMPLEX or lower. | None pinned — any review of its output follows the general worker-level cross-vendor rule. | Not wired into either core workflow — rare deliberate escalation for the hardest planning-judgment steps only (W1), never W2 execution steps. |
| **claude-opus-4-8** | Claude · COMPLEX | GA | Decision-tree rule 3 (complex coding); rule 7 (context >200K, code reasoning, preferred over codex). `writing-plans` (W1 step 4). `executing-plans` (W2 step 2 — see `claude-sonnet-5` ALT). `handoff`, `domain-modeling`, `improve-codebase-architecture` (mattpocock, general). COMPLEX fanout tasks (W2 step 4). | Reviews `codex`'s `explaining-plans`/`to-issues`/`to-prd`/`triage`(deep)/`strict-simplify` — worker-level only. `writing-plans`'s output (its own W1 step 4) is now reviewed at ★ step 5 by **codex + gemini in parallel**, not codex alone. | W1 (step 4); W2 (step 2, step 4 fanout) |
| **claude-sonnet-5** | Claude · STANDARD (+ COMPLEX ALT) | GA | `brainstorming` (W1), `investigate` (W1/W2, default synthesis model), `grilling` (W1), `codebase-design` (W1), `grill-me`, `loop-me`, `writing-shape` (mattpocock). **COMPLEX ALT:** `executing-plans` (W2 step 2), cheaper than Opus for coding/agentic work. | Same worker-level review role as claude-opus-4-8. Its `investigate` synthesis now consumes a ★ gemini breadth pre-pass (`gemini-3.5-flash`) when the codebase is large/unfamiliar — an input, not a replacement. | W1 (1,2,3,7); W2 (1, 2-ALT) |
| **claude-haiku-4-5** | Claude · LIGHTWEIGHT | GA | Decision-tree rule 9 (default cheapest). Named gemini-down fallback target (no longer needed — gemini is up). | None pinned. | General only |
| **gpt-5.5** | OpenAI · COMPLEX | GA | Decision-tree rule 2 (native OpenAI tooling). `triage` (deep mode). | ★ **W2 step 5 (`ponytail:audit`), stage b** — COMPLEX judgment pass over the whole fanout diff-set, now consuming a gemini breadth-sweep (stage a) as input rather than starting cold. Also worker-level reviewer for every claude_code-primary skill. | W2 (step 5); general (`triage`-deep, rule 2) |
| **gpt-5.4-mini** | OpenAI · STANDARD | GA | Decision-tree rules 4/5. `explaining-plans` (W1 step 6), `to-issues` (W1 step 8), `to-prd` (mattpocock). | ★ **W1 step 5 (test/validation gate)** — STANDARD review of `writing-plans`, now **in parallel with `gemini-3.5-flash`**; codex adjudicates on disagreement (upgraded from sole reviewer). Also worker-level reviewer, untiered, elsewhere. | W1 (5,6,8); general |
| **gpt-5.4-nano** | OpenAI · LIGHTWEIGHT | GA | Decision-tree rule 9. Named gemini-down fallback target (no longer needed). *No longer primary for `triage`(discovery)* — reassigned to gemini; codex now only handles edge-case escalations there. | ★ **W1 step 10 (`ponytail:review`)** — LIGHTWEIGHT review of prototype snippets, default reviewer, now rotating with `gemini-3.1-flash-lite` as an alternate. | W1 (step 10); general (edge-case triage escalation) |
| **gemini-3.1-pro-preview** | Google · COMPLEX | **PREVIEW, not GA** | Decision-tree rule 1 (native multimodal); rule 8 (context >200K, raw docs/media/search). | Worker-level reviewer for `frontend-design`/`fanout` (untiered). | **Still ad hoc only** — none of this wiring pass's new slots use it; every new pre-pass/breadth role deliberately used the GA `gemini-3.5-flash`/`gemini-3.1-flash-lite` instead, given its preview status. Revisit if/when it reaches GA. |
| **gemini-3.5-flash** | Google · STANDARD | GA | *(Was: nothing pinned. Now the most newly-wired model in the bundle.)* ★ Breadth pre-pass for `investigate` (W1 step 2 / W2 step 1) and `improve-codebase-architecture` when large/unfamiliar; wide-ingestion pre-pass for `triage` (deep). | ★ **W1 step 5** parallel reviewer alongside codex. Additional reviewer for `handoff` (redundancy on a security-sensitive skill). Alternate reviewer for `codebase-design` (large-corpus variants). | W1 (steps 2, 5, 7); W2 (step 1); general (`improve-codebase-architecture`, `triage`-deep, `handoff`) |
| **openrouter/z-ai/glm-5.2** | OpenCode (Zhipu GLM) · COMPLEX | GA (via OpenRouter) | Cost-effective COMPLEX ALT on routing rule 3 (complex coding) when Claude quota is tight or metered cost dominates — operator-calibrated 2026-07-08 just below gemini-3.1-pro-preview at a far lower per-token price. Verified live 2026-07-07 (worker boot + dispatch). | Cross-review diversity pick — the only reviewer whose model family differs from all of Anthropic/OpenAI/Google simultaneously; rotate into reviewer pools where maximum independence matters. | None pinned — available wherever a cross-vendor reviewer or ALT implementer is called for. |
| **gemini-3.1-flash-lite** | Google · LIGHTWEIGHT | GA | Decision-tree rule 6/9. **New primary: `triage` (discovery)** — bulk/cheap classification, both codex and gemini itself proposed this independently. ★ Stage-a breadth sweep for `ponytail:audit` (W2 step 5), feeding codex's stage-b judgment. | Alternate reviewer rotation for `ponytail:review` (W1 step 10). | W1 (step 10 alt); W2 (step 5 stage a); general (`triage`-discovery primary) |

## General cross-review pairing rule (worker level, applies everywhere)

| Implementer | Valid reviewers |
|---|---|
| claude_code | codex, gemini, opencode |
| codex | claude_code, gemini, opencode |
| gemini | claude_code, codex, opencode |
| opencode | claude_code, codex, gemini |

Always prefer the reviewer whose model *family* differs from the
implementer's. **Standing rule as of this wiring pass:** gemini is a full
peer here, not a fallback — for any 3+-way fanout, or any workload where
maximum review confidence matters, actively rotate gemini into the reviewer
pool rather than defaulting to a claude_code/codex loop out of habit.

## Deliberately unchanged

All three providers independently agreed gemini is a genuinely worse choice
(not just "available") for: `executing-plans`, `writing-plans`,
`brainstorming`, `strict-refactor`, `domain-modeling`,
`grill-me`/`grilling`/`loop-me`/`writing-shape` primary, and
`to-issues`/`to-prd` primary — subtle code logic and nuanced long-form prose
are Claude's and Codex's edges, not gemini's. These stay claude_code/codex-only.

## Open gap worth closing

Tier-pinning for reviewers/pre-passes is now denser than before this pass,
but still not universal — most worker-level reviewer assignments in the
Skill Dispatch Guide still don't pin a tier. If you want fully deterministic
cost accounting, that's still the next thing to formalize.
