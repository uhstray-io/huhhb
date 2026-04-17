# huhhb

**huhhb** is Uhstray.io's Claude Code skills marketplace — a curated library of skills (slash commands, workflows, AI automation) for teams building with Claude Code.

> Name is a play on "hub" (a place for skills) + "uhh" (Uhstray). Say it fast.

## Prerequisites

`uhh:memory` uses [`uv`](https://docs.astral.sh/uv/) to manage Python dependencies automatically — no `pip install` needed after first run.

**Install uv once:**

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip (any platform)
pip install uv
```

## Quick Install

```bash
# Add the marketplace
claude plugin marketplace add uhstray-io/huhhb

# Install all skills (user scope)
claude plugin install --scope user huhhb

# Or install project-scoped
claude plugin install --scope project huhhb
```

## What's Inside

Skills are reusable Claude Code workflows invoked via `/skill-name` or automatically triggered by Claude when context matches. Browse the full list in [`marketplace.json`](./marketplace.json) or run:

```bash
claude plugin list huhhb
```

## Using a Skill

After install, skills appear as slash commands in Claude Code:

```
/skill-name
```

Claude also auto-invokes skills when the situation matches — no manual trigger needed for most workflow skills.

## Contributing

1. Fork this repo
2. Add your skill to `skills/<category>/<skill-name>/skill.md`
3. Register it in `marketplace.json`
4. Open a PR

See [CONTEXT.md](./CONTEXT.md) for architecture details and skill quality requirements.

## About

Built by [Uhstray.io](https://uhstray.io) — an AI-native team building tools for teams building with AI.
