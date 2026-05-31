---
name: explaining-plans
description: >
  Use when augmenting or explaining a plan, spec, design, or RFC document — enriches the
  document in place with decision criteria, cited source context, target-outcome framing,
  and prose-introduced mermaid diagrams. Triggers on "explain the plan", "add rationale",
  "why did we choose", "cite the sources", "augment this spec", "add diagrams to the design",
  and similar. Composes with writing-plans rather than replacing it — writing-plans authors
  the plan; this skill makes it self-explaining.
---

# Explaining Plans

## Overview

A plan, spec, or RFC is read later by people with no context. This skill **augments that
same document in place** so it explains itself: why this path was chosen, what it's built
on, and what it's supposed to achieve. It does not create a companion file and it does not
replace `writing-plans` — it layers onto whatever document is being produced.

**Announce at start:** "I'm using the explaining-plans skill to make this document self-explaining."

**Relationship to `writing-plans`:** `writing-plans` decides *what the plan says*. This skill
decides *how the plan justifies itself*. If you're authoring a plan from scratch, run
`writing-plans` for structure, then this skill to enrich it. If a plan already exists, run
this skill alone.

## Default depth: `deep`

Durable documents earn rationale. Default to the `deep` level — alternatives considered,
decision rationale, cited sources, richer diagrams. Drop to `standard`/`brief` only if the
user asks ("keep it brief") or the document is explicitly a throwaway.

## What it adds to the document

Embed these three sections into the document itself (adapt headings to fit its style):

1. **Decision Criteria** — the options considered, the criteria they were judged against,
   the chosen path, and *why*. Make the rejected options visible; a decision with no
   visible alternatives reads as an assumption.
2. **Source Context** — a synthesis of the material the plan rests on (repo files,
   user-supplied references, web sources), every claim cited (see citation rules below).
3. **Target Outcome** — what the system/world looks like *after* this plan lands. Frame the
   outcome, not the task list.

Add prose-introduced mermaid diagrams wherever a structure, flow, or model is easier to see
than to read.

## Core ruleset (summary)

Full rules in the co-located [`principles.md`](./principles.md). The essentials:

- **Diagram rule (hard):** every diagram is preceded by ≥1 sentence saying what it shows.
  Never a diagram alone.
- **Medium:** this skill writes into a *document*, so use **mermaid** (not ASCII).
- **Mermaid type:** flowchart (logic/flow), sequenceDiagram (interactions), er/classDiagram
  (data), stateDiagram-v2 (lifecycles), C4-style flowchart (architecture).
- **Citations:** inline `[n]` + a `References` list. Tag each source — repo file
  (`path:line-range`), user-supplied (title), web (URL + `YYYY-MM-DD` accessed date). Cite
  only what you actually used; mark unverified claims as assumptions.
- **Educate, don't report:** frame the new outcome/architecture, not "I changed X."
- **Depth:** `deep` by default here; honor user overrides.

## Workflow

1. Read the target document (or the plan `writing-plans` just produced).
2. Identify the decisions, the sources they rest on, and the intended outcome.
3. Verify source claims against the repo/refs before citing — don't guess.
4. Embed Decision Criteria, Source Context, and Target Outcome into the document.
5. Add prose-introduced mermaid diagrams where they clarify.
6. Leave the rest of the document intact — augment, don't rewrite.
