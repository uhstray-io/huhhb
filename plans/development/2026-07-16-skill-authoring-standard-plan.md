# huhhb Skill Authoring Standard — Implementation Plan (2026-07-16)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One canonical, evidence-backed standard for authoring skills in huhhb —
consumed by human developers (via `writing-skills`), by the evolve pipeline
(`evolve-distill` / `evolve-skills`, which write skills mechanically), and by the
quality gates (`skill-lint.ts` G0, `skill-bench.ts` G1) — so every skill in the
marketplace is efficient (token-economical), effective (complied with), discrete
(one coherent capability), and discoverable (triggers when it should, and only then).

**Architecture:** The standard is a single reference document living one level deep
inside `writing-skills` (eating our own progressive-disclosure dogfood). Everything
machine-checkable in it is enforced by new `skill-lint.ts` checks (S9–S12) with the
existing `skill-lint-baseline.json` grandfathering mechanism; the triggering claims
are enforced by a new negative-activation scenario type in `skill-bench.ts`;
refinement superiority is proven by a pairwise battle judge in `skill-bench.ts`
(Task 7); the judgment-only rules are enforced by making the standard a required
read in `writing-skills`, `evolve-distill`, and `evolve-skills`. No new dependencies.

**Tech Stack:** TypeScript (Node ≥22.18 native type stripping, stdlib only, erasable
TS), `node --test`, existing `scripts/skill-lint.ts` / `scripts/skill-bench.ts` /
`tests/bench/*.json` machinery.

---

## Evidence base (read this before executing)

Seven sources ground the standard (an eighth reference, autoevals, is tooling
context for Task 7, not evidence). Each normative rule in Task 1 cites back to these
by bracket tag. **Full citations in the References section at the bottom.**

| Tag | Source | What it contributes |
|---|---|---|
| [SKILLOPT] | arXiv:2605.23904v2 — *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* (Microsoft/SJTU et al., 2026) | Optimized skills converge to ~300–2,000 tokens of **procedural, non-instance-specific rules**; 1–4 accepted edits (median 2.5) carry gains of +19–25 points; single edits produced +29.3 and +39.0 point jumps. Good procedural skills transfer across harnesses (+43.6 to +59.7 cross-harness). Maintenance lesson: small bounded edits, validated against a held-out check, with a record of rejected edits. Caveat: says nothing about descriptions/triggering (skills were force-injected). |
| [SKILLRED] | arXiv:2603.29919v2 — *SkillReducer: Optimizing LLM Agent Skills for Token Efficiency* (HKUST et al., 2026) | Across 55k wild skills: 44.1% of descriptions missing or under 20 tokens; >60% of body content is background/examples/templates, not actionable rules. Descriptions compress 48% with **100% routing preservation** — only routing-relevant clauses matter. **Less-is-more:** compressed skills *outperform* originals (0.742 vs 0.722, p=0.002); naive shortening degrades (0.750–0.845 retention), so density comes from restructuring, not truncation. Key failure mode: **example-as-specification** — a rule carried only by an example is lost when the example moves to a reference file. 10.7% of skills never trigger at all; half of compression "regressions" were skills the model didn't need (obsolescence). |
| [WILD] | arXiv:2604.04323v1 — *How Well Do Agentic Skills Work in the Wild* (UCSB/MIT, 2026) | The degradation ladder (Claude Opus 4.6, SkillsBench): curated+forced 55.4% → curated voluntary 51.2% → +distractors 43.5% → realistic retrieval 38.4% → no skills 35.4%. **Triggering is the bottleneck:** agents loaded all curated skills in only 49% of trajectories (31% with distractors). **Distractor skills actively harm** (−7.7 points), and weaker models fall *below* the no-skill baseline with imprecise retrieval. Body content contributes to discovery (Recall@5 57.7% metadata-only → 65.5% with body indexed). Measure *skill-loading rate* separately from pass rate; test with distractors present. |
| [ANTH] | Anthropic — *Skill authoring best practices* (platform.claude.com) | The hard numbers: name ≤64 chars lowercase-hyphen, description ≤1,024 chars third-person, **body <500 lines**, references **one level deep**, TOC for reference files >100 lines, **≥3 evaluations** built *before* extensive documentation. Degrees-of-freedom framework (match prescriptiveness to fragility), "context window is a public good", defaults-not-menus, solve-don't-defer scripts, no voodoo constants, plan-validate-execute for destructive ops, test across model tiers. |
| [SPEC] | agentskills.io — *Best practices for skill creators* + linked specification | Spec-required frontmatter (name 1–64 lowercase-alnum-hyphen, no `--`, matches dir; description 1–1,024 chars, what + when); ≤500 lines / ≤5,000 tokens recommended body. **Coherent-unit scoping** (function analogy: DB query + result formatting = one unit; adding DB admin = too much). Extract skills from real hands-on tasks and project artifacts, never from generic LLM knowledge. The cut test: *"Would the agent get this wrong without this instruction?"* Gotchas sections stay in SKILL.md (agents miss the load trigger for them in references). Every reference load needs an explicit trigger condition. |
| [MGECHEV] | github.com/mgechev/skills-best-practices (Minko Gechev) | **Negative triggers** in descriptions ("Don't use for Vue, Svelte…"); flat one-level subdirectories; anti-pattern bundles (no README/CHANGELOG/library code inside skills); four-step LLM validation: discovery validation (metadata-only, 3 should-trigger + 3 should-NOT-trigger prompts), logic validation ("point out the exact line where you are forced to guess"), ruthless edge-case QA, architecture refinement. |
| [DO] | DigitalOcean — *How to Write and Implement Agent Skills* (Andrew Dugan, 2026-01-15) | Harness-side view: only metadata loads at discovery, so lazy loading is the contract; never hardcode credentials (env vars/secret managers only); verbose selection logging when testing; skills may chain/reference other skills. |

