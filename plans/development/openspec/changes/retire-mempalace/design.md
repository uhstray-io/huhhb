## Context

See proposal.md — Why. Written after implementation, consolidating decisions that
were otherwise scattered across task notes and five commit messages. That is the
wrong order and worth naming: this change reversed its own premise twice while
being applied, and each reversal came from a measurement rather than a debate.

State at the time the work began:

- `.claude-plugin/.mcp.json` registered `memory` → `uvx mempalace-mcp` for every
  installer. **`.claude-plugin/plugin.json` carried an `mcpServers` key
  duplicating it exactly** — undocumented in this change's own proposal and in
  the 2026-08-02 migration plan that preceded it.
- Commit `a7d2a4a` had marked all four skills LEGACY **in `marketplace.json`
  only**. Their `SKILL.md` frontmatter still carried the originals.
- `.claude/memory/project-two-store-memory-supersedes-mempalace.md` (2026-08-01)
  recorded that retiring was chosen *over* deleting, because the store's data is
  not regenerable and deletion is irreversible.
- Only `skills/memory/SKILL.md` is vendored; `sync-mempalace.sh` overwrites it
  wholesale, and `patch-mempalace.sh` existed to re-apply local edits after.

## Goals / Non-Goals

**Goals:**

- Stop *installing* a store this project does not route to.
- Keep the read path to data that cannot be regenerated.
- Make the retirement true on the surface that governs behaviour, not only on
  the one that documents it.

**Non-Goals:**

- Deleting anything. The count of shipped skills is unchanged at 53, which is
  the check that keeps this honest.
- Fixing the repo-wide description drift (28 of 51 skills) or the fact that
  `skill-lint` S4/S11 inspect the manifest copy rather than the frontmatter that
  loads. Both were found here; both belong to `skill-retrofit`.
- Correcting `buhhdy/`'s MemPalace references. It is being removed from this
  repo; that work would be discarded.

## Decisions

**Un-register rather than delete — a reversal, on evidence.** The original plan
deleted the four skills, justified by trigger competition. Measurement showed the
competition was the *only* live cost that deletion uniquely solved, and that
un-registering plus fixing descriptions solves it without destroying the read
path. This also restored agreement with the 2026-08-01 record, which the delete
plan silently contradicted. *Alternative rejected:* deprecation banners with the
registration intact — that keeps imposing the server, which is the actual cost.

**Registration is imposition; a skill is an offer.** This is the distinction the
whole change turns on. A registered MCP server reaches every installer whether
they want it or not; a skill only answers when called. Splitting them is what
allows the imposition to end without the capability ending.

**Remove from both sites, and delete `.mcp.json` rather than empty it.** Both
forms were verified valid against installed plugins first — MemPalace's own
plugin ships an empty `mcpServers` and loads; caveman ships no file at all.
Deletion won because `plugin.json` already supports the key, so an empty
`.mcp.json` would be a file existing to say nothing, and removing it collapses
the two-sites problem that caused the near-miss in the first place.

**Do not copy the manifest description into the frontmatter.** Task 3.2 said to,
and following it literally would have added three S4 WARNs for missing trigger
phrasing, left the retired skills unreachable *by name* — which the spec
requires — and produced invalid YAML, because `memory`'s manifest text contained
`": "`. One corrected description was written and applied to both surfaces
instead: LEGACY marker, explicit by-name trigger, redirect, opt-in note.

**The patch script reads the description from `marketplace.json`.** Hardcoding it
would have made the two copies drift-able again — the exact defect that had gone
unnoticed for eight days. Sourcing one from the other makes drift impossible
rather than merely discouraged. Verified by simulating a sync that reset the
description, the name and the branding and stripped the prerequisite: the script
restores the file byte-identically.

**The opt-in block is written once and pointed at four times.** Four copies of a
config snippet is four things to keep in sync, and this repo already has a
"canonical source" that drifted out of the repository entirely
(`plan/explanation-principles.md`, canonical from inside a gitignored directory).

**The manifest description is not the routing surface.** Verified decisively: the
installed cache at 0.8.22 carries the LEGACY text in `marketplace.json` *and* the
original in frontmatter, and the session was handed the frontmatter. Every
description rule this repo enforces is enforced against the copy nothing reads.

## Risks / Trade-offs

- **A user who relied on the shipped registration loses their tools on update.**
  → The skills say the tools are unavailable *by design* and point at the fix;
  `reference.md` leads with the standalone MemPalace plugin, which registers its
  own server independently of huhhb; the hand-written block reproduces exactly
  what we used to ship. Measured on this machine, the registration was already
  producing no tools at all.

- **Coexistence is only safe while the retired skills stay off current
  phrasings.** That is now true in both copies and enforced through a sync — but
  it is a property of text, not a gate. → A drift check belongs with the
  repo-wide description work in `skill-retrofit`, where it would cover 51 skills
  rather than 4.

- **Four of eight spec scenarios are verified structurally, not live.** →
  Recorded as partial rather than claimed, and carried to a follow-up change.
  All four are blocked on one action: this branch installed into a real profile.

- **The vendored skill is one upstream change away from a surprise.** If upstream
  restructures `SKILL.md`, `patch-mempalace.sh`'s insertion point may not match.
  → It fails loudly rather than silently: the description step exits non-zero if
  no `description:` line is found.

## Migration Plan

No data migration. Ordering mattered only in one place, and it is the thing that
made phase 1 unsafe alone: un-registering the server while the four skills still
assumed it would have created a dangling call in four shipped skills. Phase 2
(the stated prerequisite) is what makes phase 1 survivable, so they ship
together.

Users pick the change up on their next plugin update. A user who wants MemPalace
adds one config block, or installs the standalone plugin.

Rollback is per-piece and covered in proposal.md — Rollback Plan.

## Open Questions

- **Should the drift guard be a lint check?** It would cover 51 skills rather
  than 4, but 28 currently fail — a baseline that large is what S9–S12's design
  already rejected as indistinguishable from no check. Belongs to
  `skill-retrofit` with its burndown, not here.
- **Does the standalone plugin's server name (`mempalace`) versus huhhb's
  (`memory`) matter in practice?** The skills call tools by bare name, so both
  appear to work; `reference.md` documents the difference rather than resolving
  it. Worth confirming once a live install exists.
