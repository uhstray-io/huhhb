---
name: evolve-status
description: Use when inspecting the health of evolve's learning loop — spool depth, deriver queue, injection-cache age, overlay confidence table, and pending proposals ("evolve status", "is evolve working", "memory loop health", "show overlay confidence", "why is my evolve context stale").
---

# evolve-status — loop observability

The learning loop is mostly invisible by design (hooks + a detached flusher),
so this skill is how a user sees it working — or sees why it isn't. Run both
commands and present the combined picture:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/evolve/honcho_client.py" status
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/evolve/overlay.py" report
```

## How to read it

- **config source: none** — the suite is inert. Nothing is captured, nothing
  injected; huhhb behaves as if evolve were not installed. Point the user at
  `docs/evolve-plan.md` for setup if they expected it on.
- **mode: local** — no server: there is no deriver queue; health is the
  journal count growing and conclusions being distilled from it. A large
  journal with few conclusions means `/evolve-review` hasn't run in a while —
  suggest it (in local mode it is the only thing that forms conclusions).
- **spool depth > 0 across multiple sessions** — the flusher can't reach
  Honcho. Check `flush.log` in the state dir that `status` prints;
  observations are safe (at-least-once delivery), just undelivered.
- **cache age** — injection context is cache-first by doctrine; staleness is
  the accepted trade for zero-latency hooks. Old cache + empty spool means no
  new learnings, which is normal. Old cache + deep spool means see above.
- **deriver queue pending stuck > 0** — the Honcho API is up but the deriver
  worker isn't running (self-host: `python -m src.deriver` with LLM keys).
  Writes land; conclusions never form.
- **overlay table** — confidence is earned (`min(runs/10,1) × success_rate`):
  an overlay at 0.1 worked once, not "works". Flag anything `deprecated`, any
  `last_error`, and anything unused ~60 days (`report --json` shows
  `last_used`) as candidates for the next `/evolve-review` to propose
  archiving (pinned overlays exempt).
- **pending proposals > 0** — a headless review staged work; offer to run
  `/evolve-review` now to approve or reject each.

If the user asks *what* has been learned (not whether the loop is healthy),
that's the `evolve` skill's cost ladder, not this one.
