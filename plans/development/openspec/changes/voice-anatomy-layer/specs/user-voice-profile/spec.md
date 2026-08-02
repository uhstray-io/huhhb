# user-voice-profile

## ADDED Requirements

### Requirement: user-kickstart exists as a registered huhhb skill

The repo SHALL carry `skills/user-kickstart/SKILL.md` and
`skills/user-kickstart/reference.md`, an entry in `marketplace.json`, a line in
`onboarding/skills-list.md`, and at least one G1 bench scenario at
`tests/bench/user-kickstart.json`. The frontmatter SHALL follow the repo's rules — a
`name` matching the directory and a single-line `description` carrying the triggers,
with no `triggers:` field. The skill SHALL pass `node scripts/skill-lint.ts` without
adding new baseline debt.

#### Scenario: Registration is complete before merge
- **WHEN** `skill-lint` runs against the repo
- **THEN** `user-kickstart` is present in `marketplace.json` and
  `onboarding/skills-list.md` and reports no new lint failures

### Requirement: SKILL.md stays inside the lint body budget via progressive disclosure

`skills/user-kickstart/SKILL.md` SHALL keep its body under the 6000-character
`BODY_WARN_CHARS` threshold enforced by `scripts/skill-lint.ts`. The phase skeleton, the
gates, the handoffs, and the red-flags list SHALL live in `SKILL.md`; the interview
question set, the evidence-source list, the routing test, the banned-phrase list, the
block template, and the write contract SHALL live in `reference.md` and be referenced,
not inlined. Cross-references SHALL be plain relative paths and MUST NOT use `@`-prefixed
links, which force-load the target and burn context before it is needed.

#### Scenario: The body budget holds
- **WHEN** `node scripts/skill-lint.ts` runs
- **THEN** `user-kickstart` reports no body-size WARN or FAIL

#### Scenario: Reference material is not inlined
- **WHEN** `SKILL.md` is read
- **THEN** the ten interview questions and the banned-phrase list appear only in
  `reference.md`, cited by relative path

### Requirement: Discipline rules are loophole-closed with a rationalization table

`SKILL.md` SHALL carry a rationalization table and a red-flags list covering its three
discipline rules — the sixty-line cap, the never-resolve-contradictions-alone rule, and
the no-write-without-approval rule. Each table row SHALL pair a rationalization observed
in baseline testing with its counter. The red-flags list SHALL be phrased as
self-checks that fire before the violation, not after it. Entries SHALL be drawn from
recorded baseline transcripts and MUST NOT be invented.

#### Scenario: A time-pressure rationalization is countered
- **WHEN** the user says they are in a hurry and to skip the diff
- **THEN** the skill still shows the diff, and the rationalization appears in the table
  with its counter

#### Scenario: The table is evidence-backed
- **WHEN** the rationalization table is reviewed against the baseline transcripts
- **THEN** every row traces to a rationalization actually observed, not a hypothetical

### Requirement: The description states triggers only, never the workflow

The `description` SHALL consist of triggering conditions, symptoms, and situations, and
MUST NOT summarize the skill's process, phases, or workflow. It MUST NOT name the
interview, the audit, the routing test, or the phase count. A description that
summarizes the workflow creates a shortcut the model follows in place of reading the
body, which on a five-phase skill would collapse to the interview alone and silently
drop the audit, the routing, and the write gate.

#### Scenario: The description omits the process
- **WHEN** the frontmatter is read
- **THEN** it names triggers and symptoms only, with no phase list, no phase count, and
  no mention of interviewing, auditing, or routing as a described procedure

#### Scenario: The full workflow runs rather than the description's shortcut
- **WHEN** the skill is invoked from a trigger phrase
- **THEN** all five phases run, rather than the skill stopping after the phase the
  description would have implied

### Requirement: Trigger scope is user-level only and handoffs are named

The skill SHALL apply only to establishing a user-level voice-and-goals profile in
`~/.claude/CLAUDE.md`. `SKILL.md` SHALL name four handoffs
explicitly and route to them rather than absorbing their scope: repo or project
CLAUDE.md quality audits to `claude-md-management:claude-md-improver`, folding session
learnings into repo files to `/revise-claude-md`, `settings.json`, hooks and permissions
to `update-config`, and store installation or repair to `two-store-memory-setup`. The
skill MUST NOT write to any repository-level `CLAUDE.md` or `AGENTS.md`.

