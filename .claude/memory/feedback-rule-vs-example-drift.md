---
name: feedback-rule-vs-example-drift
description: Recurring skill/template defect — a rule stated in prose gets violated in the adjacent code example; verify every code block actually obeys the rule stated just above it
metadata:
  node_type: memory
  type: feedback
---

When a skill or template asserts a rule (e.g. "keep `BANK_ID` raw in config
and prose, percent-encode it only when interpolating into a request URL"),
check that the adjacent example actually follows it. On
`skills/two-store-memory-setup/memory-init-template.md`, review rounds
repeatedly found the rule stated correctly and then violated in the very
snippet below it — the raw `BANK_ID` was interpolated straight into all four
`curl` request paths. Fixed in 039e1c9 by deriving the encoded form once
(`BANK_SEG=$(printf '%s' "$BANK_ID" | jq -sRr @uri)`) and reusing that
variable at every call site instead of re-encoding inline.

**Why:** this recurred across multiple CodeRabbit review rounds on the same
file, so it's a class of defect (rule-assertion drifts from its own example),
not a one-off typo.

**How to apply:** when authoring or reviewing skill/template docs in this
repo, explicitly check "does this code block obey the rule stated just above
it" as a required review step. When a value needs a transformed form for one
context (URL-encoded, escaped, quoted), derive it once into a named variable
and reuse that variable everywhere, rather than repeating the transformation
inline at each call site — inline repetition is where the drift creeps in.
