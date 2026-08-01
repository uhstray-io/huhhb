# two-store-memory-setup — reference

Phase detail, the verified-defect catalogue, templates and guardrails for
`SKILL.md`. Read **§1 Diagnosing** before you test anything.

Every fact marked **[verified]** was reproduced on a real macOS/arm64 install.
Every number marked **[measure]** must be re-measured on the target machine —
do not copy it into a policy you did not measure.

---

## 1. Diagnosing a two-store setup

The build's real difficulty is not installing two servers. It is telling a
working component from a convincingly broken one. Every genuine defect below
presented as a self-consistent success, and three diagnoses during the
reference build were confidently wrong before they were right.

**1. Inspect every message, not just the system prompt.** A bank guard was
declared missing after grepping a 9,875-character system prompt. It was there —
in the per-request user message. Caching economics push per-tenant and per-bank
text out of the cached system prompt. Dump the whole request array.

**2. A positive result needs a control that isolates the variable.** Putting
identifiers in `tags` made a tag-flavoured query score 0.94 — apparently a 400×
win. Confounded: the query also contained words from the memory's *text*. The
clean control — a token present **only** in tags vs. a token present nowhere —
scored 0.000087 and 0.000025. Indistinguishable. For any "does X improve
retrieval" question, build a query whose terms exist *only* in X and a matched
query whose terms exist nowhere. Same score means X does nothing.

**3. Confirm the target exists before concluding retrieval is broken.** A
cross-store test asked about a subsystem the store had no memories about, and
near-zero scores were read as a broken join. The store simply had no answer.
Every retrieval test names its target memory up front.

**4. "Reads back fine" does not mean "still stored." Count rows.** A soft
staleness flag and a hard delete are indistinguishable through a read API. For
anything designated durable: write a distinctive record, change what the store
derives from, trigger the refresh, then check the row count.

**5. Distinguish broken plumbing from an ignored instruction.** They need
opposite fixes — one is an upstream bug, the other moves enforcement into the
caller. First prove the instruction was delivered, then vary the input to find
where compliance breaks.

**6. Count operations, not operation names.** `recall` makes **zero** model
calls; `reflect` makes **four**. Measured by diffing a request-log total, not
by reading docs. That inverts the intuition most cost policies are built on.

**7. An acceptance is not a confirmation.** The same logical write was exposed
twice with different semantics: a REST endpoint that blocks, and an MCP tool of
the same name that is async with no flag to make it block, returning
`{"status":"accepted","operation_id":…}`. A caller trusting that cannot know
the write landed. Find the blocking variant and name it in the policy.

---

## 2. Phase detail

### Phase 0 — Survey (report before changing anything)

**0a. Machine.** OS, arch, shell; Docker/Podman/Colima present and running.
Every port the setup wants — **8888, 9999, 5432** — with the process holding
it: `lsof -nP -iTCP:<port> -sTCP:LISTEN`. A container mapping 5432 collides
with the embedded Postgres, and the symptom is Hindsight connecting to *your
other database* and reporting `role "hindsight" does not exist`. Disk: budget
~2.5 GB for the Python environment, ~230 MB of local models, ~260 MB binary.

**0b. Agent config.** Does `~/.claude/CLAUDE.md`, `~/.claude.json`,
`~/.claude/settings.json` exist; summarise MCP servers, hooks, memory
instructions. **Enumerate every `PreToolUse` hook, including plugin hooks** —
hooks stack, they do not replace. List every other agent that would be
auto-detected (Codex, Gemini, Zed, OpenCode, Antigravity, Aider, KiloCode,
Kiro, VS Code) with its instruction file and MCP config. **The installer writes
to all of them.**

**0c. Existing memory systems — the gate that matters most.** Do not assume the
machine is clean. Search installed CLIs, `uv tool list`, `pipx list`, global
npm packages, enabled plugins, MCP registrations at every scope, and per-repo
artifact directories, for anything occupying either role: code-graph tools,
vector stores, knowledge graphs, session-history tools, per-repo memory dirs,
cross-session memory plugins.

