# core-workflows

Two standard, repeatable sequences for developing alongside AI through polly-tri.
Load this skill when starting new planning/research on a project, or when
picking up development against an existing plan. Each workflow chains
skills already defined in `config.yaml` / `routing-guide/SKILL.md`, in a
fixed order, with an explicit provider/tier/purpose per step so the sequence
is deterministic and repeatable rather than ad hoc.

Two kinds of step appear below:
- **Dispatched** — polly-tri sends it to a sub-agent via `sys_session_send`
  (title/purpose/model as given).
- **Polly-level** — polly-tri runs it itself (Skill tool or `sys_os_*`
  plumbing), not delegated. `subagent-driven-development` and
  `dispatching-parallel-agents` are polly-level here: they describe how polly
  fans work out to sub-agents, not a task to hand to one. `grounding` is also
  polly-level, per the same checkpoint pattern polly runs on its own session.

Cross-review discipline applies throughout: whichever provider authors a
step's artifact, the reviewer step immediately after (where one exists) is
the OPPOSITE vendor. Never skip a review step silently — if it's cheap
enough to not be worth it (noted per-step below), say so explicitly rather
than omitting it.

## Workflow 1 — Planning & Research

Trigger: adding new planning/research to a project — a fresh challenge or
problem that doesn't yet have a plan.

| # | Step | Kind | Primary | Purpose | Tier | Reviewer | Gate / output |
|---|------|------|---------|---------|------|----------|----------------|
| 1 | `brainstorming` | Dispatched | claude_code | implement | STANDARD | — | Writes the design doc to `docs/superpowers/specs/` and commits it — real repo change, not read-only. Scope the dispatch to STOP once the doc lands; don't let it auto-invoke writing-plans (its own natural terminal step) — steps 2–4 below run first |
| 2 | `investigate` | Dispatched | claude_code (gemini breadth pre-pass first if large/unfamiliar — `gemini-3.5-flash`, feeds claude_code's synthesis) | explore | STANDARD (COMPLEX if codebase is large/unfamiliar) | — | Grounds the brainstorm in actual repo constraints/patterns |
| 3 | `grilling` | Dispatched | claude_code | explore | STANDARD | — | Resolves open branches of the plan with the human, one question at a time; live-interview relay |
| 4 | `writing-plans` | Dispatched | claude_code | implement | COMPLEX | codex | The plan document itself — hard to reverse once issues are cut from it, worth top-tier quality |
| 5 | **Gate: test/validation coverage** | Dispatched (review) | codex AND gemini in parallel (both `STANDARD`); codex adjudicates if they disagree | review | STANDARD | — | Acceptance contract: does EVERY checkpoint/phase in the plan have an explicit test or validation gate before the next one starts? Blocking findings loop back to step 4 |
| 6 | `explaining-plans` | Dispatched | codex | implement | STANDARD | claude_code | Edits the plan in place: rationale, cited context, mermaid diagrams — makes it self-explanatory |
| 7 | `codebase-design` | Dispatched | claude_code | explore | STANDARD | codex (gemini alternate for large-corpus plans) | Applies deep-module/seam/adapter vocabulary to sharpen the plan's architectural framing before it's cut into issues |
| 8 | `to-issues` | Dispatched | codex | implement (tracker-publish — no PR required, see agent config) | STANDARD | claude_code | Vertical-slice issues, dependency-ordered, published to the tracker |
| 9 | `simplify` (applied to the plan/issues, not code) | Dispatched | claude_code | implement | STANDARD | codex | Cuts anything in the plan/issues that isn't earning its place — make it as simple and repeatable as possible |
| 10 | `ponytail:review` | Dispatched (review) | opposite vendor from step 4's author (default codex, rotate in gemini as an alternate) | review | LIGHTWEIGHT | — | Only scoped to any prototype/scaffold snippets embedded in the plan or issues (there's usually no real code yet at this stage) — checks they're minimal, not bloated |

End state: a design doc (step 1) + plan doc + published issues, all
cross-reviewed (except step 1, which has no dedicated reviewer step), ready
to hand to Workflow 2. The only commits so far are step 1's design doc and
steps 4/6/7's plan-doc edits, each via its own PR per the implement contract
— no application code has been touched yet.

## Workflow 2 — Development (iterative, from an existing plan)

Trigger: picking up development against a plan/issue that already exists
(e.g. one produced by Workflow 1).

