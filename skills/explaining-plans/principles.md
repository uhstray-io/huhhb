# Explaining-Plans Principles

The ruleset for the `explaining-plans` skill. This skill augments a **document** (plan,
spec, RFC) in place, so its principles are tuned for durable, cited, diagram-rich prose.

> Core idea: **educate, don't report.** Frame the *new outcome and the reasoning behind it*,
> never a changelog of edits.

---

## 1. Diagram rule (hard)

Every diagram is preceded by **at least one sentence** describing what it shows. Never a
bare diagram — the prose says what to look for, the diagram shows it. A diagram is optional;
the lead-in sentence is not.

## 2. Medium: mermaid

This skill writes into a document, so all diagrams are **mermaid**. Match the type to what
you're explaining:

| What you're explaining | Mermaid type |
|------------------------|--------------|
| Logic / control flow / decisions | `flowchart` |
| Interactions / runtime / call order | `sequenceDiagram` |
| Data models / relationships | `erDiagram` or `classDiagram` |
| Lifecycles / status transitions | `stateDiagram-v2` |
| System architecture (components + boundaries) | C4-style `flowchart` |

Pick the type that makes the *reader's* question easiest to answer.

## 3. Depth: deep by default

A plan is read later by people with no context, so rationale earns its space. Default to
**deep** — alternatives considered, decision rationale, cited sources, richer diagrams. Drop
to `standard`/`brief` only if the user asks or the document is explicitly a throwaway.

## 4. The three embedded sections

Augment the document in place with:

1. **Decision Criteria** — options considered, the criteria they were judged against, the
   chosen path, and *why*. Make rejected options visible; a decision with no alternatives
   reads as an assumption.
2. **Source Context** — a synthesis of the material the plan rests on, every claim cited.
3. **Target Outcome** — what the system/world looks like *after* the plan lands.

## 5. Citation format

Inline `[n]` markers in the prose, with a `References` list at the end. Tag each source by
origin:

| Origin | Reference format |
|--------|------------------|
| Repo file | `path/to/file.ext:line-range` |
| User-supplied | Short title the user used |
| Web | URL + accessed date (`YYYY-MM-DD`) |

Verify every claim against the repo or source before citing it. Cite only what you actually
used; mark anything unverified as an explicit assumption.

## 6. Augment, don't rewrite

Leave the existing document intact — add the sections and diagrams, preserve everything
else. The skill enriches whatever `writing-plans` (or the user) produced; it does not
replace it.