For each: **what data it holds, how much, whether it is regenerable, and which
role it occupies.** Flag specifically any global instruction telling agents to
prefer a *different* code-search tool first (it contradicts read routing), and
whether disabling one requires disabling a plugin used for other things.

> **GATE.** Present the collisions and stop. Two stores is the design; each
> extra store is a competing source of truth and competing tool-selection
> pressure. But a store holding irreplaceable data is not abandoned casually.
> The human chooses: retire from routing / migrate first / run alongside /
> abandon this design. **A deadline or "don't ask me questions" does not clear
> this gate**, and deferring it to a closing report is not clearing it either.

**0d. LLM provider — probe, do not assume.** Find a local provider (Ollama, LM
Studio, llama.cpp, vLLM, anything OpenAI-compatible). Report endpoint, models,
embedding models. Then probe structured output *before* installing:

```bash
curl -s http://<endpoint>/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"<model>","messages":[{"role":"user","content":"hi"}],
       "response_format":{"type":"json_object"},"max_tokens":5}'
```

Many local servers accept only `json_schema` or `text` and reject this with a
400. The symptom if unfixed is severe: **every write fails while every read
looks healthy** — the store is silently write-dead. Fix is a Phase 2 flag.

### Phase 1 — codebase-memory-mcp (structure store)

1. Fetch the installer, show it, wait for approval. Report what it downloads,
   whether checksum verification is mandatory or bypassable, what it writes,
   and which step is opaque to you.
2. **Snapshot every file it could touch**, including other agents' configs from
   0b. Record hashes.
3. Check `--help` for `--dry-run` even if the README does not mention one. Use
   it, then install.
4. Diff every snapshot. If it wrote outside authorised paths, stop and ask.
5. Set config explicitly and confirm — `auto_index` ships **`false`**, so
   without this nothing self-indexes and the store stays empty:

```bash
codebase-memory-mcp config set auto_index true         # default false — MUST set
codebase-memory-mcp config set auto_index_limit 50000  # size vs. largest real repo
codebase-memory-mcp config set auto_watch true         # already default; be explicit
codebase-memory-mcp config list
```

   Count files *excluding* vendored and build trees before sizing the limit — a
   260k-file repo may hold 12k real ones. Prefer excluding noise over raising
   the ceiling.

6. **Decide the UI at install time.** The graph UI is a separate release asset,
   not a flag; a standard binary refuses `--ui`. Reinstalling later re-runs the
   whole agent-configuration step. Once enabled it persists to
   `~/.cache/codebase-memory-mcp/config.json`, is **invisible to `config
   list`/`config get`**, and is served by whatever MCP server process is
   running.
7. Set `CBM_ALLOWED_ROOT` in **two** places: the shell profile *and* the `env`
   block of `~/.claude/settings.json`. The profile alone covers only
   interactive shells — the desktop app and IDE extensions launch MCP servers
   without sourcing it, so containment would silently not apply there.
8. Confirm registration and enumerate tools. If the count disagrees with the
   docs, trust the binary.

> **GATE — containment is proven, not asserted.** Show all of: an index attempt
> on a path outside the root; **the same path with `CBM_ALLOWED_ROOT` unset,
> which must succeed**; a symlink inside the root pointing outside; a `../`
> traversal; and the actual refusal reason from the worker log, not an exit
> code — exit 1 also means "not a git repo". Also test a prefix sibling
> (`…/GitHubOutside`) — a naive string-prefix guard lets it through. Then
> delete any index the control test created and show the store is clean.

### Phase 2 — Hindsight (experience store)

1. **Choose the deployment shape and say why.** Embedded daemon / single
   container / Compose against external Postgres / bare-metal. Prefer external
   Postgres if the machine already runs one — backup and retention become the
   human's, not a container's. The embedded daemon idles out and gives each
   bank its own database; the API server serves many banks from one.
