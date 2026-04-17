# huhhb

**huhhb** is Uhstray.io's Claude Code skills marketplace — a curated library of skills (slash commands, workflows, AI automation) for teams building with Claude Code.

> Name is a play on "hub" (a place for skills) + "uhh" (Uhstray). Say it fast.

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
