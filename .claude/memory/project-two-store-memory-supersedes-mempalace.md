---
name: project-two-store-memory-supersedes-mempalace
description: huhhb ships two competing memory skill families — MemPalace (memory*) and two-store-memory-setup; the two-store routing is the current one and MemPalace is retired from routing, not deleted
metadata:
  node_type: memory
  type: project
---

As of 2026-08-01 this repo ships **two** memory skill families, and only one of
them is on the routing path.

- `skills/two-store-memory-setup/` — current. Installs a device-level policy
  that routes *structure* questions to a code-graph store and *experience*
  questions (decisions, outcomes, preferences) to an experience store.
- `skills/memory/`, `memory-mine/`, `memory-onboarding/`, `memory-search/`,
  `memory-status/` — MemPalace. **Retired from routing.** Still shipped, still
  installed, data intact; invoked only when asked for by name.

**Why:** MemPalace and the graph store both claimed the same role, which
created two sources of truth with no signal saying which to trust. The
two-store split resolves it by making the boundary a property of the *fact*,
not of the tool: anything regenerable from source belongs to the graph store,
anything about why/what-happened belongs to the experience store. Retiring
rather than deleting was chosen because MemPalace's stored data is not
regenerable and deletion is irreversible — the routing change is the cheap,
reversible half of the decision.

**How to apply:** Do not treat the surviving `memory*` skills as evidence that
MemPalace is the repo's memory story — their SKILL.md descriptions still
advertise themselves and will match a generic "remember this" prompt. For
repo-committed team knowledge use `repo-memory` (this directory). For
device-level setup or repair use `two-store-memory-setup`. Before removing
any `memory*` skill, treat it as a breaking plugin change, not cleanup.

The vendor-neutral setup detail, the verified defect catalogue, and the
measured cost numbers live in `skills/two-store-memory-setup/reference.md` —
that file is canonical for *how*; this memory only records *which one wins*.

Related: [[project-mempalace-architecture]] still holds — huhhb never owns the
MemPalace Python runtime, only its SKILL.md files and plugin config. Retirement
from routing does not change that.

**Amended 2026-08-09 (`retire-mempalace`).** This record's judgement was right and
is confirmed, not superseded: retiring beat deleting, and nothing was deleted.
Two facts it states have changed shape, so read them this way now:

- *"Still shipped, still installed"* — the **skills** still ship; the **MCP
  server does not**. huhhb registered it for every installer, which imposed a
  store on people holding no data in it. It is now opt-in: the user adds the
  block themselves (`skills/memory/reference.md`), which is also the only way to
  reach these skills' tools.
- *"Their SKILL.md descriptions still advertise themselves and will match a
  generic 'remember this' prompt"* — **fixed, and it was worse than recorded.**
  The 2026-08-01 rewrite marking them LEGACY landed only in `marketplace.json`;
  the frontmatter kept the originals, and the frontmatter is what an agent is
  handed. Verified against an installed cache carrying both texts. The
  retirement was invisible to every agent for eight days. Both copies now agree.
  A patch script briefly sourced one from the other; it was deleted with the
  rest of the MemPalace sync tooling on 2026-08-09, so the guard that survives
  is `skill-lint` comparing the two copies for all 51 skills — routed to
  `skill-retrofit` with the 28-skill drift burndown, not yet built.