2. **Pin the embedded Postgres port** — the default resolves to 5432:
   `export HINDSIGHT_API_DATABASE_URL="pg0://hindsight:55432"`. The **instance
   name is the data directory** (`~/.pg0/instances/<name>/`); changing it
   silently starts an empty database. Only the port is safe to vary.
3. **Bind loopback.** API and control plane both default to `0.0.0.0`, and the
   control plane runs with no API key (`No API key configured (public
   access)`). Set `HINDSIGHT_API_HOST=127.0.0.1` and pass the UI's hostname
   flag. **Prove isolation** by connecting over the host's LAN address and
   showing it refused.
4. **One sourceable config file** (`~/.hindsight/env.sh`), sourced by both the
   shell profile and the service launcher. Shell-profile variables do **not**
   reach a backgrounded daemon — first boot silently uses default models and
   nothing says so until someone reads the log. No secrets in it.
5. Set the provider from 0d. If the structured-output probe failed, set
   `HINDSIGHT_API_LLM_STRICT_SCHEMA=true` to switch from soft `json_object` to
   grammar-enforced `json_schema`. Prefer **in-process local embeddings and
   reranking** — not just for cost: `recall` then has no external dependency
   and keeps working when the LLM server is closed. **Prove it with a control:
   stop the LLM endpoint and re-run all three operations. `recall` must still
   succeed; `retain` and `reflect` must fail.** That single test establishes
   both the independence property and the per-operation call attribution, which
   is otherwise taken on trust from the operation names (§1.6).
6. Bring it up. Determine **honestly** whether a UI ships with the chosen
   deployment; if it is a separate package, say so rather than reporting a UI
   that is not there.
7. Ask whether it should start on boot. Service managers get a minimal PATH — a
   Node UI launched via `npx` fails with exit 127 unless the runtime is
   resolved. Prefer resolving a version manager's default over pinning a
   version that will rot.
8. **Bank layout — and treat any existing bank as irreplaceable.** This is a
   repair path as often as a fresh install. Before touching a bank that
   already exists, **count its facts** (`list_banks` / `get_bank_stats`).
   Nothing rebuilds this store; recreating a populated bank destroys the only
   copy. Note also that changing extraction mode governs *future* writes and
   does not rewrite what is already stored — so a bank that spent time in the
   default mode has already lost the rejected alternatives from those
   memories, and no later setting recovers them. Say so rather than implying
   the mode change fixed the back catalogue.

   Create `personal` for cross-project preferences. Do **not**
   pre-create a bank per repo — let Phase 4 create each on demand. Convention:
   `bank_id` = repo directory name, verbatim. Use **separate banks**, not
   metadata filters: banks are storage-level isolation, metadata filtering is
   application-level and is not isolation at all.
9. **Set the write guard — and know that you cannot read it back.** Set
   `retain_mission` to forbid code structure. **The bank config is write-only
   [verified]:** there is no per-bank GET (`GET /v1/default/banks/<id>` returns
   405), and the list endpoint returns `mission` but omits
   `retain_extraction_mode` and `retain_mission` entirely. A bank existing is
   therefore never evidence it is configured — and any instruction to "re-read
   the setting afterwards" is unexecutable. **Re-apply both settings on every
   run** (the PATCH is idempotent) and verify *behaviourally* per step 10.
   `mission` and `reflect_mission` are the same underlying field, so writing
   one overwrites the other; `mission` is readable in the list response, which
   is the only part of this you can confirm by reading. Probe the guard
   adversarially: retain something that is *only* what it forbids.
10. **Test extraction fidelity before trusting any bank.** Retain one item
    containing a decision **and** its rejected alternative **and** a root
    cause, then read back what was stored. Choose a mode that preserves
    reasoning. State the trade-off in the policy: full-fidelity modes filter
    nothing, so the never-retain list becomes the writer's job.
