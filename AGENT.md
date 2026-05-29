# AGENT.md

Instructions for AI agents (Claude Code and others) operating in this repository.

## Primary Role

You are maintaining a **Claude Code skills marketplace**. Your job is to author, improve, and validate skill definitions — not to build traditional software.

## When Adding a Skill

1. Confirm the skill solves a real, recurring problem for engineering teams
2. Write `skills/<skill-name>/SKILL.md` with precise frontmatter — the `description` is used for auto-matching
3. Add the entry to `marketplace.json` before considering the skill complete
4. Add or update `onboarding/skills-list.md` so new users discover the skill

## Skill Frontmatter Rules

```markdown
---
name: skill-name
description: Use when [specific triggering conditions] — embed trigger phrases in this field
---
```

**Do NOT use a `triggers` field.** It is not supported by VS Code agents and generates a diagnostic warning. Trigger phrases belong in `description`.

## Skill Quality Checklist

Before marking a skill PR ready:

- [ ] `description` starts with "Use when..." and includes specific trigger phrases
- [ ] No `triggers` field in frontmatter
- [ ] Skill body has a clear action sequence (not vague instructions)
- [ ] `marketplace.json` entry added with correct `path` and `version`
- [ ] Tested manually by invoking the skill in a real Claude Code session

## When Editing Existing Skills

- Bump `version` in **both** `marketplace.json` AND `.claude-plugin/plugin.json` on any behavior change — the plugin system reads `.claude-plugin/plugin.json` for update detection; `marketplace.json` alone is not enough
- Do not rename skills without checking if they're referenced in `onboarding/`
- Keep descriptions backward-compatible — changing them changes auto-trigger behavior

## Release Checklist

1. Bump version in `marketplace.json`
2. Bump version in `.claude-plugin/plugin.json` (same value)
3. Commit, tag (`git tag vX.Y.Z`), and push with `--tags`
4. To force a local update: `claude plugin uninstall huhhb && claude plugin install --scope user huhhb`
   (`install` silently skips if already installed — uninstall first)

## Caveman Skills (Upstream Sync)

The caveman skills (`caveman`, `caveman-commit`, `caveman-compress`, `caveman-help`, `caveman-review`, `caveman-stats`, `cavecrew`) are sourced from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) — do not edit them directly.

To pull the latest versions:

```bash
./scripts/sync-caveman.sh
```

After syncing, bump versions and cut a release if anything changed.

## What Not to Do

- Do not create skills that wrap basic Claude functionality (reading files, editing code)
- Do not add skills without `marketplace.json` entries
- Do not write multi-paragraph skill descriptions — one clear line only
- Do not hardcode paths or usernames in skill scripts
- Do not use a `triggers` frontmatter field

## Repo Conventions

- Skill directories: `skills/<skill-name>/` (flat — no category subdirectories)
- Skill file: always named `SKILL.md` (uppercase)
- Supporting scripts: same directory as `SKILL.md`
- Categories exist in `marketplace.json` only (`dev`, `ops`, `review`, `onboarding`, `persona`, `memory`)
