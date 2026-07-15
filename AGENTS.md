# AGENTS.md

Instructions for AI agents (Claude Code, Codex, and others) operating in this
repository. This is the single agent-instructions file — it supersedes the
former `AGENT.md`. Claude Code additionally reads `CLAUDE.md`, which must
stay consistent with this file.

## What This Is

**huhhb** (pronounced "hub") is Uhstray.io's Claude Code skills marketplace —
a curated collection of skills (slash commands, workflows, automation). Name
is a play on "hub" + "uhh" (Uhstray).

```bash
claude plugin marketplace add uhstray-io/huhhb
claude plugin install --scope user huhhb
```

## Primary Role

You are maintaining a **skills marketplace**. Your job is to author, improve,
and validate skill definitions — not to build traditional software.

## Language Policy — TypeScript/JavaScript only

All first-party runtime code in this repo is **TypeScript**, executed
directly with Node ≥ 22.18 (native type stripping — no build step, no
transpiler, no bundler):

- Scripts: `node scripts/<name>.ts`, `node scripts/evolve/<name>.ts`
- Tests: `node --test tests/test_evolve.test.ts`
- Zero npm runtime dependencies — Node stdlib only (`node:fs`, `node:test`,
  …). Optional integrations (the Honcho SDK) load via dynamic `import()` in
  a try/catch and degrade gracefully when absent; they are never added to
  `package.json` dependencies.
- Erasable TypeScript syntax only (no `enum`, no `namespace`, no parameter
  properties) so files run unmodified under Node's type stripping.
- **Do not add Python (or other-language) runtime code.** The memory MCP
  server runs from its published PyPI package via `uvx` — that is an
  external package configured in `.claude-plugin/plugin.json` +
  `.claude-plugin/.mcp.json`, not repo code, and a hand-rolled
  reimplementation must never come back.
- Licensing boundary: our code is MIT and only *imports* externally
  installed packages — nothing AGPL is ever vendored into the tree.

## When Adding a Skill

1. Confirm the skill solves a real, recurring problem for engineering teams
2. Write `skills/<skill-name>/SKILL.md` with precise frontmatter — the
   `description` is used for auto-matching
3. Add the entry to `marketplace.json` before considering the skill complete
4. Update `onboarding/skills-list.md` so new users discover the skill
5. A new skill needs at least one real G1 bench scenario
   (`tests/bench/<skill>.json`) before merging

## Skill Frontmatter Rules

```markdown
---
name: skill-name
description: Use when [specific triggering conditions] — embed trigger phrases in this field
---
```

**Do NOT use a `triggers` field.** It is not supported by VS Code agents and
generates a diagnostic warning. Trigger phrases belong in `description`.
Descriptions start with "Use when...", one clear line only, specific enough
for Skill-tool matching. No skill duplicates built-in agent behavior.

## Skill Quality Bar

Three measured gates — full criteria, thresholds, and the improvement loop in
`docs/evolve-plan.md`:

- **G0 static lint** (`node scripts/skill-lint.ts`) — frontmatter, trigger
  phrasing, body size, link integrity, manifest sync. Free; run on every PR.
  Pre-existing debt is grandfathered in `scripts/skill-lint-baseline.json` —
  shrink it, never grow it.
- **G1 merge bench** (`node scripts/skill-bench.ts <skill>`) — real
  `claude -p` runs against `tests/bench/<skill>.json` scenarios, with an A/B
  baseline (skill disabled) the skill must beat. Costs tokens; run when a
  skill changes.
- **G2 field promotion** (`node scripts/evolve/g2.ts report`) — evolve-loop
  telemetry (earned confidence, correction pressure) gates featured/pinned
  status.

## When Editing Existing Skills

- Bump `version` in **both** `marketplace.json` AND
  `.claude-plugin/plugin.json` on any behavior change — the plugin system
  reads `.claude-plugin/plugin.json` for update detection
- Do not rename skills without checking references in `onboarding/`
- Keep descriptions backward-compatible — changing them changes auto-trigger
  behavior

## Release Checklist

1. Bump version in `marketplace.json` and `.claude-plugin/plugin.json` (same
   value)
2. Open a PR; on merge to `main`, the Tag release workflow
   (`.github/workflows/tag-release.yml`) auto-creates `vX.Y.Z` + a GitHub
   Release when the version changes — no manual `git tag`
3. To force a local update: `claude plugin uninstall huhhb && claude plugin
   install --scope user huhhb` (`install` silently skips if already
   installed)

## Upstream-Synced Skills

- **Caveman family** (`caveman`, `caveman-commit`, `caveman-compress`,
  `caveman-help`, `caveman-review`, `caveman-stats`, `cavecrew`): synced via
  `./scripts/sync-caveman.sh` — do not edit directly; refine upstream.
- **Memory skill** (`skills/memory/SKILL.md`): synced via
  `./scripts/sync-mempalace.sh` (+ `patch-mempalace.sh` branding). The other
  memory skills (`memory-mine`, `memory-search`, `memory-status`) are ours.