11. **Negative-control every filter.** Query with a value matching *nothing*
    and confirm zero results. Also test whether the metadata contributes to
    retrieval at all (§1.2).
12. **Integration path**, lightest that works: first-party MCP server → agent
    SDK → a thin local MCP shim over REST exposing exactly `retain`, `recall`,
    `reflect`. Confirm a first-party server exists rather than fabricating a
    config for one that does not. Test any stdio entry point before trusting
    it — banners and progress bars on stdout corrupt the JSON-RPC stream.

> **GATE — round trip.** Retain one test fact into `personal`, recall it,
> reflect on it. Show all three responses with timings and token counts, and
> state which operations required the LLM. Note the caveat: `reflect` blends
> retained memory with the model's own priors — informed judgement, not
> citation.

### Phase 3 — Routing policy

Write `~/.claude/CLAUDE.md`, or append a clearly delimited removable section if
one exists (§4 template). Then decide scope deliberately: if Phase 1's
installer configured other agents, **ask** whether the policy goes to them too.
Rules naming tools an agent cannot reach are dead text — so for each agent that
gets it, either register the experience store there as well or state plainly
how to reach it. Per-agent MCP schemas differ; verify each from its docs, and
never flip a global experimental transport flag on an agent that already has
working MCP servers without asking.

**Measure the join during setup rather than assuming it.** Retain one
policy-compliant memory (rationale, no identifiers), then recall it twice: once
with identifiers pulled from the graph, once in domain language. Put both
scores in the policy. Reference build: **0.000015** vs **1.096** [measure] — a
gap large enough that guessing the direction silently breaks every cross-store
query. If your numbers come out the other way, follow your numbers.

A second measurement on the same stack scored **0.259** vs **1.093** — same
direction, but a 4× gap rather than a 70,000× one. The difference was the
confound from §1.2: that identifier query happened to share vocabulary with the
memory's text (it named an "extraction mode" and an "ignore rule", both of
which the memory discusses in prose). **A clean measurement needs identifiers
that appear nowhere in the memory text.** Take the direction as settled and
your own magnitude as approximate unless you controlled for that overlap.

### Phase 4 — Per-repo bootstrap

Install `memory-init-template.md` from this skill directory to
`~/.claude/commands/memory-init.md`. **Detect first**: if a command is already
there, read it, verify it covers the ten steps below, and keep it — never
clobber a working command. Report which of the two happened.

The command must, for the current repo: (1) establish names and confirm the
repo is inside the allowed root; (2) write `.cbmignore` **before** indexing,
including a secrets pass — the index stores no contents, but snippet retrieval
reads from disk at query time using stored line numbers, so an indexed secret
file is a credential reader for anything driving the MCP server; (3) force a
clean rebuild if any ignore entry changed; (4) index with the persistent
artifact and report node/edge counts; (5) verify the git merge attribute with
`git check-attr` and repair it; (6) point ratified ADRs at committed files; (7)
**re-apply** extraction mode and guard on every run in **separate** calls,
since neither can be read back; (8) seed a prose charter after checking none
exists;
(9) append a delimited project `CLAUDE.md` section; (10) report created vs.
skipped.

**Idempotency is a requirement.** Prove it by running twice and showing the
second run changed nothing.

### Phase 5 — Prove it works

1. A pure structure question — answered from the graph, no file reads.
2. A pure rationale question about the Phase 2 fact — from the experience
   store, with provenance.
3. A question needing both — graph first, translate, then recall.
4. Deliberately ask something that tempts a code fact into the experience
   store. Confirm the decline, explain why, and state what *would* have earned
   a retain.
5. Total on-disk footprint of both stores, split **irreplaceable /
   rebuildable / reinstallable**. Attribute shared caches honestly.
6. **Restart both services**, re-run 1–3, confirm data intact by count *and* by
   content. A store that does not survive a restart is not a store.
7. **Restart the agent, then invoke a read tool from each store.** MCP tools
   are enumerated at session start, so a mid-session registration yields
   `✔ Connected` with nothing callable. A connection check is not a capability
   check. Until this passes the policy is inert no matter how correct it is.
