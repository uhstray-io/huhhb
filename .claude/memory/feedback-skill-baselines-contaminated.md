---
name: feedback-skill-baselines-contaminated
description: Skill RED-phase and skill-bench baselines inherit the user's global CLAUDE.md, so scenarios probing content it already covers produce false GREENs; clean-room isolation is impossible because HOME and CLAUDE_CONFIG_DIR overrides break auth
metadata:
  node_type: memory
  type: feedback
---

Baselines in this repo are contaminated by the operator's global
`~/.claude/CLAUDE.md`: subagents inherit it, so any scenario probing content
that already lives there passes without the skill and reports a false GREEN.
`scripts/skill-bench.ts` does not avoid this — its baseline is the same prompt
with `--disallowedTools Skill` (skill-bench.ts:141), which removes the Skill
tool but still loads global memory. Two isolation attempts both failed: a
sandbox `HOME` and a sandbox `CLAUDE_CONFIG_DIR` each yield `Not logged in`,
because credentials are bound to the real config dir.

**Why:** a baseline measuring knowledge the agent already had measures nothing —
it is a confounded control. Observed concretely while benching the two-store
memory skill: three of four baseline agents reproduced `sync_retain`, verbatim
extraction mode, the `manage_adr` hard-delete defect and the translate-join,
all verbatim from the global policy.

**How to apply:** before running baselines, read the global `CLAUDE.md` and list
what it already covers. Design scenarios that probe only surfaces it does *not*
cover, and mark any overlapping scenario VOID rather than reporting it as a
pass. State the contamination in the skill's test summary instead of claiming a
clean RED. Related: [[feedback-rule-vs-example-drift]].