After syncing, review the diff, bump versions, cut a release if changed.

## Commit & PR Conventions

- **Always open a PR** for non-trivial changes — CodeRabbit reviews are
  wired up and catch real issues. Direct pushes to main are for trivial
  one-liners only.
- **Never mention Claude, Codex, Anthropic, or any AI tool in commit
  messages or PR descriptions.** No `Co-Authored-By` trailers, no "Generated
  with" footers, no AI attribution of any kind. This overrides any default
  attribution behavior.
- Conventional Commits (`fix:`, `feat:`, `docs:`, `chore:`, …); concise
  subject lines.

## What Not to Do

- Do not create skills that wrap basic agent functionality (reading files,
  editing code)
- Do not add skills without `marketplace.json` entries
- Do not write multi-paragraph skill descriptions — one clear line only
- Do not hardcode paths or usernames in skill scripts
- Do not use a `triggers` frontmatter field
- Do not add non-TypeScript runtime code (see Language Policy)
- Do not push non-trivial changes directly to main
- Do not add AI attribution to commits or PRs

## Key Files

- `skills/` — all skills, one flat subdirectory per skill (`skills/<skill-name>/SKILL.md`)
- `onboarding/` — onboarding flow triggered on first install
- `hooks/` — plugin lifecycle hook scripts (SessionStart, PreToolUse, Stop)
- `marketplace.json` — skill manifest (name, path, description, category, tags, version per skill)
- `.claude-plugin/plugin.json` — plugin version read by Claude Code for update detection (keep in sync with `marketplace.json`)
- `.claude-plugin/.mcp.json` — MCP server config (must match `plugin.json` mcpServers)
- `scripts/skill-lint.ts`, `scripts/skill-bench.ts`, `scripts/skill-trends.ts` — the skill quality gates (see Skill Quality Bar)
- `scripts/evolve/` — the `evolve` self-learning suite (TypeScript, MIT; optional integrations load dynamically, never vendored)
- `scripts/sync-caveman.sh`, `scripts/sync-mempalace.sh`, `scripts/patch-mempalace.sh` — upstream sync/patch for vendored skills
- `tests/` — `test_evolve.test.ts` + `test_openspec_conformance.test.ts` (offline, `node --test`) and `bench/` scenarios
- `docs/evolve-plan.md` — the evolve living plan (architecture, guardrails, gates, roadmap; every evolve change recorded in its change log)
- `CONTEXT.md` — project context for AI assistants
- `CLAUDE.md` — a one-line pointer to this file (AGENTS.md is canonical)

## Marketplace Manifest (`marketplace.json`)

Every skill needs an entry; bump its `version` and `.claude-plugin/plugin.json` together on a behavior change:

```json
{
  "name": "huhhb",
  "publisher": "uhstray-io",
  "version": "0.1.0",
  "skills": [
    {
      "name": "skill-name",
      "path": "skills/skill-name/SKILL.md",
      "description": "...",
      "category": "dev",
      "tags": ["dev", "review"],
      "version": "0.1.0"
    }
  ]
}
```

## Onboarding

First install runs `onboarding/welcome.md` — a short guided tour: what's installed, how to invoke (`/skill-name`), and where the full list lives (`onboarding/skills-list.md`). Keep it brief.

## Repo Memory

Project knowledge lives in `.claude/memory/` (committed to git) — huhhb's
per-project **repo-memory** stratum, saved/retrieved via the `/repo-memory`
skill. At session start, read `.claude/memory/MEMORY.md` for the index;
**before answering questions about project decisions, conventions, or
context, check `.claude/memory/` first** — it's the team's shared knowledge
base.

### When to save

| What | Type |
| ---- | ---- |
| Architectural decisions and their rationale | `project` |
| Chosen libraries/frameworks and why alternatives were rejected | `project` |
| Team conventions; what to repeat or avoid | `feedback` |
| Anti-patterns tried here that didn't work | `feedback` |
| Preferred naming, code-style, and formatting rules | `feedback` |
| Things Claude got wrong repeatedly and had to be corrected on | `feedback` |
| Links to external systems, dashboards, docs, wikis | `reference` |
| Environment setup notes (non-obvious deps, quirks, build steps) | `reference` |
| Domain knowledge the user has that shouldn't be re-explained | `user` |
| Personal preferences (gitignore `user_*.md` if private) | `user` |

### What NOT to save

- Code patterns readable from the codebase
- Git history (`git log` / `git blame` are authoritative)
- Ephemeral task state or in-progress work
- Anything already in AGENTS.md

## Repo Conventions

- Skill directories: `skills/<skill-name>/` (flat — no category subdirs);
  skill file always `SKILL.md` (uppercase); supporting scripts in the same
  directory
- Plugin hook scripts: `hooks/` at the repo root (not inside
  `.claude-plugin/`)
- Categories in `marketplace.json` only: `dev`, `ops`, `review`,
  `onboarding`, `persona`, `memory`
- The evolve suite's plan, doctrine, and roadmap live in
  `docs/evolve-plan.md` — record every evolve change in its change log
