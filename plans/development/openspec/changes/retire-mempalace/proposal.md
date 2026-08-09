## Why

`.claude-plugin/.mcp.json` registers an MCP server named `memory` pointing at
`uvx mempalace-mcp` for **every person who installs huhhb** — a generic name
fronting a store this project stopped routing to on 2026-08-01. Registration is
imposition: it reaches installers who hold no MemPalace data and never asked for
its tools.

**This proposal previously argued for deleting the four `memory-*` skills as
well. That argument no longer holds.** It rested on trigger competition — four
skills matching the phrasings the current system owns. Commit `a7d2a4a` already
fixed that: every one of the four descriptions now opens with "LEGACY, retired
from routing 2026-08-01" and routes the reader onward by name, to hindsight
recall, to codebase-memory-mcp indexing, to `memory-setup`, to `repo-memory`.
The competition the deletion was meant to end had already ended.

What remains is narrower and real: the plugin still *installs* a retired store.
Removing the registration fixes that without destroying anything — and the
`.claude/memory/` record from 2026-08-01 already says why deletion was the wrong
half of the decision: *"MemPalace's stored data is not regenerable and deletion
is irreversible — the routing change is the cheap, reversible half."*

## What Changes

- **BREAKING (for the shipped surface, not for data)**: remove the `memory`
  server from `.claude-plugin/.mcp.json`. Installers stop receiving a tool
  surface for a store this project does not route to.
- **The four `memory-*` skills stay.** They are the read path to data that is not
  regenerable, and they no longer compete for current phrasings.
- **They gain a stated prerequisite.** Each declares that its tools require the
  `memory` MCP server, which is now opt-in, and names the configuration to add.
  A skill that assumes a server the plugin no longer registers is a dangling
  call — the failure this change exists to avoid, not to create.
- Documentation reconciles: `AGENTS.md`, `README.md` and `KICKSTART.md` describe
  MemPalace as opt-in rather than shipped, and the routing policy says which
  stores are registered, which are opt-in, and which are current.
- The sync scripts and the vendoring relationship **stay** — the skills stay, so
  their upstream source stays with them.

**No user data is touched.** MemPalace remains installed, its data intact, and
reachable both through the opt-in registration and through its own CLI.

## Capabilities

### New Capabilities

- `memory-routing`: which memory stores the plugin installs versus offers, the
  conditions under which a retired store's skills may keep shipping, and the
  invariant that the installed set matches the routed set.

### Modified Capabilities

None.

## Impact

- `.claude-plugin/.mcp.json` — the registration. If removing it leaves
  `{"mcpServers":{}}`, verify against the loader whether an empty object is valid
  or the file must go; do not assume.
- The four `skills/memory*/SKILL.md` bodies — a prerequisite line each. Their
  descriptions are already correct and are **not** re-edited.
- `AGENTS.md`, `README.md`, `KICKSTART.md` — shipped-versus-opt-in wording.
- `hooks/stop-hook.sh` calls the `mempalace` **CLI**, not the MCP tool, and is
  already guarded `2>/dev/null || true` — unaffected. `scripts/evolve/evals.ts`
  hits are fixture transcript strings, not calls. Verified by grep; recorded here
  so the next reader does not re-derive it.
- `skill-lint` count is unchanged at 53 — no skill is removed.
- **Out of scope**: `buhhdy/` still names MemPalace as the user-memory system of
  record. buhhdy is being removed from this repo with its practices carried
  elsewhere; that fix belongs to that migration.

## Rollback Plan

- **The registration** — restore the four-line block. Reinstalling re-registers
  the server; there is no state to migrate and nothing was deleted.
- **The prerequisite lines** — ordinary reverts of skill bodies.
- **Documentation** — ordinary reverts.

Nothing in this change destroys anything, which is the point of choosing it over
deletion. The one risk worth naming is the reverse of the old plan's: a user who
relied on the shipped registration will find their MemPalace tools absent after
an update, and must add the opt-in block. That is why the skills state the
prerequisite rather than failing with an unexplained missing tool, and why the
change is marked BREAKING despite deleting nothing.