8. **Retain-then-recall across the seam** using the translate step. Show the
   score.
9. **List every claim in the policy you did not verify.** Numbers, timings,
   scores, behavioural claims. Anything asserted without a test is a liability
   because it will be trusted later.

### Phase 6 — Rollback note

Write `~/.claude/MEMORY-SETUP.md`: every file created or modified with its
backup path; exact uninstall commands including any `--dry-run` rehearsal;
which paths hold irreplaceable data and which are safe to delete; the tool's
own backup/export commands for the irreplaceable store.

Add **"Non-obvious things that will bite you"** — every defect, workaround and
load-bearing setting from §3, each with its **symptom**, so a future reader
diagnoses from the symptom instead of rediscovering the cause. A setting whose
absence causes silent failure gets an explicit "do not remove this".

Also record which uninstall steps will *not* clean up: an installer removes
only its own delimited blocks, so hand-written policy sections survive and then
reference tools that no longer exist.

---

## 3. Verified defect catalogue — diagnose from the symptom

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Store stays empty; nothing ever indexes itself | `auto_index` ships `false` **[verified]** | `config set auto_index true` |
| `--ui requested, but this binary was built without the embedded UI` | UI is a separate release asset **[verified]** | Install with `--ui`; decide at install time |
| UI setting seems not to persist | `config list`/`get` surface only the three `auto_*` keys **[verified]** | Read `~/.cache/codebase-memory-mcp/config.json` |
| Log says `ui.serving` but nothing listens | Server run with `</dev/null` reads EOF and exits **[verified]** | Hold stdin open |
| Installer printed "Skipping agent configuration" but ten files changed | `--skip-config` accepted and ignored (0.9.0) **[verified]** | Treat any promise not to write as unverified until the diff proves it |
| `update` uses a weaker URL check than the reviewed script | The release-bundled installer copy ≠ the copy on main; loose `case` pattern `http://localhost*` prefix-matches `http://localhost.example.com` **[verified]** | Re-download from the reviewed source and compare hashes; never trust the on-disk copy |
| Containment "confirmed" by an exit code | Exit 1 also means "not a git repo" **[verified]** | Control test: same path with the variable unset must succeed |
| Containment applies in the terminal but not in the desktop app | Profile variables do not reach MCP servers launched by the app **[verified]** | Set `CBM_ALLOWED_ROOT` in `~/.claude/settings.json` `env` too |
| A newly-ignored path's nodes are still queryable after a re-index | `.cbmignore` gates the *next* index; it does not retract existing nodes **[verified]**. The index response is not the signal you want: a **full rebuild** does list its excluded dirs, but the **incremental** path retracts nothing while reporting success, and node count drifts for unrelated reasons because the artifact directory indexes itself | `delete_project`, remove the artifact, re-index, then **enumerate the indexed file list** — that is the only thing that proves absence |
| `git check-attr merge` prints `merge: unset` on a line that looks right | `graph.db.zst merge=ours binary` — `binary` is a macro expanding to `-diff -merge -text` and unsets the preceding `merge=ours` **[verified]** | Reverse the order: `graph.db.zst binary merge=ours` |
| `.gitattributes` deleted, re-index does not recreate it | Written only when the tool first creates the directory **[verified]** | Restore by hand; the repair is one-time per repo |
| ADR reads back fine, then vanishes | `manage_adr` writes into the disposable index; any code change hard-deletes it (251→255 nodes was enough; `SELECT COUNT(*)` → 0) and it never reaches the shareable artifact **[verified]** | Committed `docs/adr/NNN-title.md`. Do not use `manage_adr` |
| Hindsight reports `role "hindsight" does not exist` | Connected to another Postgres already on 5432 **[verified]** | Pin the port; never vary the pg0 instance name (it *is* the data directory) |
| Fresh, empty database after a rename | Instance name is the data directory **[verified]** | Only vary the port |
| Daemon booted with default models despite a configured profile | Shell-profile env does not reach a backgrounded daemon **[verified]** | One sourceable env file, sourced by the service launcher too |
| Every write fails, every read looks healthy | Local server rejects `response_format: json_object` with 400 **[verified]** | `HINDSIGHT_API_LLM_STRICT_SCHEMA=true` |
| Control plane reachable from the LAN | API and control plane default to `0.0.0.0`, control plane has no API key **[verified]** | `HINDSIGHT_API_HOST=127.0.0.1` + UI hostname flag; prove refusal from the LAN address |
| Rejected alternatives silently missing from stored memories | Default `concise` extraction discards them — the one content type justifying this store over a vector DB. `verbatim` preserved `tried first and abandoned`, `dead end, corrected`; also cheaper, 1,371 vs 2,046 tokens **[verified]** | Set `verbatim`; the never-retain list now binds the writer |
| Writing `mission` wipes `reflect_mission` | Same underlying field **[verified]** | Set `retain_mission` on its own call |
| Bank exists and looks configured, but the mode never took | Bank config is **write-only**: no per-bank GET (405), and the list response omits `retain_extraction_mode` and `retain_mission` **[verified]** | Re-apply both every run; confirm behaviourally with a round trip that shows a rejected alternative surviving — never by reading the field |
| Guard configured but a call-graph dump was stored anyway | Guard is delivered correctly and disobeyed when obeying would mean returning nothing — a property of negative constraints under extraction, not a bug **[verified]** | Move enforcement into the caller's write routing; keep the field as a nudge and label it advisory |
| Tag filter returns results for a tag that does not exist | `tags` are stored and listed but do not filter recall and do not affect scoring **[verified]** | Human-readable labels only; banks are the only isolation boundary |
| Write "succeeded" but the memory is absent | MCP `retain` is async and returns `{"status":"accepted","operation_id":…}` with no flag to block **[verified]** | Use `sync_retain`; or `retain` for a batch you verify with `get_operation` |
| Near-empty bank returns everything at ~0.0001 and looks like a match | No relevance floor on recall **[verified]** | Caller ignores low scores; harmless at three memories, misleading at three hundred |
| Cross-store recalls return nothing useful while everything reports healthy | Recalling with identifiers; the write rules keep identifiers out of memory text **[verified]** | Translate to domain terms first (§4 rule 3) |
| Both servers `✔ Connected`, no tool callable | MCP tools are enumerated at session start; these were registered mid-session **[verified]** | Restart the agent, then actually invoke one read tool per store |
| `hindsight-local-mcp` unusable as a stdio server | Prints a banner and progress bars to stdout, corrupting JSON-RPC **[verified]** | Use the HTTP surface |

