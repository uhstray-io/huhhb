# huhhb Skill Authoring Standard (v1, 2026-07-16)

The normative checklist for every skill in this repo — hand-written or
evolve-generated. Machine-checkable rules are enforced by `scripts/skill-lint.ts`
(S-numbers below); triggering rules by `scripts/skill-bench.ts` scenarios;
refinement superiority by `scripts/skill-bench.ts --battle`; judgment rules by
review. Evidence tags ([SKILLOPT] etc.) resolve in
`plans/development/2026-07-16-skill-authoring-standard-plan.md` → References.

## 1. Discoverable — the description is the product

Agents skip relevant skills ~half the time even when handed them; triggering,
not body quality, is the measured bottleneck [WILD].

- D1. Description states WHAT the skill does and WHEN to use it, third person,
  starting "Use when…", 30–500 chars (house cap; spec allows 1,024) — lint S4.
  Include the concrete symptoms, error strings, and keywords a session would
  actually contain [ANTH][SPEC].
- D2. NEVER summarize the skill's workflow in the description — Claude follows
  the summary instead of reading the body (verified in this repo's own
  writing-skills testing).
- D3. Add negative triggers when a plausible near-neighbor exists ("not for X —
  use skill-y for that") [MGECHEV]. Test them (see E-rules): stated negations
  are weakly followed unless benched.
- D4. Only routing-relevant clauses belong in the description; feature lists are
  dead weight in the always-loaded layer — descriptions compress 48% with zero
  routing loss [SKILLRED].
- D5. The body is also a discovery surface (indexing body content raised
  Recall@5 from 57.7% to 65.5% [WILD]) — spell out key terms in the body
  instead of pronouns and shorthand.

## 2. Discrete — one coherent unit per skill

Irrelevant loaded skills actively mislead (−7.7 points with distractors; weaker
models drop below the no-skill baseline) [WILD] — an over-broad or over-split
skill isn't just untidy, it damages sessions.

- C1. Coherent-unit test [SPEC]: the skill covers one task-shaped capability —
  "query the DB + format results" is one unit; "…and administer the DB" is two
  skills. If two halves would trigger in different situations, split.
- C2. Don't over-split: if completing one ordinary task requires loading 3+ of
  your skills, merge or create a router skill that routes to sub-references
  [MGECHEV].
- C3. Skills are built from real expertise — extracted from a hands-on task,
  session traces, review comments, or project artifacts — never generated from
  generic LLM knowledge [SPEC]. (This is why evolve-distill starts from
  transcripts, not prompts.)
- C4. Obsolescence check: if the agent completes the bench scenarios WITHOUT
  the skill (baseline pass), the skill adds nothing — don't ship it
  [SKILLRED][SPEC]. skill-bench runs this baseline automatically.

## 3. Efficient — the context window is a public good [ANTH]

>60% of wild skill bodies is background/examples/templates, and denser skills
OUTPERFORM their verbose originals (+2.8%, p=0.002) [SKILLRED]. Optimized
skills converge to ~300–2,000 tokens of rules [SKILLOPT].

- T1. Body ≤500 lines (lint S12 warn) and under the house char caps
  (lint S6: warn → 12,000 FAIL). Target the [SKILLOPT] band: a few hundred to
  ~2K tokens of actual rules.
- T2. The cut test for every paragraph: "Would the agent get this wrong without
  this?" If no, delete it [SPEC]. Never explain what the model already knows
  (what a PDF is, how HTTP works) [ANTH].
- T3. Progressive disclosure with EXPLICIT load triggers: "Read
  references/api-errors.md when the API returns non-200" — never bare "see
  references/" [SPEC]. References stay one level deep (lint S10) [ANTH][MGECHEV];
  reference files >100 lines get a TOC [ANTH].
- T4. One representative example per concept [SKILLRED]. And state every rule
  explicitly in prose — a requirement carried ONLY by an example is lost the
  moment the example moves or is skimmed (example-as-specification failure)
  [SKILLRED].
- T5. Never bundle README/CHANGELOG/installation guides/library code inside a
  skill [MGECHEV]. Gotchas live in SKILL.md itself, not references — agents
  miss the load trigger for them [SPEC].

## 4. Effective — rules the model lacks, at the right prescriptiveness

The winning content is procedural and non-instance-specific: "rules a
thoughtful practitioner would write after a day with the task" — and 1–4 such
rules carry the whole gain [SKILLOPT].

- P1. Favor procedures over declarations: teach HOW to approach the class of
  problem; a skill that only describes one instance's output doesn't
  generalize [SPEC][SKILLOPT].
- P2. Match prescriptiveness to fragility [ANTH]: free text where many
  approaches work (explain why, not just what); exact commands with "do not
  modify" where operations are fragile. Calibrate per section, not per skill.
- P3. Defaults, not menus: one default tool/path + a brief escape hatch; never
  equal-weight options [ANTH][SPEC].
- P4. Gotchas section for environment facts that defy reasonable assumptions
  (soft-delete flags, misleading endpoints, house-rule overrides). Every time
  you correct the agent's mistake, the correction goes in gotchas [SPEC].
- P5. Multi-step workflows get a copyable `- [ ]` checklist; validation gates
  get a feedback loop ("run validator → fix → repeat; proceed only on pass")
  [ANTH][SPEC].
- P6. Batch/destructive operations use plan-validate-execute: emit an
  intermediate plan artifact, validate with a script whose errors name the fix
  ("Field 'X' not found — available: …"), only then execute [ANTH][SPEC].
- P7. Bundled scripts solve, don't defer: handle their own error conditions,
  return self-correcting messages, justify every constant in a comment
  [ANTH][MGECHEV]. Credentials come from the environment only — never inside
  skill files [DO] (house rule: never transit chat, repos, or memory either).

## 5. Evaluated — no skill ships on vibes

- E1. Evals BEFORE extensive documentation [ANTH]; in this repo that is the
  writing-skills RED-GREEN-REFACTOR loop: baseline the failure without the
  skill, then write the minimum that flips it.
- E2. Every skill has a `tests/bench/<skill>.json` with ≥3 scenarios [ANTH]:
  ≥2 positive (one a phrasing variant) and ≥1 negative-activation scenario
  (`expect_no_activation: true`) proving the skill does NOT fire on its
  nearest-neighbor task [MGECHEV][SKILLRED's distractor oracle][WILD].
- E3. The bench baseline (same prompt, Skill tool disallowed) doubles as the
  obsolescence check (C4): a skill whose scenarios pass at baseline is dead
  weight.
- E4. Maintenance mirrors [SKILLOPT]: small bounded edits, re-benched before
  merge; keep rejected-edit rationale in the PR record so bad changes aren't
  re-proposed. Author/refine with the strongest available model even when a
  weaker one will execute the skill.
- E5. Refinements prove superiority pairwise, not on absolute judge scores:
  challenger vs champion outputs on the same scenarios, position-swapped
  battle verdicts with cited evidence, logged to `tests/bench/battles.jsonl`.
  Ordering: objective gates first (asserts, budget ratios), judge
  second (only ranks variants that already pass the gates), humans last
  (adjudicate splits). The judge never opines on what can be measured.

## Split of enforcement

| Rule class | Enforced by |
|---|---|
| Frontmatter shape, name/dir match, description length + trigger phrasing, body caps, link integrity, versions | `skill-lint.ts` S1–S8 (existing) |
| Spec-valid name charset, reference depth, description POV, 500-line body | `skill-lint.ts` S9–S12 (this standard) |
| Positive + negative triggering, obsolescence | `skill-bench.ts` scenarios (E2/E3) |
| Refinement superiority (output better/worse than champion) | `skill-bench.ts --battle` (E5) |
| Scoping, cut test, gotchas, prescriptiveness, procedures | writing-skills flow + review + evolve-skills lifecycle pass |

## What each gate can and cannot decide

A mechanical check that guesses at judgment produces confident wrong answers at
scale, so the split above is a claim about *decidability*, not about effort.

- **Lint decides what is visible in the file.** Name charset, reference depth,
  point of view, line count. It never decides whether a rule is one the model
  already follows — that requires a baseline, which is the bench's job.
- **Bench decides what the model does.** Whether a skill fires when it should
  (recall), stays silent when it should not (precision, E2's negative scenario),
  and whether it beats its own absence (E3/C4). A scenario both arms pass or
  both arms fail has measured something other than the skill and is not
  evidence.
- **Battle decides which of two versions is better**, and only among variants
  that already cleared the objective gates. It reports non-regression as a gate
  and superiority as a claim requiring a sample floor — a two-scenario bench can
  pass non-regression forever and never earn a superiority verdict.
- **Review decides everything left**, and the standard names those rules rather
  than pretending a script covers them.

A gate with no evidence must not certify. An empty battle, a bench where every
scenario was excluded, and a lint run over zero files are all *no verdict* — not
a pass.
