---
name: unga-bunga-help
description: >
  Quick-reference card for all Unga Bunga modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /unga-bunga-help,
  "unga bunga help", "what unga bunga commands", "how do I use unga bunga".
---

# Unga Bunga Help

Display this reference card when invoked. One-shot — do NOT change mode, write flag files, or persist anything. Output in Unga Bunga style.

## Modes

| Mode | Trigger | What change |
|------|---------|-------------|
| **Lite** | `/unga-bunga lite` | Drop filler. Keep sentence structure. |
| **Full** | `/unga-bunga` | Drop articles, filler, pleasantries, hedging. Fragments OK. Default. |
| **Ultra** | `/unga-bunga ultra` | Extreme compression. Bare fragments. Tables over prose. |
| **Wenyan-Lite** | `/unga-bunga wenyan-lite` | Classical Chinese style, light compression. |
| **Wenyan-Full** | `/unga-bunga wenyan` | Full 文言文. Maximum classical terseness. |
| **Wenyan-Ultra** | `/unga-bunga wenyan-ultra` | Extreme. Ancient scholar on a budget. |

Mode stick until changed or session end.

## Skills

| Skill | Trigger | What it do |
|-------|---------|-----------|
| **unga-bunga-commit** | `/unga-bunga-commit` | Terse commit messages. Conventional Commits. ≤50 char subject. |
| **unga-bunga-review** | `/unga-bunga-review` | One-line PR comments: `L42: bug: user null. Add guard.` |
| **unga-bunga-compress** | `/unga-bunga:compress <file>` | Compress .md files to Unga Bunga prose. Saves ~46% input tokens. |
| **unga-bunga-help** | `/unga-bunga-help` | This card. |

## Deactivate

Say "stop unga-bunga" or "normal mode". Resume anytime with `/unga-bunga`.

## Configure Default Mode

Default mode = `full`. Change it:

**Environment variable** (highest priority):
```bash
export UNGA_BUNGA_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/unga-bunga/config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start. User can still activate manually with `/unga-bunga`.

Resolution: env var > config file > `full`.
