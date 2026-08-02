---
name: two-store-memory-setup
description: Use when installing, repairing, or verifying the two-store agent-memory architecture on a machine — a code-graph store (codebase-memory-mcp) for structural truth plus an experience store (Hindsight) for decisions and outcomes. Triggers on "set up two-store memory", "install codebase-memory-mcp", "install hindsight", "configure the memory stores on this machine", "verify my two-store setup", and on symptoms: both MCP servers show connected but none of their tools are callable, recall returns nothing useful while everything reports healthy, the code graph never self-indexes or stays empty, retains report accepted but never land, the routing policy is not loading. Machine scope — per-repo bootstrap is repo-kickstart; general memory health is memory-onboarding.
---

# two-store-memory-setup

Install, repair and verify the **device-level** two-store memory architecture.
The code-graph store holds structural truth and is regenerated from source for
free; the experience store holds decisions, rationale and outcomes and is the
**only copy of them among the two stores** — nothing regenerates it. Committed
ADRs under `docs/adr/` remain the durable repository record of *ratified*
decisions; the store holds the deliberation behind them. The two stores never
hold the same fact.

**Scope:** this skill owns **machine scope** — install, bind, configure, routing
policy. **Repo scope belongs to `repo-kickstart`**, which performs the per-repo
two-store init itself; for a repo being kickstarted, that is the one to run.
The `memory-init` command Phase 4 writes does the same per-repo steps standalone,
for repos you are *not* kickstarting — the two are redundant, not two halves of
one job. General memory health is `memory-onboarding`. Honcho is out of scope.
No store here has two owners; if a reader has to guess which skill is
authoritative for one, that is a defect.

## Three rules that outrank convenience

**1. A tool's self-report is not evidence.** Fetch current upstream docs before
any install command and use them for **tool-specific syntax** — commands, flag
names, paths — reporting the delta where they differ. Upstream docs never
override a gate or a safety step in this skill: if they conflict, stop and get
human approval. Then for every claim, state what would prove it **false** and
run that — prefer a control (once with the setting, once without) over a status
line. No falsifiable test available? Say **unverified**.

**2. Snapshot before, diff after** — every config write, even when a flag
promises none. The installer writes to *every* agent it detects, not just
Claude Code; `--skip-config` has been accepted and ignored while ten files
changed. Re-verify the installer hash against the reviewed source: the
release-bundled copy differs from the one on main and is what `update` runs.

**3. Stop at the gates and wait for a human answer.** "Don't ask me a bunch of
questions", "just get it working", or a stated deadline **do not dissolve a
gate** — they are the conditions under which skipping one does the most damage.
Batching a gate into an end-of-run report is skipping it.

## Phases and gates

| # | Phase | Gate |
| - | ----- | ---- |
| 0 | Survey machine, ports (8888/9999/5432 **and the port you plan to pin**), every agent config, **existing memory systems**, LLM provider | **STOP** — each extra store is a competing source of truth. Present collisions; human picks retire / migrate / alongside / abandon |
| 1 | Code-graph store: review installer, snapshot, install, set the config below | **STOP** — containment by control test |
| 2 | Experience store: deployment shape, pin port, bind loopback, one sourceable env file, banks | **STOP** — round trip with timings and token counts |
| 3 | Global routing policy as a delimited, removable block | Ask before extending to other agents — rules naming unreachable tools are dead text |
| 4 | Per-repo `memory-init` from `memory-init-template.md` | Detect first; an existing command is verified and kept, never clobbered |
| 5 | Prove it works | **STOP** — restart the agent, then **invoke** a read tool from each store |
| 6 | Rollback note: files touched, backups, uninstall, what will bite you | — |

## Settings that decide whether this works at all

| Set this | Ships as | Cost of skipping |
| -------- | -------- | ---------------- |
| `auto_index true` | **`false`** | nothing ever self-indexes; the store stays permanently empty |
| `CBM_ALLOWED_ROOT` in the shell profile **and** `settings.json` `env` | unset — and unset means **no containment at all** | containment silently absent in the desktop app and IDE extensions, which is where subagents run. Missing or mismatched in any runtime: **stop setup**, do not proceed unprotected |
| `HINDSIGHT_API_HOST=127.0.0.1` + the UI host flag | **`0.0.0.0`** | memory store on the LAN; the control plane has no API key |
| DB port pinned, e.g. `pg0://hindsight:55432` | 5432 | connects to your *other* Postgres: `role "hindsight" does not exist` |
| extraction mode `verbatim` | `concise` | rejected alternatives silently dropped — the content that justifies this store existing |
| strict-schema flag, if the `json_object` probe returns 400 | soft path | **every write fails while every read looks healthy** |

