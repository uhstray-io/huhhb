# MemPalace is opt-in — how to enable it

The `memory`, `memory-search`, `memory-mine` and `memory-status` skills all call
`mempalace_*` MCP tools. **This plugin no longer registers that server.** It was
retired from routing on 2026-08-01, and shipping a registration to every
installer imposed a store on people who hold no data in it and never asked for
its tools.

Nothing was deleted. The skills still work, your data is untouched, and the
server is one config block away.

## Enable it

The plugin used to register this for you. Add it to your own MCP configuration —
a project `.mcp.json`, or your user-level Claude Code config:

```json
{
  "mcpServers": {
    "memory": {
      "command": "uvx",
      "args": ["mempalace-mcp"]
    }
  }
}
```

Restart the session afterwards; MCP servers are registered at start-up.

`uvx` fetches `mempalace-mcp` from PyPI on demand, so nothing needs installing
first beyond `uv` itself. If you prefer the standalone CLI — which these skills
do **not** use — `uv tool install mempalace` provides the `mempalace` command.

## Check whether it is on

If a skill in this family reports that a `mempalace_*` tool is unavailable, the
server is not registered in the session you are in. That is the expected state
after this change, not a fault: add the block above and restart.

## What to use instead

These four skills read an existing MemPalace nexus. They are not the current
memory system, and nothing new should be written through them:

| Concern | Current owner |
|---|---|
| What the code *is* — structure, call graphs, blast radius | the code graph store |
| Why something was done — decisions, outcomes, preferences | the experience store |
| Ratified architecture decisions for this repo | `repo-memory` → `plans/architecture/` |
| Installing, repairing or verifying any of the above | `memory-setup` |

Reach for this family when you need something already stored in a MemPalace
nexus. For anything else, the table above is the answer.
