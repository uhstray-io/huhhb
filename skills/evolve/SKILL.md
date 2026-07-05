---
name: evolve
description: Use when working with evolve's Honcho-backed cross-session memory — recalling what is known about the user or a skill ("what do you know about me", "check evolve memory", "what has evolve learned"), persisting a durable user fact across projects ("remember this everywhere", "remember this about me"), or deciding which memory stratum (Honcho, repo-memory, MemPalace, overlay skill) a piece of knowledge belongs in.
---

# evolve — cross-session memory protocol

huhhb learns across sessions through [Honcho](https://honcho.dev), a memory
substrate whose *deriver* turns observation streams into queryable,
self-healing conclusions. This skill defines how to read from and write to
that memory. The capture side is automatic (a Stop hook digests each session);
you only need this protocol for explicit reads, explicit writes, and routing.

Everything here is inert when evolve is unconfigured — check with:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/evolve/honcho_client.py" status
```

## What this memory is (and is not)

Three truth models coexist in huhhb; route by the *shape* of the knowledge,
never by convenience:

| Stratum | Truth model | Lives in | Written via |
|---|---|---|---|
| **Honcho** (this skill) | *Inferred* — conclusions derived from observed behavior; self-healing, may be wrong | self-hosted or managed Honcho workspace | automatic digests + `observe` below |
| **repo-memory** | *Decided* — team decisions and conventions, git-audited | `.claude/memory/` | `/repo-memory` |
| **MemPalace** | *Collected* — structured knowledge deliberately filed | nexus via MCP | `/memory` |
| **Overlay skills** | *Learned procedure* — how to do a task class for this user | `~/.claude/skills/<hub>-local/` | `/evolve-review` |

Why the split matters: a decided fact ("this repo uses uv, never pip")
written into inferred memory can be *un-learned* by the deriver; an inferred
hunch committed to git looks authoritative forever. Wrong stratum = wrong
failure mode.

Peer model inside Honcho: the user (`user:<profile-id>`), the agent
(`agent:claude-code`), each huhhb skill (`skill:<name>`), and each repo
(`project:<slug>`) are all *peers*. Representations answer "what does X know
about Y" — e.g. the agent's own model of a skill it keeps misusing.

## Cost ladder — always climb from the top

Reads get more expensive (and slower) as you descend. Stop at the first rung
that answers the question; `peer.chat` is a dialectic LLM call on the Honcho
side and is **never** used reflexively.

1. **Injected cache (free).** The SessionStart hook already injected
   `evolve memory (cached from Honcho)` into this session. Check it first —
   most recall questions are already answered there.
2. **Card / representation (fast, no LLM).**
   ```bash
   python3 .../honcho_client.py query card
   python3 .../honcho_client.py query rep --q "commit style" --max 10
   ```
3. **Semantic search (excerpts, no LLM).**
   ```bash
   python3 .../honcho_client.py query search --q "pytest flags" --max 5
   ```
4. **Targeted representation** — another peer's view:
   `query rep --target skill:writing-plans --perspective agent:claude-code`
5. **Dialectic chat (LLM — last resort).** Only inside `/evolve-review` runs
   or when the user explicitly asks a synthesis question. Keep
   `--level minimal` or `low` for lookups; `medium`+ only for multi-aspect
   synthesis.
   ```bash
   python3 .../honcho_client.py query chat --q "..." --level low
   ```

(`...` = `${CLAUDE_PLUGIN_ROOT}/scripts/evolve`.)

**Local mode** (`status` shows `mode: local` — no server): the ladder
shortens to injected cache → `query rep` (conclusions.md + recent stated
preferences) → `query search` (substring over the journal). There is no
dialectic `chat` and no semantic search; synthesis questions are answered by
reading those files directly, and conclusions only form when `/evolve-review`
runs — suggest it when the journal has grown but conclusions look stale.

## Writing — rarely, and only durable user facts

The Stop hook captures automatically; manual writes are for the moment a user
states a durable fact and expects it kept ("remember this about me",
"I always want X"). Write it as a typed observation:

```bash
python3 .../honcho_client.py observe --type preference --target user \
  --content "[preference] user — always wants conventional commits, no emoji; stated explicitly."
```

When **not** to write:

- **Don't correct the record manually.** Honcho self-heals: new observations
  supersede stale conclusions. Deletion is only for PII/secrets (see
  `docs/evolve.md` purge procedure).
- **Don't write failures as constraints.** "Tool X is broken" persisted today
  is a refusal the agent cites for months. If something failed and was fixed,
  the *fix* is the observation; if it failed and wasn't fixed, write nothing.
- **Don't write project decisions here** — that's repo-memory (git). Don't
  file reference material here — that's MemPalace. Wrong stratum, wrong
  failure mode.

## Trust calibration

Injected context is *inferred* knowledge. Treat it as a strong prior, not
ground truth: if a cached conclusion contradicts what the user just said, the
user wins and the contradiction becomes tomorrow's training signal — the
Stop hook will capture it. Overlay skills surface a confidence score
(`runs`-earned, never granted by one green test); verify before trusting
anything marked low-confidence.

Every observation carries a **trust tier** — `explicit` (you said "remember"),
`stated` (your own words about behavior), `inferred` (derived from activity).
Weight recall by it: an `inferred` item is a hint to verify, not a fact to
cite. Anti-poisoning guardrails sit between the journal and what you see
here — a bulk batch (pasted document, contaminated environment) is quarantined
out of recall, and `status` flags a leaked eval/sandbox state dir. If recall
looks empty when you expected content, check `/evolve-status` for a
`quarantined` line before assuming nothing was learned. Full model:
`docs/evolve-guardrails.md`.