**The one-paragraph synthesis:** the biggest measured failure is not badly written
bodies — it's *triggering* ([WILD]) and *bloat* ([SKILLRED]). A small set of dense,
procedural, project-specific rules beats exhaustive documentation ([SKILLOPT],
[SKILLRED], [SPEC]), and a skill that activates when it shouldn't is actively worse
than no skill at all ([WILD]). So the standard weights description quality and
scoping as hard gates, token economy as an enforced budget, and requires every
skill to *prove* both its positive and negative triggering with bench scenarios.

---

## File structure

- Create: `skills/writing-skills/references/skill-authoring.md` — the standard (single source of truth)
- Modify: `scripts/skill-lint.ts` — checks S9–S12 (machine-enforceable subset)
- Modify: `scripts/skill-lint-baseline.json` — grandfather existing violations
- Modify: `scripts/skill-bench.ts` — `expect_no_activation` scenario support; `--battle` pairwise judging (Task 7)
- Create: `plans/development/skill-retrofit-order.md` — dependency-ordered burndown for retro-fitting all skills (Task 8)
- Modify: `tests/test_evolve.test.ts` — lint-gate subtest already runs the linter; add unit rows for S9–S12
- Modify: `skills/writing-skills/SKILL.md` — pointer + the three genuinely new rules (TDD-gated, see Task 5)
- Modify: `skills/evolve-distill/SKILL.md`, `skills/evolve-skills/SKILL.md` — standard consultation wired into the pipeline
- Modify: `AGENTS.md` — skill-authoring section points at the standard
- Modify: `tests/bench/writing-skills.json` — create; scenario asserting standard is consulted (new-skill G1 requirement)

---

### Task 1: Author the standard document

**Files:**
- Create: `skills/writing-skills/references/skill-authoring.md`

- [ ] **Step 1: Write the file with exactly this content** (tags cite the Evidence
  base table; keep them — they make every rule auditable):

````markdown
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
````