#### Scenario: A repo-audit request is routed away
- **WHEN** the user asks to audit the CLAUDE.md files in the current repository
- **THEN** the skill names `claude-md-improver` and does not begin its interview

#### Scenario: A user-level voice request is accepted
- **WHEN** the user asks to set up how Claude should talk to them across all projects
- **THEN** the skill runs its own workflow

### Requirement: The bench fixture carries positive and negative trigger lists

`tests/bench/user-kickstart.json` SHALL carry a `triggers` object with both `positive`
and `negative` arrays, following the format of the existing fixtures. The `negative`
array SHALL include phrasings that belong to the four handoff targets — a repo CLAUDE.md
audit, folding session learnings into a repo file, a settings.json or permissions change,
and a memory-store install or health check — so trigger precision is measured against the
skills most likely to be stolen from. Measured precision and recall SHALL both be 1.0
before merge.

#### Scenario: A neighbouring skill's phrasing does not trigger this skill
- **WHEN** the bench runs the negative trigger list
- **THEN** `user-kickstart` does not match any of them

### Requirement: The workflow is five ordered phases

`SKILL.md` SHALL define exactly five phases in order — read current state, interview,
draft, evidence audit, resolve, write — with the write phase last and gated. Phase 0
SHALL read `~/.claude/CLAUDE.md`, detect existing managed-block markers, and recall from
the hindsight `personal` bank. The skill SHALL NOT skip the interview when a block
already exists; a re-run SHALL show what is currently in force and interview only the
deltas the user wants to change.

#### Scenario: A first run walks all five phases
- **WHEN** no `VOICE & WORKING PROFILE` markers exist in `~/.claude/CLAUDE.md`
- **THEN** the skill runs read, interview, draft, audit, resolve, and write in order

#### Scenario: A re-run shows current state before asking
- **WHEN** the markers already exist
- **THEN** the skill presents the block currently in force and interviews only the
  changes the user asks for

### Requirement: The interview is cold, one question at a time, and bounded

The interview SHALL ask approximately ten questions, one per message, preferring
multiple choice with a free-text escape, and SHALL NOT mine artifacts before asking.
Coverage SHALL include identity and audience, formality and contractions, length
default, whether to lead with the conclusion or the context, hedging versus assertion
and what to do when uncertain, banned phrases offered as an editable default list, when
to ask versus decide, which working contexts the user actually operates in and how voice
shifts across them, standing goals and constraints, and corrections the user has had to
repeat. Each answer SHALL be tagged with its destination store at the moment it is
captured.

#### Scenario: Questions are asked singly
- **WHEN** the interview runs
- **THEN** each message contains one question and waits for an answer

#### Scenario: Every answer carries a destination
- **WHEN** the interview completes
- **THEN** each captured answer is marked for `~/.claude/CLAUDE.md` or for the
  `personal` bank

### Requirement: The draft is audited against real artifacts and the sample is reported

After drafting and before writing, the skill SHALL audit each drafted rule against a
bounded evidence sample: at most the last 100 commits across the user's repository root,
at most the last 20 pull-request bodies, all `.claude/memory/feedback-*.md` files it can
read, cached evolve conclusions, and one `personal`-bank recall. Each rule SHALL receive
a verdict of `supported`, `contradicted`, or `no evidence` with a citation. The skill
SHALL print what it actually sampled, including anything it could not reach, and MUST
NOT present a partial sample as complete coverage.

#### Scenario: A contradicted rule is surfaced with its evidence
- **WHEN** the user states a no-hedging preference and sampled commits contain hedged
  subjects
- **THEN** the rule is reported `contradicted` with the citing commits

#### Scenario: An unreachable source is reported, not hidden
- **WHEN** the `gh` CLI is unavailable and PR bodies cannot be read
- **THEN** the audit reports that the PR source was skipped and why

#### Scenario: A new preference is not penalized
- **WHEN** a stated preference has no supporting or contradicting artifact
- **THEN** it is reported `no evidence` and carried forward unchanged

### Requirement: The user resolves contradictions; the skill never resolves them alone

For each `contradicted` rule the skill SHALL offer keep, edit, or drop, and SHALL apply
only the user's choice. The skill MUST NOT rewrite, soften, or silently discard a rule
on the basis of evidence.

#### Scenario: The user keeps a contradicted rule
- **WHEN** the user reviews a contradicted rule and chooses keep
- **THEN** the rule is written verbatim into the block and the contradiction is not
  mentioned again in the write report
