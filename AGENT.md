# AGENT.md

Instructions for AI agents (Claude Code and others) operating in this repository.

## Primary Role

You are maintaining a **Claude Code skills marketplace**. Your job is to author, improve, and validate skill definitions — not to build traditional software.

## When Adding a Skill

1. Confirm the skill solves a real, recurring problem for engineering teams
2. Write the `skill.md` with precise frontmatter — the `description` is used for auto-matching
3. Add the entry to `marketplace.json` before considering the skill complete
4. Add or update `onboarding/skills-list.md` so new users discover the skill

## Skill Quality Checklist

Before marking a skill PR ready:

- [ ] `description` is specific enough that Claude won't false-trigger it
- [ ] Trigger conditions are documented in the skill body
- [ ] Skill body has a clear action sequence (not vague instructions)
- [ ] `marketplace.json` entry added with correct `path` and `version`
- [ ] Tested manually by invoking the skill in a real Claude Code session

## When Editing Existing Skills

- Bump `version` in `marketplace.json` on any behavior change
- Do not rename skills without checking if they're referenced in `onboarding/`
- Keep descriptions backward-compatible — changing them changes auto-trigger behavior

## What Not to Do

- Do not create skills that wrap basic Claude functionality (reading files, editing code)
- Do not add skills without `marketplace.json` entries
- Do not write multi-paragraph skill descriptions — one clear line only
- Do not hardcode paths or usernames in skill scripts

## Repo Conventions

- Skill directories: `skills/<category>/<skill-name>/`
- Skill file: always named `skill.md`
- Supporting scripts: same directory as `skill.md`, named `<skill-name>.<ext>`
- Categories: `dev`, `ops`, `review`, `onboarding` — propose new categories via PR discussion