- [ ] **Step 2: Run the linter to confirm the new file breaks nothing** (it is a
  reference file, not a SKILL.md, so S-checks don't apply to it):

Run: `node scripts/skill-lint.ts`
Expected: `0 FAIL` (same counts as before the change)

- [ ] **Step 3: Commit**

```bash
git add skills/writing-skills/references/skill-authoring.md
git commit -m "docs(writing-skills): huhhb skill authoring standard v1 (evidence-tagged)"
```

---

### Task 2: Lint checks S9–S12 (machine-enforceable subset)

**Files:**
- Modify: `scripts/skill-lint.ts` (inside `lintEntry`, after the existing S6 block)
- Modify: `scripts/skill-lint-baseline.json` (grandfather current violations)

- [ ] **Step 1: Add the four checks.** In `lintEntry`, after the S6 body-length
  block (currently ~line 145), insert:

```ts
  // S9 — spec-valid name: 1-64 chars, lowercase alnum + single hyphens
  // (agentskills.io spec; Anthropic caps name at 64). S3 already checks
  // name == dir; this checks the charset itself.
  const fmNameOnly = fm?.match(/^name:\s*(\S+)/m)?.[1];
  if (fmNameOnly && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fmNameOnly)) {
    report("FAIL", name, "S9", `name '${fmNameOnly}' not spec-valid ` +
      "(lowercase alnum + single hyphens)");
  } else if (fmNameOnly && fmNameOnly.length > 64) {
    report("FAIL", name, "S9", `name ${fmNameOnly.length} chars > 64`);
  }

  // S10 — references one level deep from the skill root: nested reference
  // chains cause partial reads and missed content (Anthropic; mgechev).
  for (const m of prose.matchAll(/\]\((?!http|#|mailto)([^)\s]+)\)/g)) {
    const rel2 = m[1].split(":")[0];
    if (!rel2.startsWith("../") && (rel2.match(/\//g) ?? []).length > 1) {
      report("WARN", name, "S10", `reference nested >1 level: ${rel2}`);
    }
  }

  // S11 — description POV: injected into the system prompt, so first/second
  // person breaks discovery (Anthropic third-person rule).
  if (desc && /^(I |You can|We |Helps you\b)/.test(desc)) {
    report("WARN", name, "S11", "description not third-person");
  }

  // S12 — body line budget (spec/Anthropic: keep SKILL.md under 500 lines;
  // char caps in S6 remain the hard gate).
  const bodyLines = body.split("\n").length;
  if (bodyLines > 500) {
    report("WARN", name, "S12", `body ${bodyLines} lines > 500 — ` +
      "split into references/");
  }
```

  Note: `fm` can be the empty string when frontmatter is missing (S2 already
  FAILs that case) — the `fm?.match` guard keeps S9 quiet there.

- [ ] **Step 2: Run the linter and triage new findings**

Run: `node scripts/skill-lint.ts`
Expected: possible new WARN/FAIL rows tagged S9–S12 on existing skills.

- [ ] **Step 3: Grandfather pre-existing violations** — add each `(name, check)`
  pair the linter now flags to `scripts/skill-lint-baseline.json` in the same
  shape the file already uses for the 2 existing grandfathered entries. Do NOT
  fix the skills themselves in this PR (per-skill fixes are follow-up work with
  their own bench runs).

Run: `node scripts/skill-lint.ts`
Expected: `0 FAIL, <n> grandfathered, <m> WARN` — zero NEW failures.

- [ ] **Step 4: Add unit rows to the existing lint-gate test.** In
  `tests/test_evolve.test.ts`, the ManifestTests subtest already shells out to
  the linter; extend it with direct assertions (follow the file's existing
  style for invoking the linter) that a synthetic entry named `Bad_Name`
  reports S9 and that a body of 501 lines reports S12.

Run: `node --test tests/test_evolve.test.ts tests/test_repo_memory_lint.test.ts`
Expected: all pass, two new subtests included.

- [ ] **Step 5: Commit**

```bash
git add scripts/skill-lint.ts scripts/skill-lint-baseline.json tests/test_evolve.test.ts
git commit -m "feat(lint): S9-S12 — spec-valid names, reference depth, description POV, 500-line body"
```

---

### Task 3: Negative-activation scenarios in skill-bench

**Files:**
- Modify: `scripts/skill-bench.ts`

- [ ] **Step 1: Extend the Scenario type** (currently ~line 53):

```ts
type Scenario = {
  id: string; prompt: string; assert: string;
  phrasing?: boolean; judge?: string; env?: Record<string, string>;
  expect_no_activation?: boolean;  // E2: skill must NOT fire on this prompt
};
```

- [ ] **Step 2: Detect activation and invert the gate.** `runScenario` already
  walks the transcript's `tool_use` blocks (~line 110). Record whether any
  Skill-tool invocation named `spec.skill`, and for
  `expect_no_activation: true` scenarios: the scenario PASSES iff the skill
  was not invoked AND the scenario's `assert` (which should check the task
  still got a sane answer) passes; skip the baseline run (a no-activation
  scenario is its own baseline). Keep the existing behavior for all other
  scenarios byte-identical.