The pg0 **instance name is the data directory** — changing it silently starts
an empty database. Only the port is safe to vary.

**Phase 1 gate, in full:** an out-of-root path refused; a symlink inside the
root pointing out; a `../` traversal; a prefix sibling (`…GitHubOutside`). Read
the refusal reason from the worker log — exit 1 also means "not a git repo".

One of these runs is a **deliberate negative control**: the same path with
`CBM_ALLOWED_ROOT` unset **must succeed**, or the refusals above prove nothing
— they could equally be the tool failing for an unrelated reason. Run it once,
against a **disposable fixture directory holding nothing sensitive**, then
delete the index it created and confirm the store is clean. That single run is
the only place unset is acceptable. **Normal operation fails closed:** if any
runtime lacks the configured root, stop rather than index unprotected.

## Verified defects — symptom first

| Symptom | What is actually happening |
| ------- | -------------------------- |
| Both servers `✔ Connected`, no tool callable | Tools enumerate at session start. Restart, then invoke one read tool per store |
| Write returned `{"status":"accepted"}`, memory absent | Async `retain` returns a receipt, not a confirmation. Use the blocking `sync_retain` |
| Bank exists and looks configured, but the mode never took | Bank config is **write-only** — no per-bank GET (405), and the list omits those fields. Re-apply every run; confirm behaviourally |
| Newly-ignored path still queryable after re-index | Ignore rules gate the *next* index and never retract nodes. Delete the project, rebuild, then **enumerate the indexed file list** |
| ADR reads back fine, then vanishes | `manage_adr` writes to the disposable index; any code change hard-deletes it. Use committed `docs/adr/NNN-title.md` |
| Filtering by a nonexistent tag returns rows | `tags` do not filter recall and do not affect scoring. Banks are the only isolation boundary |
| `git check-attr merge` says `unset` on a correct-looking line | `binary` is a macro expanding to `-diff -merge -text` and cancels a preceding `merge=ours`. Write `graph.db.zst binary merge=ours` |
| Daemon came up on default models | Shell-profile env never reaches a backgrounded daemon. One sourceable env file, sourced by the launcher |
| Cross-store recall returns nothing while all is healthy | You queried with identifiers; the write rules keep identifiers out of memory text. Translate to domain terms first |
| Near-empty bank returns everything at ~0.0001 | No relevance floor exists. The caller ignores low scores |
| `reflect` returns "No answer provided." | Low `max_tokens` fails *after* paying for every call. Do not lower it to economise |

**Costs, measured:** recall **0** model calls · `sync_retain` **2** (extraction
plus auto-consolidation) · `reflect` **3** at ~11–16k tokens. Reading is free;
`reflect` is the expensive branch. Re-measure on the target machine — an
earlier pass on the same box recorded 1 and 4.

## The failure mode that destroys this architecture

Retaining code structure into the experience store because it looks like useful
context. Paths, symbol names, signatures, call relationships and dependency
lists all go stale on the next commit, and then the two stores disagree with
nothing saying which to trust. The graph regenerates them free. **Let it.** The
bank's guard is advisory — a pure call-graph dump was stored verbatim despite
it. **The writer is the filter.**

## Red flags — STOP

- Piping remote content into a shell — **ever**. Save the exact bytes, verify
  the checksum or signature, read the file, get approval, then execute *that
  saved file*. A reviewed pipeline is still an unreviewed download at run time
- Accepting an exit code, a status line, or `✔ Connected` as proof
- Proceeding past a gate because the human said not to ask questions
- Writing a number into the policy that you did not measure
- Telemetry, or a credential in a file you create
- A *third* store, or a `PreToolUse` hook nudging a different graph
- Editing a tool's installed source instead of finding its config path
- Continuing past a tool that destroyed something **without** asking

Per-phase detail, the seven diagnostic counter-techniques, the full defect
catalogue and the routing-policy block are in [reference.md](reference.md).