**Measured costs** — reference build, local `gpt-oss-20b` **[measure]**:

| Operation | Time | LLM calls | Tokens |
| --------- | ---- | --------- | ------ |
| `recall` | 0.35 s | **0** | **0** |
| `sync_retain` | ~7 s | **2** — extraction + auto-consolidation | ~4,500 |
| `reflect` | ~14 s | **3** | ~11,000–16,000 |
| graph index and queries | sub-ms to seconds | 0 | 0 |

Reading is free. **`reflect`, not `retain`, is the expensive branch.**

These are re-measured numbers, and the re-measurement is itself the lesson: an
earlier pass on the same machine recorded retain as **1** call at ~1,400–2,000
tokens and reflect as **4** calls at ~8,300. Retain is two calls whenever
auto-consolidation is enabled — every write triggers a consolidation pass
behind it, so budgeting from "one call per retain" understates it by ~2×. Count
the calls on **your** machine with **your** settings; the operation names
predict neither the count nor the direction of the error.

**`reflect` fails silently on a small `max_tokens` [verified].** At
`max_tokens: 700` it returned `"No answer provided."` after spending all three
model calls and 11,283 tokens — full price, no output, and `success` on every
underlying call. The same query at the 4,096 default answered well. Do not
lower `max_tokens` to economise on `reflect`: it saves nothing and the failure
presents as an empty result rather than an error.