- [ ] **Step 3: Verify offline** (no live `claude -p` needed):

Run: `node scripts/skill-bench.ts --dry-run tests/bench/repo-memory.json`
Expected: unchanged plan output for existing scenarios (no regressions in dry-run rendering).

- [ ] **Step 4: Commit**

```bash
git add scripts/skill-bench.ts
git commit -m "feat(bench): expect_no_activation scenarios — prove negative triggering"
```

---

### Task 4: Wire the evolve pipeline to the standard

**Files:**
- Modify: `skills/evolve-distill/SKILL.md`
- Modify: `skills/evolve-skills/SKILL.md`

- [ ] **Step 1: evolve-distill** — in its authoring flow, at the point where the
  new skill's SKILL.md is drafted, add:

```markdown
**Standard gate (required):** before proposing the skill, read
`skills/writing-skills/references/skill-authoring.md` and check the draft
against D1–D5, C1–C4, T1–T5, P1–P7. Then run `node scripts/skill-lint.ts` and
author the E2 bench file (≥2 positive + ≥1 `expect_no_activation` scenario).
A draft that fails the standard is revised, not proposed.
```

- [ ] **Step 2: evolve-skills** — append to its `## Hard rules` section:

```markdown
- Every create/refine verdict is checked against
  `skills/writing-skills/references/skill-authoring.md`; refine
  proposals that grow a body past its S6/S12 budgets must move content to
  references/ (with explicit load triggers) instead.
- Once `skill-bench.ts --battle` exists (E5), refine verdicts cite its
  battle tally under the non-regression rule — never absolute judge scores.
```

- [ ] **Step 3: Validate and commit**

Run: `node scripts/skill-lint.ts` — expected `0 FAIL` (S6 budgets still met).

```bash
git add skills/evolve-distill/SKILL.md skills/evolve-skills/SKILL.md
git commit -m "feat(evolve): distill/lifecycle passes gate on the skill authoring standard"
```

---

### Task 5: Update writing-skills (TDD-gated — its own Iron Law applies)

**Files:**
- Modify: `skills/writing-skills/SKILL.md`
- Create: `tests/bench/writing-skills.json`

writing-skills already teaches TDD authoring, CSO descriptions, and token
efficiency — do NOT duplicate the standard into it. Three genuinely new rules
plus the pointer go in; per writing-skills' own Iron Law, write the failing
test FIRST.

- [ ] **Step 1: Write the failing bench scenario** at `tests/bench/writing-skills.json`:

