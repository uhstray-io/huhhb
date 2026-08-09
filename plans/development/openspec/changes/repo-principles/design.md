## Context

See proposal.md — Why. The design-relevant state:

- `AGENTS.md` — 17 top-level sections, 400+ lines, agent-facing. `CLAUDE.md` is a
  three-line pointer asserting AGENTS.md is "the single source of truth".
- Six ADRs, five Accepted and one Proposed, under `plans/architecture/`.
- `skills/writing-skills/references/skill-authoring.md` — five properties and an
  enforcement-split table, normative for authoring one skill.
- The grill-style skills on this machine (`grill-me`, `grilling`,
  `grill-with-docs`) are **user-tier only** and appear in no marketplace entry.
- `skills/repo-kickstart/SKILL.md` is 10,900 chars against a 12,000 FAIL cap.
- A cautionary precedent lives in the repo: `plan/explanation-principles.md`
  declares itself the "canonical source" for copies shipped inside two skills —
  from inside a gitignored directory. The authority is not in the repository at
  all. That is what an unmaintained derivation becomes.

## Goals / Non-Goals

**Goals:**

- One human-readable statement of what this repository refuses to do and why.
- A derivation edge to `AGENTS.md` that is explicit and maintained, so the two
  cannot quietly disagree.
- An authoring mechanism that ships, so a conformed repository never depends on a
  skill that lives on one machine.

**Non-Goals:**

- **Restating the skill authoring standard.** `PRINCIPLES.md` states the
  constitutional claim; `skill-authoring.md` keeps the enforceable detail
  (D1–D5, C1–C4, T1–T5, P1–P7, E1–E5) and its lint-code citations.
- Rewriting `AGENTS.md`'s operational content. It gains an audience statement and
  a maintenance clause, not a reorganization.
- Making `PRINCIPLES.md` machine-enforced. Nothing gates on it; its consumers are
  people and the derivation clause.
- Authoring principles for other repositories. This change writes huhhb's and
  ships the mechanism.

## Decisions

**Split by audience, not by precedence.** The alternative framing — one document
outranking the other with a tiebreaker clause — was considered and rejected: it
makes every conflict an arbitration rather than a defect. Two documents for two
readers, with one partly derived from the other, means a contradiction is
something to *fix* rather than *adjudicate*. *Consequence:* `CLAUDE.md`'s
"single source of truth" claim needs the qualifier "for agents", or the repo
appears to name two sources.

**A derivation edge without a maintenance clause is a duplication.** This is not
hypothetical here — `plan/explanation-principles.md` is the same pattern already
gone wrong. The clause is therefore part of the requirement, not a note: when a
principle changes, the sections derived from it are reviewed in the same change.

**Principles must cite evidence from this repository.** Received best practice is
rejected on sight. This is what makes the document survive contact with the work:
every rule can name the decision, measurement, or incident behind it, and a rule
that cannot is not admitted. It also bounds the document's size honestly — huhhb
has roughly eight such rules, not thirty.

**`[TARGET]` labelling is a requirement, not a style.** A principle stating
something untrue is worse than a missing principle, because it will be cited. The
convention makes an unmet rule shippable by making it *labelled*, which is what
lets the document be written now rather than after everything is true.

**The authoring skill ships in the marketplace.** *Alternative rejected:* cite the
existing user-tier grill skills — they are not in `marketplace.json` and would be
a dangling reference for every user but one. *Alternative rejected:* inline the
questions into `repo-kickstart` — it is at 91% of its lint budget and would turn
an idempotent scaffolder into a long interactive session.

**Kickstart seeds a skeleton and stops.** The skeleton carries the conventions so
a repository that never runs the authoring pass still has the genre written down.
The verification checklist reports an unfilled skeleton as unauthored rather than
satisfied — otherwise seeding a file would be enough to look conformed, which is
the vacuous-green failure this repo has already removed from its bench.

## Risks / Trade-offs

- **`PRINCIPLES.md` becomes a fourth overlapping document.** → Bounded by the
  evidence rule and the no-procedure rule: it may only contain what is traceable
  to a decision, and may not restate steps. The scenarios are written so a
  procedural principle fails them.

- **The derivation goes stale anyway**, because the maintenance clause is a rule
  and not a gate. → Accepted, and stated plainly. Machine-checking "was the
  derived section reviewed" is not decidable from the files; per the repo's own
  enforcement split, a rule that needs judgment stays with review and is named as
  such rather than approximated by a check that would be confidently wrong.

- **The authoring pass is interactive and long**, which makes it hard to bench. →
  Its bench scenario asserts the *shape* of what it produces and that it refuses
  to invent unevidenced principles, not the full transcript of an interview.

- **Writing huhhb's own principles surfaces violations.** The as-built notes will
  name real defects — the gitignored canonical source, ADR-0005's status lag, the
  unrun live bench, contaminated trigger measurements. → That is the document
  working. A constitution that names nothing was not derived from the repository.

## Open Questions

- **Does the authoring skill also maintain an existing `PRINCIPLES.md`**, or only
  create one? Re-running it against a filled document could either refresh
  as-built notes or overwrite considered prose. This does not change the specs or
  the task breakdown — the create path is what this change requires — but it
  decides whether a second mode is needed later.
- **Which `AGENTS.md` sections are formally the derived ones?** Skill Quality Bar,
  What Not to Do, and Repo Memory are the obvious candidates; the boundary
  affects only how much is reviewed when a principle changes, not what gets built.
