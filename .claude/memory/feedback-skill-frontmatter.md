---
name: feedback-skill-frontmatter
description: The triggers field in SKILL.md frontmatter is not supported by VS Code agents — use description for trigger phrases instead
metadata:
  node_type: memory
  type: feedback
---

Do not use the `triggers:` field in SKILL.md frontmatter. It is not a supported attribute in VS Code agents and generates a diagnostic warning.

**Why:** VS Code agents only support: `argument-hint`, `compatibility`, `context`, `description`, `disable-model-invocation`, `license`, `metadata`, `name`, `user-invocable`. We discovered this when building the repo-memory skill.

**How to apply:** Embed trigger phrases directly in the `description` field instead. Example: `description: Use when the user says "remember", "don't forget", "recall"...`
