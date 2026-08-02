# voice-profile-routing

## ADDED Requirements

### Requirement: A three-part test decides which store receives each answer

`skills/user-kickstart/reference.md` SHALL define the routing test and `SKILL.md` SHALL
apply it to every captured answer. An answer is written to `~/.claude/CLAUDE.md` only if
all three hold: it must be true in every session and is not project-scoped, it changes
output or behavior when present rather than merely describing something, and it reads as
a directive rather than a rationale. Failing any part SHALL route the answer to the
hindsight `personal` bank instead. Rationale, rejected alternatives, past corrections,
and outcomes SHALL always route to the bank. Project-scoped preferences SHALL route to
that repository's own bank and MUST NOT be written to `personal`.

#### Scenario: A directive reaches CLAUDE.md
- **WHEN** the user states that Claude should never open with pleasantries
- **THEN** the rule is written into the CLAUDE.md block

#### Scenario: A rationale reaches the personal bank
- **WHEN** the user explains why they abandoned a previous instruction style
- **THEN** the explanation is retained in the `personal` bank and does not appear in
  CLAUDE.md

#### Scenario: A project-scoped preference does not reach personal
- **WHEN** a stated preference applies only to one repository
- **THEN** it routes to that repository's bank and not to `personal`

### Requirement: Bank writes use sync_retain and are approved as a batch

Writes to the hindsight `personal` bank SHALL use `sync_retain`, not `retain`, so the
write is confirmed rather than merely accepted. Each retain SHALL be one clean,
self-contained paragraph in domain language. The skill SHALL present the full set of
proposed retains and their count for approval before issuing any of them, and SHALL
report the returned memory identifiers afterward. The skill MUST NOT retain file paths,
symbol names, call relationships, whole file contents, or credential values.

#### Scenario: The user sees the cost before it is paid
- **WHEN** five answers route to the bank
- **THEN** all five paragraphs and the count are shown for approval before any write

#### Scenario: Structural content is refused
- **WHEN** an answer names a function and its callers
- **THEN** that content is not retained and the skill says why

### Requirement: Secrets survive neither the audit report nor the block

The evidence audit reads commit messages, pull-request bodies, and memory files, any of
which may contain a credential. Citations printed in the audit report SHALL be redacted
for credential-shaped content — tokens, keys, passwords, connection strings bearing
credentials, and real postal or email addresses drawn from private-config repositories —
and the skill MUST NOT echo such a value into chat. No rule written into the
`~/.claude/CLAUDE.md` block SHALL contain a credential value; where a rule must reference
one, it SHALL name the environment variable instead. This carve-out applies in addition
to the never-retain rules governing bank writes.

#### Scenario: A secret in a cited commit message is redacted
- **WHEN** a sampled commit message contains an API key and the audit cites that commit
- **THEN** the citation is shown with the key redacted and the raw value never printed

#### Scenario: A rule referencing a credential names the variable
- **WHEN** a stated preference concerns a credentialed endpoint
- **THEN** the written rule names the environment variable and not its value

### Requirement: The CLAUDE.md block is capped at sixty lines

The rendered `VOICE & WORKING PROFILE` block SHALL NOT exceed sixty lines. When the
resolved rule set would exceed the cap the skill SHALL stop and run a prune with the
user, and MUST NOT write an oversized block or silently truncate one. The cap SHALL be
fixed, not configurable.

#### Scenario: An oversized block blocks the write
- **WHEN** the resolved rules render to seventy lines
- **THEN** the skill reports the overage and asks the user to cut before writing

### Requirement: Writes are marker-scoped, backed up, and diff-gated

Before writing, the skill SHALL copy `~/.claude/CLAUDE.md` to
`~/.claude/CLAUDE.md.bak-<timestamp>` and report the path. It SHALL then replace only
the bytes between its own `# >>> VOICE & WORKING PROFILE (BEGIN — delete this whole
block to revert) >>>` and `# <<< VOICE & WORKING PROFILE (END) <<<` markers, appending a
fresh block when no markers are present. Content outside those markers, including any
other managed block, MUST NOT be modified. The skill SHALL show the diff and obtain
explicit approval before writing, and MUST NOT write without it.

#### Scenario: An existing unrelated block survives a re-run
- **WHEN** `~/.claude/CLAUDE.md` contains a two-store memory routing block and the skill
  re-runs
- **THEN** only the voice block changes and the routing block is byte-identical
  afterward

#### Scenario: A first run appends rather than overwriting
- **WHEN** no voice markers are present in a non-empty `~/.claude/CLAUDE.md`
- **THEN** the block is appended and prior content is preserved

#### Scenario: The write is refused without approval
- **WHEN** the diff is shown and the user does not approve
- **THEN** nothing is written and the backup path is still reported

### Requirement: Re-running is idempotent

Running the skill twice with the same resolved answers SHALL leave
`~/.claude/CLAUDE.md` byte-identical after the second run and SHALL NOT create a second
voice block, duplicate markers, or duplicate `personal`-bank memories.

#### Scenario: A second identical run changes nothing
- **WHEN** the skill runs twice with unchanged answers
- **THEN** the file after the second run matches the file after the first and no new
  bank memories are created
