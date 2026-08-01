---
name: two-store-memory-setup
description: Use when installing, repairing, or verifying the two-store agent-memory architecture on a machine — a code-graph store (codebase-memory-mcp) for structural truth plus an experience store (Hindsight) for decisions and outcomes. Triggers on "set up two-store memory", "install codebase-memory-mcp", "install hindsight", "configure memory on this machine", "my memory routing policy isn't working", "verify my memory setup".
---

# two-store-memory-setup

Installs and verifies the **device-level** two-store memory architecture:
`codebase-memory-mcp` holds present-tense structural truth about code and is
regenerated from source for free; `Hindsight` holds decisions, rationale,
failures and outcomes and is the **only copy** of that data. They never hold
the same fact.

Exact commands, the catalogue of verified defects with their symptoms, the
routing-policy text, the per-repo command template and the rollback note all
live in **[reference.md](reference.md)**. Read its defect catalogue *before*
you verify anything — the hard part here is not installing two servers, it is
telling a working component from a convincingly broken one.

## Scope — what this skill owns

| Concern | Owner |
| ------- | ----- |
| Machine: install, bind, configure, global routing policy | **this skill** |
| One repo: ignore file, index, bank, charter | `memory-init` (Phase 4 writes it) |
| "Is my four-strata memory healthy?" | `memory-onboarding` |
| Repo conventions bootstrap | `repo-kickstart` |

Honcho is **out of scope**. This skill configures two stores and never
touches the evolve/Honcho stratum, MemPalace, or `.claude/memory/`.

## Three rules that outrank convenience

**1. A tool's self-report is not evidence.** Both projects ship fast — before
any install command, fetch the current docs and confirm the command, flags and
paths still match; where they differ, follow the docs and report the delta.
Then for every claim, state what would prove it **false** and run that. Prefer a control test — once with the
setting, once without, show both — over reading a status line. Verified here:
`✔ Connected` while no tool is callable; `excluded` while the nodes are still
queryable; `--skip-config` accepted and ignored; `{"status":"accepted"}` for a
write that never landed; a record that reads back with zero rows behind it.
Cannot construct a falsifiable test? Say the claim is **unverified**.

**2. Snapshot before, diff after — every step that writes config**, not just
installers, and even when a flag promises nothing will be written. `cp` the
file, run the step, show a real diff. The installer writes to *every* coding
agent it detects, not only Claude Code.

**3. Stop at the gates and wait for a human answer.** The gates are marked in
the phase table. "I don't want to be asked a bunch of questions", "just get it
working", or a stated deadline **do not dissolve a gate** — they are the
conditions under which skipping one does the most damage. Batching a gate into
an end-of-run report is skipping it: the decision was needed *before* the work,
and reporting afterwards presents a fait accompli as a question.

## Phase order

Run in order. Never start a phase whose gate has not cleared.

| # | Phase | Gate |
| - | ----- | ---- |
| 0 | Survey: machine, ports, agent configs, **existing memory systems**, LLM provider + structured-output probe | **STOP** — every extra store is a competing source of truth. Present the collisions; the human chooses retire / migrate / run alongside / abandon |
| 1 | `codebase-memory-mcp`: review installer, snapshot, install, set `auto_index`, set `CBM_ALLOWED_ROOT` in **two** places | **STOP** — containment proven by control test, not asserted: out-of-root refused, same path with the variable unset must **succeed**, plus symlink and `../`. Then delete the index the control created |
| 2 | `Hindsight`: deployment shape, pin the DB port, **bind loopback**, one sourceable env file, extraction mode, bank layout | **STOP** — round trip (`sync_retain` → `recall` → `reflect`) with timings and token counts, and which operations hit the LLM |
| 3 | Write the global routing policy as a delimited, removable block | Ask before extending it to other agents — rules naming tools an agent cannot reach are dead text |
| 4 | Write the per-repo `memory-init` command from `memory-init-template.md` | Detect first: an existing command is verified and kept, never clobbered |
| 5 | Prove it works — including **restart the agent, then invoke a read tool from each store** | **STOP** — until a tool is actually called, the policy is inert |
| 6 | Write the rollback note: files touched, backups, uninstall, "non-obvious things that will bite you" | — |

## The one failure mode that destroys this architecture

Retaining code structure into the experience store because it looks like
useful context. File paths, symbol names, signatures, call relationships,
import graphs, dependency lists — all of it goes stale on the next commit, and
then the two stores disagree with no signal saying which to trust. The graph
regenerates it all for free. **Let it.**

The bank's guard field is advisory, not enforcement — verified: a pure
call-graph dump was stored verbatim despite it. **The writer is the filter.**

## Red flags — STOP

- About to `curl | bash` without downloading, reading and showing the script
- About to accept an exit code, a status line, or `✔ Connected` as proof
- About to proceed past a gate because the human said not to ask questions
- About to write a measured number into the policy that you did not measure
- About to `.cbmignore` a secret and re-index — that does **not** retract
  existing nodes; the phase-4 rebuild is mandatory
- About to record a ratified ADR through `manage_adr` — the next code change
  hard-deletes it
- About to report "working" for a claim you never constructed a test for
- About to enable telemetry, or put a credential in a file you create
- About to install a *third* store, or a `PreToolUse` hook nudging toward a
  different graph — two stores is the design, and hooks stack
- About to edit a tool's installed source instead of finding its config path
- About to continue past a tool that did something destructive **without**
  asking — stop and report it instead

Standing constraints, rationalizations and the diagnostic counter-techniques
are in [reference.md](reference.md) — read them before testing, not after.