| # | Step | Kind | Primary | Purpose | Tier | Reviewer | Gate / output |
|---|------|------|---------|---------|------|----------|----------------|
| 1 | `investigate` | Dispatched | claude_code (gemini breadth pre-pass first if large/unfamiliar — `gemini-3.5-flash`, feeds claude_code's synthesis) | explore | STANDARD (COMPLEX if large/unfamiliar) | — | Re-ground in the CURRENT codebase state — it may have moved since the plan was written |
| 2 | `executing-plans` | Dispatched | claude_code | implement | COMPLEX | codex | Produces the execution order + review checkpoints for the rest of this run — consequential, worth top tier |
| 3 | `subagent-driven-development` | **Polly-level** | polly-tri | — | — | — | Polly loads this skill itself to decide how to split step 2's plan into independent, parallel-safe tasks |
| 4 | `dispatching-parallel-agents` | **Polly-level**, fans out to N dispatched implement tasks | polly-tri orchestrates; each task's provider/tier picked via the main Provider Routing Decision Tree per its own complexity — actively consider gemini for docs/ingestion/test-data/UI-media sub-tasks whenever it matches, don't default to claude_code/codex out of habit | implement (one dispatch per independent task, own worktree, own PR) | varies per task | opposite vendor per task (standard Cross-Review Rule, gemini included) | N implementer PRs, each independently cross-reviewed before merge-readiness |
| 5 | `ponytail:audit` | Dispatched, two-stage: (a) gemini breadth sweep across all diffs (`gemini-3.1-flash-lite`, LIGHTWEIGHT, cheap pattern-scan) → (b) codex (or opposite of whichever vendor did most of the fanout implementation) makes the actual judgment call on gemini's findings | review — judges the diffs against ponytail principles, applies no fixes | LIGHTWEIGHT (stage a) then COMPLEX (stage b, whole-diff-set scope) | — | Over-engineering audit across all of step 4's landed diffs; findings become fix-tasks fed back to the relevant implementer, not applied by the auditor. Stage (a) is an input to stage (b)'s judgment, never a replacement for it |
| 6 | `grounding` | **Polly-level** | polly-tri | — | — | — | Polly runs its own grounding checkpoint on the batch (per the same pattern as any polly-tri session). Check 2 (code review) is NOT self-eyeballed: it dispatches a review-purpose sub-agent (opposite vendor from the majority implementer) to actually run `/simplify` + `/security-review` against step 4/5's diffs |
| 7 | Update docs (dev notes, README, CLAUDE.md) | **Polly-level** (docs authoring) | polly-tri | — | — | — | Synthesized directly from the collected sub-agent reports/PR diffs from steps 4–6. If genuinely deeper investigation is needed first, delegate that explore task, then author the docs directly from its findings |
| 8 | Commit + push | **Polly-level** (git plumbing) | polly-tri | — | — | — | Commits the docs update from step 7; each implementer's own PR from step 4 is separate and already open |
| 9 | Open a PR | **Polly-level** (`gh pr create` plumbing, not a merge) | polly-tri | — | — | — | PR for the docs-update commit. Polly-tri never merges anything — every PR from this workflow (docs PR + each implementer PR) waits for the human |

End state: implementation PRs (one per independent task, each cross-reviewed)
plus one docs-update PR authored directly by polly-tri (not cross-reviewed —
it's lower-stakes prose reflecting already-reviewed work, and polly may open
its own PR for its own direct commits). None merged. The human merges.

## Notes shared by both workflows

- **Tiers are guidance, not a hard ceiling.** If a specific brainstorm/investigate
  turns out trivial or unusually deep, it's fine to move a tier — note why in
  the dispatch, don't silently default.
- **claude-sonnet-5 is a valid COMPLEX-tier ALT for coding/agentic-shaped steps.**
  `executing-plans` (Workflow 2, step 2) fits this — dispatch claude-sonnet-5
  instead of claude-opus-4-8 when minimizing cost matters more than squeezing
  out the last bit of judgment quality. Keep Opus for `writing-plans` and
  `domain-modeling`, where the bottleneck is planning judgment, not coding
  execution.
- **Gate steps never apply their own fixes.** A gate/audit/review step reports;
  the fix goes back to whichever step produced the artifact, as a new dispatch.
- **Live-interview steps** (`brainstorming`, `grilling` in Workflow 1) use the
  relay mechanism in `config.yaml`'s Live-Interview Skills section — one
  persistent sub-agent session, human's answer relayed back into the same
  session, not a fresh dispatch per question.
- **Gemini is wired into both workflows (2026-06-30)** — see the
  `investigate`, gate, `codebase-design`, `ponytail:review`, fanout, and
  `ponytail:audit` rows above. All three providers proposed independently
  where gemini genuinely fits before this was finalized; full rationale in
  `routing-guide/SKILL.md`'s Gemini Wiring section. It's deliberately still
  not primary for `executing-plans`/`writing-plans` — all three agreed
  gemini is a worse choice there (subtle code logic, nuanced long-form prose).