---

## 4. Routing-policy block

Append to `~/.claude/CLAUDE.md` between removable markers. Restate in your own
words without weakening anything; fill the bracketed numbers from your own
measurements.

```markdown
# >>> TWO-STORE MEMORY ROUTING (BEGIN — delete this whole block to revert) >>>

Two stores. They never hold the same fact.
- Structure store: what IS — present-tense structural truth, rebuilt from
  source for free, authoritative on call graphs, blast radius, dead code,
  routes, architecture. Never authoritative on why.
- Experience store: what HAPPENED and WHY — decisions, attempts, outcomes,
  preferences. Nothing rebuilds it; it is the only copy. Never authoritative
  on what the code currently looks like.

Name derivation between them: bank id = basename(repo_root); the graph's
project name = the repo path with the leading `/` dropped and `/` → `-`.

## Read routing — decide before the first tool call
1. Derivable from the code as it exists right now? → structure store. Always
   try first: free, sub-millisecond, deterministic.
2. About a decision, rationale, preference, past attempt or outcome? → recall,
   scoped to the project bank, plus `personal` for how-I-work questions.
3. Needs both? TRANSLATE — do not substitute. The graph names things with
   identifiers; memories name them with domain concepts, and the write rules
   strip identifiers out of memories. Three steps: graph gives identifiers and
   shape → restate what that IS in domain terms → recall with the domain terms.
   Step 2 is the join and it is free. Either order is legal. Measured here:
   identifiers [X], domain language [Y].
4. A judgement call — should I, what's the risk? → reflect. Expensive branch.
5. Grep and file reading are the LAST resort — only to verify something the
   graph already pointed at, or where the graph reports no coverage.

## Write routing — what earns a retain
At natural boundaries (decision reached, task finished, PR merged, approach
abandoned): the decision and the alternatives rejected and WHY they lost; a
failure and its actual root cause; the outcome labelled worked / dead end /
corrected; a constraint discovered the hard way; a stated preference.

Use the BLOCKING write variant. An "accepted" response is not a confirmation.

Banks run in full-fidelity extraction, so what is sent is what is stored:
- One clean self-contained paragraph per retain. One retain, one memory.
- Nothing filters the text. THE WRITER IS THE FILTER. The bank's guard field
  is advisory and has been observed to be ignored.

Write in the language a colleague would use, not the language the compiler
uses. That is what makes rule 3 work.

## Never retain
File paths, function or class names, signatures, call relationships, import
graphs, dependency lists, or anything else regenerable from source; whole file
contents or long diffs; credential values, keys, tokens, real addresses;
anything already recorded in a committed ADR.

## The ADR overlap rule
A ratified decision belongs to the repo → committed `docs/adr/NNN-title.md`.
The deliberation — what else was considered, what we feared, what we tried
first → experience store. Do NOT use the graph tool's ADR store: it writes
into the disposable index and any code change hard-deletes it.

## Cost discipline
recall [A] · retain [B] · reflect [C] — measured, not guessed. Reading is
free; index freely. There is no relevance floor on recall, so a near-empty
bank returns everything at ~0.0001 and looks like it matched.

If unsure whether something is worth retaining, ASK rather than retaining by
default. Retrieval quality is bounded by what was stored.

# <<< TWO-STORE MEMORY ROUTING (END) <<<
```

---

## 5. Standing constraints

These hold across every phase, not just the one they first bite in.

**Docs currency before any install command.** Both projects ship fast. Fetch
the current README or docs and confirm the command, flags and paths still match
what this reference says. Where they differ, **follow the docs and report the
delta** — this file is a record of one verified build, not a spec the upstream
is obliged to honour.