```json
{
  "skill": "writing-skills",
  "budget": { "max_tokens": 60000, "max_cost_usd": 1.0, "max_duration_ms": 180000 },
  "scenarios": [
    {
      "id": "standard-consulted-on-authoring",
      "prompt": "Draft a new huhhb skill that converts CSV exports to our reporting format. Sketch the SKILL.md frontmatter and body outline first.",
      "assert": "grep -qiE 'skill-authoring|negative.?trigger|expect_no_activation|coherent unit' result.txt",
      "judge": "The response should show the huhhb skill authoring standard being applied: description with what+when and a negative trigger, a scoping (coherent-unit) judgment, and mention of the required bench scenarios including a negative-activation one. Score 1 if it drafts a skill with no evidence the standard was consulted."
    },
    {
      "id": "no-activation-on-plain-doc-edit",
      "prompt": "Fix the typo 'recieve' in docs/README.md.",
      "expect_no_activation": true,
      "assert": "grep -qiE 'recieve|receive' result.txt"
    }
  ]
}
```

- [ ] **Step 2: Run it, confirm the first scenario fails** (baseline behavior
  doesn't cite the standard):

Run: `node scripts/skill-bench.ts tests/bench/writing-skills.json`
Expected: `standard-consulted-on-authoring` FAILS without the Step 3 edit.

- [ ] **Step 3: Make the minimal SKILL.md edit.** Add to writing-skills'
  frontmatter-adjacent top matter (right after the Overview):

```markdown
**REQUIRED READING for huhhb skills:** `references/skill-authoring.md` —
the repo's normative checklist (evidence-tagged). Three rules it adds beyond
this skill's guidance: (1) negative triggers in descriptions for near-neighbor
skills, tested with an `expect_no_activation` bench scenario; (2) never let an
example be the only carrier of a rule (example-as-specification loss); (3)
every references/ pointer states WHEN to load it, never bare "see references/".
```

- [ ] **Step 4: Re-run the bench, confirm green; run the linter** (writing-skills
  body must stay under its S6 budget — trim elsewhere in the file if needed).

Run: `node scripts/skill-bench.ts tests/bench/writing-skills.json` — expected: both scenarios pass.
Run: `node scripts/skill-lint.ts` — expected: `0 FAIL`.

- [ ] **Step 5: Commit**

```bash
git add skills/writing-skills/SKILL.md tests/bench/writing-skills.json
git commit -m "feat(writing-skills): require the authoring standard; bench proves consultation"
```

---

### Task 6: AGENTS.md pointer + close-out

**Files:**
- Modify: `AGENTS.md` (skill-authoring / quality-gates section)

- [ ] **Step 1: Add one paragraph** to the skill-authoring section:

```markdown
Skill authoring follows the huhhb Skill Authoring Standard
(`skills/writing-skills/references/skill-authoring.md`) — discoverable,
discrete, efficient, effective, evaluated. Lint S9–S12 and the
`expect_no_activation` bench scenario enforce its machine-checkable half;
writing-skills and the evolve lifecycle pass enforce the judgment half.
```

- [ ] **Step 2: Full validation sweep**

Run: `node scripts/skill-lint.ts` — expected `0 FAIL`.
Run: `node --test tests/test_evolve.test.ts tests/test_repo_memory_lint.test.ts` — expected all pass.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md points at the skill authoring standard"
```

**Version bump:** per the adopted lifecycle (AGENTS.md, 2026-07-16), the bump
happens at PR-open, not in these commits. This is a big feature (new standard +
lint checks + bench schema): minor bump with patch carry-over — whatever
`main` holds at PR-open time (e.g. 0.6.17 → 0.7.17), in BOTH `marketplace.json`
and `.claude-plugin/plugin.json`.

---

### Task 7: Battle mode — pairwise output judging (E5)

Independent follow-on: can land in its own PR after Tasks 1–6; only Task 1's
E5 text refers to it.

**Files:**
- Modify: `scripts/skill-bench.ts`
- Created at runtime: `tests/bench/battles.jsonl` (append-only),
  `tests/bench/outputs/<skill>/<scenario>-<side>-<sha>.txt` (persisted outputs)

**Why pairwise.** The repo already compares runs objectively —
`skill-trends.ts regressions` diffs latest-vs-previous history rows, and PR
#47's R3 gate (`championRow`/`beatsChampion` in skill-bench.ts) holds pass
rate and a 1.1× token ceiling against the champion version. What none of
those see is per-output *quality*: the 1–5 judge scores each output in
isolation, absolute scores compress (most land 3–4) and drift across
judge-model versions. Battle adds the missing axis — pairwise verdicts on
the same scenario. Design principle (E5): **objective gates first, judge
second, humans last** — battle only ranks variants that already pass asserts,
budget ratios, and the R3 objective gate, and never overrides them.

**Sequencing:** this task touches the same skill-bench.ts region as PR #47 —
land it after #47 merges and build on `championRow`/`beatsChampion`; do not
re-implement them.

- [ ] **Step 1: CLI + generation.** `node scripts/skill-bench.ts --battle
  <skill>` runs each scenario in `tests/bench/<skill>.json` for the
  working-tree skill (challenger) and the champion — by default the R3
  champion lineage from PR #47's `championRow`; `--champion <git-ref>`
  overrides by materializing that version. Reuse the existing session-driving
  path, and persist all raw outputs to `tests/bench/outputs/` keyed by
  (prompt hash, skill content hash) using the existing `promptHash` helper.
  **Never regenerate a hit:** before generating either side, look the pair up
  in `outputs/` — the same cache-first shape as the existing
  `cachedBaseline()` — so an unchanged champion costs zero across
  revise-and-rebattle cycles, and a plain bench run's persisted outputs serve
  as the challenger side (with gate verdicts already computed) instead of a
  second generation pass. Scenarios where either side fails its `assert` or
  budget gate are excluded from battle (the gate already decided), as are
  `expect_no_activation` scenarios (no comparable output); log every
  exclusion.

- [ ] **Step 2: Evidence-cited battle judge.** Alongside `JUDGE_TEMPLATE`
  (~line 45), add `BATTLE_TEMPLATE`: given the scenario rubric and outputs A
  and B, the judge must emit one verbatim quote *from each output* justifying
  its verdict, then a single line `A`, `B`, or `TIE`. Missing/unquotable
  evidence forces `TIE` (ports the R4 evidence rule from the 1–5 judge).

- [ ] **Step 3: Position-swap.** Judge every pair twice — champion-first and
  challenger-first — reusing the persisted outputs. The verdicts must agree
  (after un-swapping) to count as a win; disagreement records as `TIE`.
  This kills position bias, the dominant known failure of pairwise judges,
  for the cost of one extra judge call per scenario. Short-circuit: a `TIE`
  on the first call is `TIE` regardless of the second — skip the swapped
  call (ties are likely the modal case).

- [ ] **Step 4: Audit log.** Append one record per judged pair to
  `tests/bench/battles.jsonl` (via the existing `recordHistory`/`pyJson`
  writer machinery, new path): skill, scenario id, prompt hash, champion +
  challenger git SHAs and skill content hashes, output artifact paths, judge
  model ID, both presentation orders' raw judge responses (rationale
  verbatim), final verdict, cost. The per-skill *tally* additionally lands as
  a row in `history.jsonl` so `skill-trends.ts` — the designated reader —
  reports on battles without a new query layer; battles.jsonl holds only the
  per-pair judge detail. Every verdict stays re-inspectable and re-judgeable;
  verdicts that aren't logged are gone.

- [ ] **Step 5: Decision rules (two, for two consumers).**
  - **Non-regression** — the Task 8 retrofit gate: among decided (non-tie)
    scenarios, wins ≥ losses; zero decided scenarios (all ties) passes as
    not-worse. The objective half stays R3's `beatsChampion` (pass rate
    holds, tokens ≤ 1.1×) — battle rules only on quality. This floor is
    satisfiable at E2-minimum bench size (~2 battle-eligible scenarios).
  - **Superiority** — required to *declare the challenger better* (victory/
    replacement): ≥5 decided scenarios AND ≥70% wins, mirroring R3's "no
    victory, no replacement" conservatism. Below the floor: report the tally,
    declare nothing. E2-minimum benches can therefore gate non-regression but
    never claim superiority — growing the scenario set is what unlocks it.

- [ ] **Step 6: Verify offline + commit**

Run: `node scripts/skill-bench.ts --battle repo-memory --dry-run`
Expected: renders the battle plan (scenario list, both sides, judge calls) without spending tokens.

```bash
git add scripts/skill-bench.ts
git commit -m "feat(bench): --battle pairwise judging — position-swapped, evidence-cited, logged (E5)"
```

**Deferred (not in this task; the persisted outputs + battles.jsonl schema
are the stable contract they all build on):**
- Escalation panel: a split verdict (Step 3 disagreement) escalates to a
  3-vote judge panel instead of auto-tie; panel cost lands only where
  uncertainty lives.
- `--review`: replay split/escalated cases for human adjudication; record
  overrides in `battles.jsonl` and report judge-vs-human agreement rate —
  the number that says whether to trust the automation at all.
- Per-axis verdicts (correctness, clarity) as separate battle rubrics; token
  efficiency stays objective — never judged.
- Distractor-present battles ([WILD]: distractors cost −7.7 points) once the
  bench spec grows realistic-retrieval scenarios.
- autoevals adoption point (References #8): if maintaining homegrown judge
  prompts stops being worth it, its calibrated scorers (Battle, Factuality,
  ClosedQA) slot in as alternative judges over the same persisted outputs.
  Friction to weigh then: it speaks the OpenAI SDK, so judging with Claude
  needs an OpenAI-compatible endpoint.

---

### Task 8: Retro-fit every existing skill (iterative, dependency order)

Follow-on to Tasks 1–7: requires the standard (Task 1), lint S9–S12 (Task 2),
negative-activation scenarios (Task 3), and battle mode (Task 7) to exist,
because they are the per-skill gate. Runs as many small PRs, not one sweep.
Where possible, batches execute through the existing evolve-skills lifecycle
pass (it already audits every skill against lint debt, bench history, and
telemetry) — this task defines the order and the per-skill gate, not a
parallel process.

**Files:**
- Create: `plans/development/skill-retrofit-order.md` (generated once, checked in)
- Modify per batch: `skills/<name>/SKILL.md`, `tests/bench/<name>.json`,
  `scripts/skill-lint-baseline.json` (shrinks each batch)

- [ ] **Step 1: Derive the dependency order (once, mechanically).** Seed the
  skill inventory from the existing
  `node scripts/evolve/skill_graph.ts inventory --json --tier repo` (don't
  re-implement enumeration); the new work is only edge extraction and the
  sort. A skill *depends on* another when its SKILL.md (or references/)
  names, links, or invokes it — grep each skill body for every other skill's
  name. Topo-sort with dependencies first, so a skill is only updated after
  the skills it points at already conform. Tie-break equal ranks by bench
  coverage (already-benched first — cheapest to verify). Cycles (e.g.
  mutually-referencing pairs) form one batch and update together. Skills in
  the same rank are independent — their batches may proceed in parallel; the
  edge order is a hard constraint only when a retrofit renames or moves a
  file other skills link to. Roots to seed rank 0 explicitly:
  `writing-skills` (the instrument — its references/ hosts the standard),
  then `evolve-distill`/`evolve-skills` (they mass-produce skills; updating
  them first stops new debt). Write the ordered list with its edge evidence
  to `plans/development/skill-retrofit-order.md` — the checked-in *ordering*,
  immutable once generated; progress lives in the shrinking lint baseline,
  not here.

- [ ] **Step 2: Iterate in batches of 3–5 skills, in that order.** Per skill:
  1. Lint clean: fix its S1–S12 findings; delete its entries from
     `skill-lint-baseline.json` (the shrinking baseline IS the progress
     tracker — no separate status file).
  2. Apply the judgment half of the standard (D/C/T/P rules): description
     rewrite against the cut test, body → references/ moves past budget,
     gotchas inline, explicit load triggers.
  3. Bench coverage: create or extend `tests/bench/<name>.json` to E2 shape
     (≥2 positive incl. a phrasing variant, ≥1 `expect_no_activation`).
  4. Prove not-worse: `skill-bench.ts --battle <name>` under Task 7's
     **non-regression rule** (wins ≥ losses among decided; R3's
     `beatsChampion` covers the objective half) — the battle consumes step
     3's persisted bench outputs as the challenger side, no second
     generation pass. Fails → at most 2 revise-and-rebattle attempts, then
     revert and move the skill to the tail of the order; never merge a
     regression. Record the tally in the PR.

- [ ] **Step 3: Batch close-out.** One PR per batch (commit per skill inside
  it), CodeRabbit + battle tallies in the description. Re-run
  `node scripts/skill-lint.ts` at each merge — WARN count must be monotonically
  falling; done when the baseline file is empty, every skill has an E2 bench
  file, and lint reports 0 FAIL / 0 grandfathered.

```bash
git add plans/development/skill-retrofit-order.md
git commit -m "docs(plans): skill retrofit burndown — dependency-ordered, battle-gated"
```

---

## Out of scope (deliberate)

- ~~Retro-fitting the existing skills to S9–S12~~ — **now in scope as
  Task 8** (iterative, dependency-ordered, battle-gated); the grandfather
  baseline remains the progress tracker.
- Retrieval/index tooling over the marketplace ([WILD]'s search findings) —
  huhhb's skill count doesn't yet warrant it; revisit at ~100+ skills [ANTH].
- Auto-compression of bodies ([SKILLRED]'s tool) — the standard makes authors
  write dense; we don't machine-rewrite. Naive shortening measurably degrades.
- A separate standard for buhhdy's bundled skills — buhhdy vendors from this
  repo and inherits the standard through it.

## References

1. Yang, Y., Gong, Z., Huang, W., et al. (Microsoft; SJTU; Tongji; Fudan).
   *SkillOpt: Executive Strategy for Self-Evolving Agent Skills.*
   arXiv:2605.23904v2, May 2026. https://arxiv.org/html/2605.23904v2
2. Gao, Y., Li, Z., Yuan, Y., Ji, Z., Ma, P., Wang, S.
   *SkillReducer: Optimizing LLM Agent Skills for Token Efficiency.*
   arXiv:2603.29919v2, June 2026. https://arxiv.org/html/2603.29919v2
3. Liu, Y., Ji, J., An, L., Jaakkola, T., Zhang, Y., Chang, S. (UCSB; MIT CSAIL;
   MIT-IBM). *How Well Do Agentic Skills Work in the Wild: Benchmarking LLM
   Skill Usage in Realistic Settings.* arXiv:2604.04323v1, April 2026.
   https://arxiv.org/html/2604.04323v1
4. agentskills.io. *Best practices for skill creators* (+ the Agent Skills
   specification). https://agentskills.io/skill-creation/best-practices
5. Gechev, M. *skills-best-practices.*
   https://github.com/mgechev/skills-best-practices
6. Dugan, A. (DigitalOcean). *How to Write and Implement Agent Skills.*
   January 15, 2026.
   https://www.digitalocean.com/community/tutorials/how-to-implement-agent-skills
7. Anthropic. *Skill authoring best practices.* Claude platform docs.
   https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
8. Braintrust. *autoevals — LLM-as-judge and heuristic evaluators
   (Battle, Factuality, ClosedQA; Python + TypeScript, standalone).* Tooling
   reference for Task 7's deferred adoption point, not evidence.
   <https://github.com/braintrustdata/autoevals>

Numeric claims from sources 1–3 were extracted via summarizing fetches of the
arXiv HTML; spot-check exact table values against the papers before quoting
them anywhere user-facing beyond this plan.
