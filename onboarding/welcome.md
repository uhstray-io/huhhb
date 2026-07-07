---
name: huhhb-welcome
description: First-run onboarding for huhhb — run when huhhb is installed or the user asks to be welcomed/onboarded to the Uhstray.io skills marketplace.
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

## Optional: Self-Learning Memory (evolve)

huhhb can learn across sessions — preferences you state, corrections you
make, skills that work for you — via [Honcho](https://honcho.dev). It is
**entirely off until configured** and everything it learns stays in the
Honcho workspace *you* control.

Four choices (details in [docs/evolve-plan.md](../docs/evolve-plan.md)):

1. **Local, no server** — everything stays in files on this machine:
   `honcho_client.py init --local`
2. **Self-hosted** — point it at your own Honcho server:
   `honcho_client.py init --url http://your-host:8000`
3. **Managed** — use api.honcho.dev with your API key:
   `honcho_client.py init --api-key <key>`
4. **Skip** — do nothing; huhhb behaves exactly as without evolve.

For 2 or 3, verify afterwards with `honcho_client.py smoke` (local mode
needs no smoke test — there is no server to reach).

**Claude: ask the user which option they want. For 1–3, run the `init`
command from `${CLAUDE_PLUGIN_ROOT}/scripts/evolve/` (plus the smoke test
for 2–3) and show the result. Consent matters — never configure evolve
without an explicit yes.**

## Personalize Your Setup

Claude Code reads `CLAUDE.md` files at three scope levels — broader scopes apply everywhere, narrower ones override them:

| Scope | File | Applies to |
|-------|------|-----------|
| **User** | `~/.claude/CLAUDE.md` | Every project on this machine |
| **Project** | `.claude/CLAUDE.md` | This repo (committed, team-shared) |
| **Local** | `CLAUDE.local.md` | This repo only, not committed |

The **user-level** file is the right place for personal preferences that should follow you across all projects — things like your preferred communication style, tools you always want allowed, or standing instructions.

---

**Claude: ask the user the following question, then act on their answer.**

> "Would you like to add anything to your personal Claude instructions (`~/.claude/CLAUDE.md`)? This is a good place for preferences that should apply across all your projects — for example, preferred coding style, default language, tools to always allow, or how you like responses formatted. What would you like Claude to always know about you?"

If the user provides preferences:
1. Read `~/.claude/CLAUDE.md` (create it if it doesn't exist).
2. Append their preferences under a clearly labeled section.
3. Confirm what was saved and where.

If the user declines or says nothing, move on.

Once the user has confirmed their changes (or declined), remind them of the file path one final time:

> "Your personal Claude instructions live at `~/.claude/CLAUDE.md` — you can edit that file directly anytime to update your preferences."

---

## Getting Help

- Full skill docs: https://github.com/uhstray-io/huhhb
- Report issues: https://github.com/uhstray-io/huhhb/issues
- Built by Uhstray.io: https://uhstray.io

---

*You only see this once. Run `/huhhb-welcome` anytime to see it again.*
