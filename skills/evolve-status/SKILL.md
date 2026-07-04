---
name: evolve-status
description: Use to inspect the health of evolve's learning loop — spool depth, deriver queue, injection-cache age, overlay confidence table, and pending proposals ("evolve status", "is evolve working", "memory loop health", "show overlay confidence", "why is my evolve context stale").
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
  `docs/evolve.md` for setup if they expected it on.
- **spool depth > 0 across multiple sessions** — the flusher can't reach
  Honcho. Check `~/.local/share/huhhb/evolve/flush.log` for the error;
  observations are safe (at-least-once delivery), just undelivered.
- **cache age** — injection context is cache-first by doctrine; staleness is
  the accepted trade for zero-latency hooks. Old cache + empty spool means no
  new learnings, which is normal. Old cache + deep spool means see above.
- **deriver queue pending stuck > 0** — the Honcho API is up but the deriver
  worker isn't running (self-host: `python -m src.deriver` with LLM keys).
  Writes land; conclusions never form.
- **overlay table** — confidence is earned (`min(runs/10,1) × success_rate`):
  an overlay at 0.1 worked once, not "works". Flag anything `deprecated`, any
  `last_error`, and anything unused ~60 days as candidates for the next
  `/evolve-review` to propose archiving (pinned overlays exempt).
- **pending proposals > 0** — a headless review staged work; offer to run
  `/evolve-review` now to approve or reject each.

If the user asks *what* has been learned (not whether the loop is healthy),
that's the `evolve` skill's cost ladder, not this one.
