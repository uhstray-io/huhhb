---
name: evolve-map
description: Use when understanding the whole skill ecosystem and how skills relate — inventorying every skill across tiers (repo / user / plugin), drawing relationships between them (overlaps, complements, composes-with, supersedes, gaps), recommending which to augment vs. build, avoiding duplicate skills, or promoting a user skill to the repository ("map the skills", "how do my skills relate", "which skills overlap", "what skill gaps exist", "recommend skill improvements", "promote this skill to the repo"). For one skill's health use evolve-skills; to create one workflow skill use evolve-distill.
---

# evolve-map — the skill ecosystem, understood and related

`/evolve-skills` judges skills one at a time (is *this* one healthy?).
`/evolve-map` sees them **together**: what exists across every tier, how they
relate, where they overlap or collide, and where the real gaps are — so skills
get used more effectively, more interoperably, and so a genuinely new skill is
built only when nothing already covers the approach.

Paths: `EVOLVE=${CLAUDE_PLUGIN_ROOT}/scripts/evolve`. The persisted map lives at
`<state dir>/skill-map.md` (resolve the state dir with `honcho_client.py
status`). Two layers, as everywhere in evolve: `skill_graph.py` does the
deterministic part (discover, parse, dedup, structural overlap); **you draw
the semantic relationships** — the tool only says where to look.

## Tiers (the delineation)

| Tier | Where | Ownership | Change path |
|---|---|---|---|
| **repo** | `skills/` | shared, versioned, everyone gets it | PR, human-merged + CI evals |
| **user** | `~/.claude/skills/*` (incl. `*-local` overlays) | this machine only | overlay patch / direct edit |
| **plugin** | `~/.claude/plugins/**/skills/*` | upstream-owned | **read-only** — fixes go upstream |

## Procedure

**1. Inventory.** Build the catalog across all tiers:

```bash
python3 $EVOLVE/skill_graph.py inventory          # human view, grouped by tier
python3 $EVOLVE/skill_graph.py inventory --json   # for analysis
python3 $EVOLVE/skill_graph.py overlaps            # structural near-duplicate pairs
```

`overlaps` flags same-name and high-similarity pairs; `cross_tier` pairs (a
user or plugin skill shadowing a repo one) are the sharpest signal. This is the
starting point, not the verdict — read the flagged skills before judging.

**2. Draw the relationship graph.** For the skills that matter to the user's
work (don't graph all 150+ plugin skills — focus on repo + user + the plugin
skills actually in play), classify each meaningful edge:

- **overlaps** — two skills do substantially the same thing → merge or
  deprecate one (never two skills for one intent; it splits trigger surface).
- **complements** — used together for one goal → note the pairing so they're
  invoked as a set.
- **composes-with** — one is a step the other orchestrates → make the handoff
  explicit in their descriptions.
- **supersedes** — one is the better version of another → deprecate the old.
- **gap** — a class of task no skill covers well → a genuine `create`
  candidate (see step 4).

Persist this to `<state dir>/skill-map.md`: a tier-sectioned node list plus the
edges, each edge one line with its type and the recommended action. Supersede
the file, don't append — it's the current model, kept current.

**3. Recommend improvements (augment before create).** For each skill worth
improving, name the concrete change and route it by tier:
- **repo** skill → propose a patch as a huhhb **PR** (never edit on-device).
- **user** skill / overlay → `overlay.py patch` (via `/evolve-review`).
- **plugin** skill → an **upstream** issue/PR; never a local divergence.
Recommendations without a specific, evidence-backed change are noise — skip them.

**4. Duplicate-proof creation.** Before ever proposing a new skill, check
`overlaps` and the inventory: **if a skill already covers the intent, augment
it (step 3), don't create.** Only a true `gap` — a class of approach nothing
covers — earns a new skill, and that goes through **`/evolve-distill`** (≥2
sessions or explicit ask, bundled eval, human approval). `/evolve-map` finds
the gap; `/evolve-distill` fills it under the gates.

**5. Promote user → repo.** When a user skill has proven broadly useful and
belongs to the team, stage a promotion (a user or the agent may initiate it).
Highest consequence radius, so the fullest gate — body, rationale, and the G1
eval every repo skill carries:

```bash
echo '{"kind":"repo-promotion","name":"<skill>","summary":"promote <skill> to repo",
       "signal":"proven useful across N sessions","rationale":"why the team needs it",
       "description":"Use when …","content":"<full SKILL.md body>",
       "eval":{"id":"smoke","prompt":"…","assert":"…"}}' \
  | python3 $EVOLVE/overlay.py propose
```

`propose` runs the GR4 poisoning scan on the promoted `content` before it can
stage (a promoted body is the widest-blast-radius skill write — everyone
installs it). On approval, `/evolve-map` (or `/evolve-review`) opens the huhhb
PR: writes `skills/<name>/SKILL.md`, the `marketplace.json` entry, and
`tests/bench/<name>.json` from the bundled eval — a human merges it. Never
promote a plugin skill (upstream-owned) or auto-write to the repo.

## Hard rules

- **Tiers are load-bearing.** Repo = shared/PR-gated; user = local; plugin =
  read-only. Every recommendation states the tier and its change path; a repo
  or plugin skill is never edited on-device.
- **Augment before create; never duplicate.** A new skill is justified only by
  a gap the inventory confirms nothing fills. Overlap → merge/augment.
- **Propose, never write.** Repo PRs and promotions are staged and
  human-approved; the map itself is the only thing this skill writes directly.
- **The tool points; you judge.** `skill_graph.py` seeds with structure; the
  relationships and recommendations are your reading of the actual skills.