**Ask before anything destructive or irreversible.** Overwriting an existing
`CLAUDE.md`, deleting an index or database, or modifying files outside the
authorised paths. And if a tool does one of these *without* asking — stop and
report it rather than continuing as though it were authorised. A tool taking an
unrequested destructive action is a finding, not a step that went through.

**Correct yourself in writing.** When something you asserted turns out wrong,
fix it in the artifacts already written — the policy block, the rollback note,
the report — not only in conversation. On the reference build this happened
three times; expect at least twice. An uncorrected artifact is worse than no
artifact, because it will be trusted later.

**No credentials in any file you create.** If a key is needed, reference an
environment variable and tell the human to set it themselves. A placeholder a
local server ignores is not a credential, but say so explicitly when you use
one.

**No telemetry, analytics or usage reporting** in either system. Check for it
during install rather than assuming the defaults are off.

**Out of scope — do not do these.** Do not install a third memory or code-graph
tool; two stores is the design. Do not install a second `PreToolUse` hook
nudging toward a *different* graph — hooks stack rather than replace, so report
any that already exist either way (one nudging toward *these* two stores is
fine). Do not "fix" a tool by editing its installed source in site-packages —
find the supported configuration path, or report that none exists.

---

## 6. After an upgrade — the four cheap probes

Both projects rewrite agent configuration on update, and the routing policy
lives in a Markdown file no installer knows about. Re-run Phase 5 after any
upgrade to either tool, and re-check the loopback bindings at the same time — a
default of `0.0.0.0` that an upgrade restores is a network-exposed memory store.

Four minutes, and each probe maps to a defect that was invisible from status
output:

1. Does a retain preserve a rejected alternative? (extraction mode survived)
2. Does a nonexistent-tag filter return zero? (filtering still does nothing)
3. Does a durable record still have rows behind it after a code change?
4. Are both servers' tools actually **invocable**, not merely connected?

**Ongoing watch items.** For the structure store, run with diagnostics on for
the first week and check whether RSS grows against query count — its docs
devote a section to memory-trajectory capture for slow leaks. For the
experience store, expect roughly 1 GB resident when using local embedding and
reranker models, and establish why GPU acceleration is disabled by default on
your platform before enabling it. Watch for a relevance floor appearing in a
later release; until then recall on a large bank returns low-scoring noise and
it is the caller's job to ignore it.

**If cross-store answers start feeling thin, check the policy is loading before
blaming the stores.** The symptom of the join lapsing is recalls that return
nothing useful while every component reports healthy. Grepping out of habit is
the tell.

---

## 7. Rationalization table

| Excuse | Reality |
| ------ | ------- |
| "They said not to ask questions, so I'll report the collisions at the end" | The decision was needed *before* the work. A closing report is a fait accompli, not a gate. |
| "They're in a hurry — I'll skip the installer review" | The review is the only thing standing between an unreviewed remote script and a machine with no containment yet configured. |
| "`--skip-config` means nothing will be written" | It was accepted and ignored while ten files across seven agents changed. A flag is not a control; the diff is. |
| "Both servers show ✔ Connected, so it works" | Tools are enumerated at session start. Connected and callable are different claims. |
| "The index said the path was excluded" | The nodes were still queryable and the count did not move. |
| "The ADR reads back fine" | It had zero rows behind it after the next code change. |
| "The recall returned it, so tags filter" | A single-item bank returns it either way. That test cannot fail, so it carries no information. |
| "The write returned accepted" | Acceptance is not confirmation, and the failure is silent. |
| "The guard is configured, so structure can't get in" | Verified ignored on input that was only structure. The writer is the filter. |
| "I'll copy the reference numbers into the policy" | Whoever reads it later will budget from them. Measure or mark unverified. |
| "This repo is small, `.cbmignore` plus a re-index is enough" | Re-index does not retract nodes. Destroy and rebuild, then query to prove absence. |
| "It's just documentation, it can't hurt" | A policy that names unreachable tools is dead text, and it reads as working. |
