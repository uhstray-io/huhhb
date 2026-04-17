# huhhb

**huhhb** is Uhstray.io's Claude Code skills marketplace — a curated library of skills (slash commands, workflows, AI automation) for teams building with Claude Code.

> Name is a play on "hub" (a place for skills) + "uhh" (Uhstray). Say it fast.

---

## Install

### 1. Add the marketplace and install skills

```bash
# Add the marketplace
claude plugin marketplace add uhstray-io/huhhb

# Install skills (user scope — available in all your projects)
claude plugin install --scope user huhhb

# Or project-scoped — only in this repo
claude plugin install --scope project huhhb
```

### 2. Install the `uhh:memory` Python package

`uhh:memory` requires the Python package for its MCP server:

```bash
# From the repo root
pip install -e .

# Or with dev tools
pip install -e ".[dev]"
```

> **Using `uv`?** (Recommended — no manual pip needed after first run)
>
> ```bash
> # macOS / Linux
> curl -LsSf https://astral.sh/uv/install.sh | sh
>
> # Windows (PowerShell)
> powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
> ```
>
> Once installed, the plugin auto-resolves deps via `uv run`.

### 3. Wire the MCP server into Claude Code

Add this to your project's `.mcp.json` (or `~/.claude/mcp.json` for user-wide):

```json
{
  "mcpServers": {
    "uhh-memory": {
      "command": "python",
      "args": ["-m", "uhh_memory.mcp_server"]
    }
  }
}
```

With `uv` (no prior install needed):

```json
{
  "mcpServers": {
    "uhh-memory": {
      "command": "uv",
      "args": [
        "run",
        "--with", "chromadb>=0.5.0",
        "--with", "sentence-transformers>=3.0.0",
        "--with", "click>=8.1.0",
        "--with", "rich>=13.0.0",
        "-m", "uhh_memory.mcp_server"
      ]
    }
  }
}
```

Restart Claude Code after editing `.mcp.json`.

---

## Update

```bash
# Pull latest skills and package changes
git pull

# Re-install package if dependencies changed
pip install -e .

# Update the Claude Code plugin
claude plugin update huhhb
```

---

## Add a New Skill

1. Create `skills/<category>/<skill-name>/skill.md` with YAML frontmatter:

```markdown
---
name: skill-name
description: One-line description (shown in skill discovery)
triggers:
  - phrase that triggers this skill
---

# Skill content here
```

2. Register it in `marketplace.json`:

```json
{
  "name": "skill-name",
  "path": "skills/category/skill-name/skill.md",
  "description": "...",
  "category": "category",
  "tags": ["tag1", "tag2"],
  "version": "0.1.0"
}
```

3. Open a PR — see [CONTEXT.md](./CONTEXT.md) for quality requirements.

---

## What's Inside

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `uhh:memory` | `/uhh-memory` | Team memory nexus — store and recall project context |
| `uhh:memory-search` | `/uhh-memory-search` | Semantic search across the nexus |
| `uhh:memory-mine` | `/uhh-memory-mine` | Ingest a project directory into the nexus |
| `uhh:memory-status` | `/uhh-memory-status` | Nexus stats — drawer count, wings, rooms |

Browse the full manifest: [`marketplace.json`](./marketplace.json)

---

## CLI Reference (`uhh-mem`)

After `pip install -e .`:

```bash
uhh-mem init              # Initialize the nexus
uhh-mem status            # Show drawer count and wings
uhh-mem mine <path> --wing work   # Ingest a directory
uhh-mem search "query"    # Semantic search
uhh-mem wake-up           # Print L0+L1 session context
```

---

## About

Built by [Uhstray.io](https://uhstray.io) — an AI-native team building tools for teams building with AI.
