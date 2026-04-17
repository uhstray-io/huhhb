---
name: huhhb-welcome
description: First-run onboarding for huhhb — Uhstray.io's Claude Code skills marketplace
triggers:
  - huhhb installed
  - plugin install huhhb
---

# Welcome to huhhb

You've installed **huhhb** — Uhstray.io's skills marketplace for Claude Code.

## Prerequisite: uv

`uhh:memory` requires [`uv`](https://docs.astral.sh/uv/) to auto-manage Python dependencies. If you don't have it:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Any platform via pip
pip install uv
```

## What Are Skills?

Skills extend Claude Code with reusable workflows. Invoke them with a slash command:

```
/skill-name
```

Claude also auto-invokes skills when your request matches a skill's trigger — no slash command needed.

## Available Skills

Run this to see what's installed:

```
claude plugin list huhhb
```

Or browse the full catalog: https://github.com/uhstray-io/huhhb/blob/main/marketplace.json

## Getting Help

- Full skill docs: https://github.com/uhstray-io/huhhb
- Report issues: https://github.com/uhstray-io/huhhb/issues
- Built by Uhstray.io: https://uhstray.io

---

*You only see this once. Run `/huhhb-welcome` anytime to see it again.*
