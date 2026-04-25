---
name: huhhb-skills
description: List all available huhhb skills with descriptions and usage
triggers:
  - list huhhb skills
  - what skills are available
  - show me huhhb skills
---

# huhhb Skills

All available skills in the Uhstray.io marketplace.

## Onboarding

| Skill | Command | Description |
|-------|---------|-------------|
| huhhb-welcome | `/huhhb-welcome` | First-run tour of huhhb |
| huhhb-skills | `/huhhb-skills` | This list |
| onboarding | `/onboarding` | Interactive wizard to configure Auto Mode and Agent Teams |

## Dev Skills

| Skill | Command | Description |
|-------|---------|-------------|
| brainstorming | `/brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. |
| dispatching-parallel-agents | `/dispatching-parallel-agents` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| executing-plans | `/executing-plans` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| finishing-a-development-branch | `/finishing-a-development-branch` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work |
| subagent-driven-development | `/subagent-driven-development` | Use when executing implementation plans with independent tasks in the current session |
| systematic-debugging | `/systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| test-driven-development | `/test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code |
| using-git-worktrees | `/using-git-worktrees` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans |
| verification-before-completion | `/verification-before-completion` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs |
| writing-plans | `/writing-plans` | Use when you have a spec or requirements for a multi-step task, before touching code |
| writing-skills | `/writing-skills` | Use when creating new skills, editing existing skills, or verifying skills work before deployment |

## Persona Skills

| Skill | Command | Description |
|-------|---------|-------------|
| training | `/training` | Socratic teaching mode — guides you through problems without writing code. Describes approaches, names APIs, links docs, asks questions. Off with "stop training". |
| unga-bunga | `/unga-bunga` | Ultra-compressed communication. Cuts token usage ~75%. Modes: lite, full, ultra, wenyan. Off with "stop unga-bunga". |

## Review Skills

| Skill | Command | Description |
|-------|---------|-------------|
| receiving-code-review | `/receiving-code-review` | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable |
| requesting-code-review | `/requesting-code-review` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |

---

*To add a skill: see [AGENT.md](../AGENT.md) and open a PR.*
