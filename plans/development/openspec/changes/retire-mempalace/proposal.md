## Why

`.claude-plugin/.mcp.json` registers an MCP server named `memory` pointing at
`uvx mempalace-mcp` for **every person who installs huhhb** — a generic name
fronting a store this project stopped routing to on 2026-08-01. Registration is
imposition: it reaches installers who hold no MemPalace data and never asked for
its tools.

**This proposal previously argued for deleting the four `memory-*` skills.** That
argument rested on trigger competition — four skills matching the phrasings the
current system owns — and on the belief that commit `a7d2a4a` had already ended
it by marking every description "LEGACY, retired from routing 2026-08-01".

**Measured while applying this change: `a7d2a4a` landed on the wrong surface.**
Those LEGACY descriptions live only in `marketplace.json`. The `SKILL.md`
frontmatter still carries the originals, and the frontmatter is what an agent is
handed at session start — verified against this session's own skill list, which
shows the frontmatter text verbatim and not one word of the rewrite. So `memory`
still claims *"remember this"*, *"what do we know about"*, *"recall"*, and still
declares itself an **auto-trigger at session start**.

The competition never ended. It was documented as ended in a file nothing reads.

That does not restore the case for deletion — the `.claude/memory/` record from
2026-08-01 still holds: *"MemPalace's stored data is not regenerable and deletion
is irreversible — the routing change is the cheap, reversible half."* It means
freeing the trigger surface is **work this change must do**, not a precondition
it inherited.

Two costs, then, both real: the plugin *installs* a store it does not route to,
and the store's skills still compete for the phrasings the current system owns.

## What Changes

- **BREAKING (for the shipped surface, not for data)**: remove the `memory`
  server from **both** places that register it — `.claude-plugin/.mcp.json` and
  the `mcpServers` key in `.claude-plugin/plugin.json`, which duplicates it
  exactly. Removing only the first leaves the server shipping.
- **The four `memory-*` skills stay.** They are the read path to data that is not
  regenerable. They will stop competing for current phrasings once their
  frontmatter is fixed below — today they still do.
- **They gain a stated prerequisite.** Each declares that its tools require the
  `memory` MCP server, which is now opt-in, and points at one shared block
  (`skills/memory/reference.md`) carrying the config to add. A skill that assumes
  a server the plugin no longer registers is a dangling call — the failure this
  change exists to avoid, not to create.
- **Their frontmatter descriptions are rewritten to match their marketplace
  entries.** This is the trigger-surface fix that `a7d2a4a` was believed to have
  made. Until it lands, retirement is a claim the runtime does not honour.
- Documentation reconciles: `AGENTS.md`, `README.md` and `KICKSTART.md` describe
  MemPalace as opt-in rather than shipped, and the routing policy says which
  stores are registered, which are opt-in, and which are current.
- The sync scripts and the vendoring relationship **stay** — the skills stay, so
  their upstream source stays with them. `patch-mempalace.sh` gains the job of
  re-applying the description and prerequisite to `skills/memory/SKILL.md` after
  each sync, since that one file is overwritten from upstream while the other
  three are ours.

**No user data is touched.** MemPalace remains installed, its data intact, and
reachable both through the opt-in registration and through its own CLI.

## Capabilities

### New Capabilities

- `memory-routing`: which memory stores the plugin installs versus offers, the
  conditions under which a retired store's skills may keep shipping, and the
  invariant that the installed set matches the routed set.

### Modified Capabilities

None.

**How this lands relative to `memory-store-survey`.** That change teaches
`memory-setup` phase 0 to detect MemPalace by name and ask the operator to keep
it alongside hindsight or replace it. This change is what makes "keep" a
coherent answer: after it, keeping MemPalace means adding the opt-in block, and
the routing policy phase 0 writes can say so. Landing this first is what stops
that survey offering a choice between a store the plugin imposes and one it
routes to.

## Impact

- `.claude-plugin/.mcp.json` **deleted** and `.claude-plugin/plugin.json`'s
  `mcpServers` key removed. Both forms were verified valid against installed
  plugins — MemPalace's own ships an empty `mcpServers`, caveman ships no file —
  and deletion was chosen because `plugin.json` already supports the key, so an
  empty `.mcp.json` would exist to say nothing. One registration site remains
  should huhhb ever ship a server again.
- The four `skills/memory*/SKILL.md` — a prerequisite pointer and a corrected
  frontmatter description each. `skills/memory/reference.md` is new and holds the
  opt-in block once.
- `scripts/patch-mempalace.sh` — re-applies both to the vendored `memory` skill
  after a sync.
- **Wider defect found while measuring, deliberately out of scope:** 28 of 51
  skills carry semantically different descriptions in `marketplace.json` versus
  their frontmatter, and `skill-lint`'s S4 and S11 check the marketplace copy —
  not the frontmatter that actually loads. Fixing four here does not fix that;
  it belongs with `skill-retrofit`, which owns burning down per-skill debt.
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
