# repo-kickstart — reference (templates · mechanisms · guardrails)

Heavy detail for the `repo-kickstart` skill, kept out of `SKILL.md` to keep it
lean. Placeholders: `<project>`, `<stack>`, `<owner>/<repo>`, `<default-branch>`.
Everything here is a starting point — adapt wording to the repo; never paste a
placeholder through.

---

## 0. Derived names & prerequisite probes

### The two names — different strings, from different inputs

Mixing them up is the most common failure here, and the graph one needs an
identity check **before you index**, not just before you delete.

| Name | Derivation | Example |
|------|------------|---------|
| Hindsight `bank_id` | `<dir>-<8 hex of sha256(canonical identity)>` | `huhhb-da43e85b` |
| graph project | the tool's own: repo **path**, leading `/` dropped, `/` → `-` | `Users-you-Documents-GitHub-huhhb` |

**Why the bank id carries a hash — a bare directory name collides, silently.**
`PUT` on an existing bank *updates* it, so two unrelated repos both called `app`
would quietly share one bank and interleave their memories. The suffix is derived
from **canonical identity**, preferring the `origin` remote over the path so every
clone of one repo resolves to the same bank while two same-named repos never do:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel) || exit 1
canon=$(git remote get-url origin 2>/dev/null \
  | sed -E 's#^git@([^:]+):#\1/#; s#^[a-z]+://##; s#^[^@/]+@##; s#\.git$##' | tr 'A-Z' 'a-z')
[ -n "$canon" ] || canon=$(cd "$REPO_ROOT" && pwd -P)   # no remote → canonical path
BANK_ID="$(basename "$REPO_ROOT")-$(printf '%s' "$canon" | shasum -a 256 | cut -c1-8)"
```

Verified: `/tmp/app` and `/srv/app` both yield bank `app` under the old rule and
`app-d75b6c3b` / `app-dae668e4` under this one. Keep `BANK_ID` raw in config and
prose; **percent-encode it only when interpolating into a request URL.**

**Guard the graph name you cannot fix — before *indexing*, not just before
deleting.** The graph project name is derived by the *tool*, not by this skill,
and it is lossy: `/a-b/c` and `/a/b-c` both map to `a-b-c`. You cannot rename it,
so verify identity instead. `list_projects` reports each project's `root_path`:

> **Compare `root_path` against `$REPO_ROOT` before `index_repository` *and*
> before `delete_project`. If it differs, stop and report the collision — do not
> index.**

Indexing is the dangerous one precisely because it is the routine operation.
Verified: two repos at `…/x-y/z` and `…/x/y-z` both derive `…-x-y-z`, and indexing
the second **silently replaced the first** — the project's file list went from
`src/alpha.py` to `src/beta.py`, `list_projects` began reporting the second repo's
`root_path`, and the call still returned `status: indexed` with no warning.
Nothing anywhere tells you the first repo's graph is gone.

Apply the same rule to the bank: if one already exists at this id, confirm it
belongs to this repo before writing.

**Migration.** Repos bootstrapped before this rule have a bare-directory-name bank
(and the global routing policy still documents that form). Do **not** silently
create a second bank alongside it. Detect the bare-name bank, report both ids, and
ask: migrate (create the new id, re-retain, delete the old) or keep the old id
recorded in `AGENTS.md` as an explicit exception.

### Probe every prerequisite — none of them is fatal
Each missing prerequisite reports `skipped — <reason>` in the closing checklist
**and** reports it in the run's summary. A missing prerequisite is never a
silent pass and never a hard failure of the whole run.

```bash
# Graph tool — containment FIRST: indexing refuses a path outside the allowed
# root, so an out-of-root repo is a skip to report, not an error to debug.
if [ -z "${CBM_ALLOWED_ROOT:-}" ]; then
  echo "skipped — CBM_ALLOWED_ROOT unset"
else
  case "$REPO_ROOT" in
    "$CBM_ALLOWED_ROOT"|"$CBM_ALLOWED_ROOT"/*) ;;
    *) echo "skipped — repo is outside CBM_ALLOWED_ROOT" ;;
  esac
fi

# Experience store — probe, never assume. 127.0.0.1:8888 is the DEFAULT, not a
# truth: honour the env vars when the install sets them.
HS="http://${HINDSIGHT_API_HOST:-127.0.0.1}:${HINDSIGHT_API_PORT:-8888}"
curl -fsS -m 3 -o /dev/null "$HS/v1/default/banks" \
  || echo "skipped — experience store unreachable at $HS"
```

The graph MCP server not being installed at all is likewise a skip — report
`skipped — graph tool not installed` and carry on with the rest.

**Name the remedy, don't just shrug.** Installing and binding the two servers is
**machine scope and not this skill's job** — it belongs to huhhb's
`memory-setup`. So a missing server reports
`skipped — <tool> not installed; run memory-setup (machine scope), then
re-run` rather than a bare skip. This skill is repo scope: it assumes the machine
is set up and never installs, binds or configures a server itself.

### Detect existing state — conforming ≠ initializing
- **An existing index or bank** means you are **conforming, not initializing** —
  never re-create, never overwrite.
- **Conformance is per artifact, never per repo.** One artifact already present
  does **not** mean the run is done — an adopted repo can be missing
  `plans/product/README.md` or the AGENTS.md memory block forever if you
  short-circuit on the first thing you find. Check each artifact independently:
  present → ✅ and leave it **exactly** as it is; **missing → create it**.
- **Every memory store already on disk**, reported with roughly how much it holds
  and whether that data is regenerable from source: `.claude/memory/` (retired
  from routing — §3), `.remember/`, `graphify-out/`, `.codebase-memory/`, and any
  project-scope MCP memory server. Report them; delete none of them.

---

## 1. Convention-file templates

**Detect first** (idempotency matrix at the bottom). On brownfield, propose a
confirm-first merge; apply nothing unprompted.

### README.md — greenfield skeleton
```markdown
# <project>

<one-line what-this-is>

## Conventions
- **[AGENTS.md](AGENTS.md)** — canonical operating instructions for AI agents.
- **[KICKSTART.md](KICKSTART.md)** — set up, run, and develop here.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — current-state architecture.
- **[plans/](plans/)** — development plans and architecture proposals.
```
**Brownfield:** do not rewrite their README. Propose adding *only* the
`## Conventions` links block above (skip links already present).

### AGENTS.md — canonical (create if missing)
```markdown
# AGENTS.md

Canonical operating instructions for AI agents (Claude Code, Codex, Gemini,
OpenCode, …) in this repo. `CLAUDE.md` is a pointer here; keep this file the
single source of truth.

## What this is
<one paragraph — from README>

## Stack & layout
- Stack: <stack>
- Source: <dirs>  ·  Tests: <dirs>  ·  Docs: `docs/`, `plans/`

## Development lifecycle
worktrees (recommended, toggleable) →
branches (`feat/ fix/ docs/ chore/ refactor/` for human-reviewed work;
`<agent>/<task-id>` for orchestrator tasks — only `<agent>/*` is ever
janitored) → one PR per deliverable (stacking sanctioned: base on the
parent, declare it, parents merge first) → human-authorized merge.

## Review pipeline
- Non-trivial change → branch → PR. CodeRabbit reviews are wired up.
- Cross-review by a different-vendor agent before requesting human review.
- Required reviews on `<default-branch>` (see branch protection).

## Repo Memory
This block is self-contained on purpose: it has to work in this repo without
reaching for a file that lives in some other repo.

- **Structure store** (codebase-memory-mcp) — what the code **is**. Indexed,
  with a committed artifact at `.codebase-memory/graph.db.zst`. Ask it what
  calls what, what breaks if this changes, where something is defined. Never
  ask it *why*.
- **Experience store** (Hindsight) — **why**, what was rejected and why it
  lost, failures with their root cause, outcomes. Bank id: `<bank-id>`. The bank
  is in `verbatim` mode — what you send is stored unchanged, so keeping code
  structure out of it is the writer's job, not the store's.
- **`plans/architecture/`** (written via the `repo-memory` skill) — ratified
  architecture decisions. The deliberation behind them — what was feared, tried
  first, abandoned, and why the rejected option lost — belongs in the bank. Do
  **not** use the graph tool's own ADR store — it writes into the disposable
  index and any code change deletes it — and keep no second ADR directory.
- **`.claude/memory/`** — retired from routing. Kept as history; not the write
  target for new knowledge.

A user-scope routing policy, where the operator has one, **takes precedence**
over this section. This block is the repo-level default so the repo works
without one.

### Reading across the two stores — translate, don't substitute
The graph names things with identifiers; memories name things with domain
concepts, because the write rules strip identifiers out. So: query the graph →
**say what that IS, in domain terms** → recall with those terms. Querying
memories with identifiers retrieves almost nothing — measured against a freshly
seeded bank, an identifier query scored the target memory at **0.00043** against
**1.10** for the same memory in domain language, a factor of ~2,500. Guess the
direction wrong and every cross-store query silently returns nothing useful.
Either order is legal; concepts survive refactors that rename functions, which is
what makes them the better join key.

## Conventions
- Conventional Commits; concise subjects. No AI attribution in commits/PRs.
- Plans live in `plans/`: dated plans in `plans/development/`, ratified
  decisions in `plans/architecture/`.
```

### CLAUDE.md — one-line pointer
```markdown
# CLAUDE.md

See **[AGENTS.md](AGENTS.md)** — the canonical agent instructions for this repo.
```
If a full `CLAUDE.md` already exists, **leave it**; offer to slim it to this
pointer as a confirm-first diff.

### KICKSTART.md
```markdown
# KICKSTART.md

Onboarding for humans and agents.

## Setup
<install / toolchain — from <stack>>

## Run
<how to run / test / lint>

## Develop here
- Read **AGENTS.md** first (conventions), then **ARCHITECTURE.md**.
- Plans live in `plans/development/`; work status lives in the work tracker
  and the PRs, not in a file.
- Branch → PR → CodeRabbit + cross-review → human review.
```

### ARCHITECTURE.md
```markdown
# ARCHITECTURE.md

Current-state architecture. Proposals and deltas live in
**[plans/architecture/](plans/architecture/)**.

## Overview
<components / data flow — a mermaid diagram if it helps>

## Key decisions
<load-bearing choices + rationale>
```

---

## 2. Planning tree

Three homes under `plans/` — the house name; `plan/` is not a synonym for it.
Where a repo already keeps planning documents under a different name, **report
the divergence and create no second tree**: an empty tree beside a real one is
the two-sources problem, not a fix for it.

- `plans/development/` — dated plan Markdown files, `YYYY-MM-DD-<slug>.md`.
- `plans/architecture/` — architecture decision records in the `repo-memory`
  layout. The kickstart seeds only its `README.md`; `repo-memory` authors
  `DECISIONS.md`, `TEMPLATE.md` and the year files.
- `plans/product/` — optional; inception artifacts land here only when the
  `product-inception` skill is explicitly run. Seeding the README is standard,
  using the directory is opt-in, never a mandate.

### No change index is seeded
Work status, task counts and identity live in the work tracker and the PRs, not
in a hand-kept file. A hand-maintained register of the same facts is a second
source that drifts: measured here, one read `proposed` for six days on a change
that was merged and 24 of 25 tasks done.

### plans/development/README.md
```markdown
# plans/development

Implementation plans, one dated Markdown file each: `YYYY-MM-DD-<slug>.md`.
Work status lives in the work tracker and the PRs, not in a file here.
```

### plans/architecture/README.md
```markdown
# plans/architecture

Architecture decision records, owned by the `repo-memory` skill:

- `DECISIONS.md` — master index, decisions grouped by domain
- `TEMPLATE.md` — the record template, confidence levels, superseding rules
- `YYYY/INDEX.md` — that year's decision log, one row per ADR
- `YYYY/YYYY-MM.md` — the records in full, one file per month

**The rules live in `DECISIONS.md` — that file is canonical.** This README does not
restate them; a second copy is a second thing to keep in sync. `ARCHITECTURE.md` at
the repo root summarizes current state; the decisions that produced it live
here.
```

### plans/product/README.md
```markdown
# plans/product

Product-inception artifacts, one directory per initiative:
`<initiative-slug>/{brief.md,prd.md,architecture.md}` (huhhb's
`product-inception` skill — opt-in, rare). The PRD's
Epic Queue feeds Workflow 1; architecture `## Decisions` promote into
`plans/architecture/`'s monthly file on approval. Empty is normal — most repos never
run inception.
```

---

## 3. Memory — two routed stores (owned by THIS skill; registry-free)

`repo-kickstart` performs this setup itself and no longer seeds
`.claude/memory/`. **Ownership is stated
in §3.5 — put that answer in the run's report** so no reader has to guess which
skill is authoritative for which store.

Order matters throughout. **Steps 3.1.1–3.1.4 and 3.2.2 each work around a
verified defect, not a preference.** The failure each prevents is stated with it,
because every one of them fails *silently*.

### 3.1 codebase-memory-mcp — the structure store

**Step 1 — write `.cbmignore` BEFORE indexing.** Indexing first wastes work on
vendored trees. Seed from the detected `<stack>`, plus these always:
`.worktrees/`, `.remember/`, `graphify-out/`, `.codebase-memory/`,
`**/testdata/`, `**/fixtures/`, `**/__snapshots__/`, `*.min.js`,
`**/*.generated.*`. Per stack: `node_modules/ dist/ build/ .next/ coverage/`
(JS/TS) · `.venv/ venv/ __pycache__/ *.egg-info/ .pytest_cache/ .ruff_cache/`
(Python) · `vendor/ bin/` (Go) · `target/` (Rust/Java) · `.terraform/ *.tfstate*`
(Terraform).

The graph already honours the `.gitignore` hierarchy, so `.cbmignore` is only for
things that are **committed but still not worth indexing**.

**Include a secrets pass.** The index stores no file contents — but snippet
retrieval reads from disk at query time using stored line numbers, so an indexed
secret file becomes a credential reader for anything driving the MCP server,
**subagents included**. Exclude `secrets/`, `**/secrets/`, `*.env`,
`**/credentials.json`, `*.key`, `*.pem`, `*_rsa`, `*_ed25519`.

*Verified, not inferred:* editing a function on disk and calling
`get_code_snippet` again **without re-indexing** returned the new text. Retrieval
reads the live file. So excluding a secret from the index is what keeps it out of
snippet range — nothing else does.

Note `.codebase-memory/` indexes *itself* unless excluded (its `.gitattributes`
and `artifact.json` showed up as File nodes), which is why it is on the
always-list above.

Draw the next line deliberately and **say in the report where you drew it**:
credential *material* is excluded, but environment *data* — inventories, host and
IP lists, topology — is often the most structurally valuable content a private
repo has, and such a repo may commit it on purpose. Excluding that by reflex guts
the graph; indexing a private key is a leak. They are not the same call.

*Idempotency:* read the existing `.cbmignore` first and **append only missing
lines**. Never rewrite it wholesale — the user's own entries, ordering and
comments must survive.

**Step 2 — index with the artifact.** **First run §0's identity check**: if
`list_projects` already has this project name under a *different* `root_path`,
stop and report the collision — indexing would silently overwrite that repo's
graph. Otherwise `index_repository(repo_path=$REPO_ROOT, persistence=true)`.
Report nodes and edges. Re-running is cheap: it imports the existing artifact,
then indexes incrementally.

**Step 3 — if any `.cbmignore` entry changed, force a clean rebuild.**
`.cbmignore` gates what gets indexed *next*; **it does not retract what is
already in the graph.** Verified on 0.9.0: after adding `**/credentials.json`, a
plain re-index left `config/credentials.json` in the file list and its
`NVIDIA_API_KEY` node fully queryable — with **no signal of any kind**. Both
things you would reach for as evidence are useless here:
- the response's `excluded` field listed only `.git`, never the ignored path — so
  it does not report the exclusion at all;
- the node count *moved*, 23 → 36, for an unrelated reason (`.codebase-memory/`
  getting indexed). Counts drift in both directions and prove nothing.

Newly-excluded content therefore persists silently — worst exactly when the reason
for excluding it was that it was sensitive. So:

```bash
# 1. delete_project(project="<graph project name from §0>")
rm -f "$REPO_ROOT/.codebase-memory/graph.db.zst"   # keep .gitattributes — step 4
# 2. index_repository(...) again
# 3. query_graph("MATCH (f:File) RETURN f.file_path") — PROVE the paths are gone
```

Step 3's proof is the point: **neither `excluded` nor the node count is evidence —
the file list is.** Verified remedy on the same repo: after `delete_project`,
removing the artifact and re-indexing, `credentials.json` was gone from the file
list and a search for `NVIDIA_API_KEY` returned zero results. (The glob does work:
`**/credentials.json` matched a nested `config/credentials.json`. The ignore was
honoured — just only for content indexed *after* it.)

**Step 4 — `git check-attr merge` must print `merge: ours`.**

```bash
git check-attr merge -- .codebase-memory/graph.db.zst
```

The auto-generated line is `graph.db.zst merge=ours binary`, and **it does not
work**: `binary` is a git macro expanding to `-diff -merge -text`, so trailing it
unsets `merge=ours`. Repair by reversing the order:

**Rewrite only the `graph.db.zst` rule — never truncate the file.** The tool
writes it, but a human may have added rules beside it, and `>` would delete them.
That would also break this skill's own Golden Rule.

```bash
GA="$REPO_ROOT/.codebase-memory/.gitattributes"
touch "$GA"
if grep -q '^graph\.db\.zst[[:space:]]' "$GA"; then          # replace in place
  tmp=$(mktemp)
  sed 's#^graph\.db\.zst[[:space:]].*#graph.db.zst binary merge=ours#' "$GA" > "$tmp" && mv "$tmp" "$GA"
else                                                          # or append one line
  printf '# Reordered so merge=ours survives the binary macro\ngraph.db.zst binary merge=ours\n' >> "$GA"
fi
git check-attr merge -- .codebase-memory/graph.db.zst   # must now print: merge: ours
```

Two verified facts about how the tool treats this file:
- It writes it **only when it first creates `.codebase-memory/`** — and deleting
  the file then re-indexing does **not** recreate it, leaving `merge:
  unspecified`: quieter and worse than the broken version, because nothing hints
  anything is missing.
- It **never overwrites an existing** `.gitattributes`, so a hand-corrected file
  survives every later index. The repair is one-time per repo.

Never report this row ✅ on anything but the passing output. Then ensure
`graph.db.zst`, `.gitattributes` and `artifact.json` are committed — teammates
bootstrap from the artifact instead of paying a full re-index.

### 3.2 Hindsight — the experience store

Base URL from §0's probe (`$HS`) — never a hardcoded literal. One bank per repo,
`bank_id` derived per §0 — never a bare directory name.

**Step 1 — create the bank.** Keep `BANK_ID` raw everywhere except the URL, and
**percent-encode the path segment** — a directory name holding a space, `#`, `?`
or `%` otherwise addresses the wrong bank or fails outright:

```bash
BANK_SEG=$(printf '%s' "$BANK_ID" | jq -sRr @uri)   # encode ONLY for the URL
curl -fsS -X PUT "$HS/v1/default/banks/$BANK_SEG" \
  -H 'Content-Type: application/json' -d '{"name":"<repo>","mission":"…"}'
```

Verified round-trip: raw `probe space-deadbeef` → segment
`probe%20space-deadbeef` → stored and listed under the **raw** id, and `DELETE`
with the encoded segment matches it. So use `$BANK_SEG` in every request path,
and keep `$BANK_ID` raw in `AGENTS.md`, config and prose. `PUT` is idempotent by
API design: on an existing bank it updates rather than duplicating.

**Step 2 — set `retain_extraction_mode: verbatim`, in its own call.** Required,
not optional: the default `concise` mode **silently discards rejected
alternatives and root causes** — verified by feeding it a decision plus its
abandoned alternative and watching only the conclusion survive. That experiential
content is the entire reason this store exists. Verbatim also costs less.

Its price: verbatim filters *nothing*. **The never-retain rules bind the writer,
not the store.**

**The mode is write-only — do not try to read it back.** Verified: `get_bank`
omits `retain_extraction_mode`, `GET /v1/default/banks/<id>` answers `Method Not
Allowed`, and the `PATCH` response doesn't echo it either. So **re-apply the PATCH
on every run** — it is idempotent and cheap — and never treat "the bank already
exists" as evidence the mode is right.

Verify verbatim **behaviourally** instead; it is the only real evidence available.
Retain a paragraph containing a decision *and* its rejected alternative, recall
it, and confirm the alternative came back. Under `concise` only the conclusion
survives. The step-5 charter can double as this probe if you write it that way.
(A per-call alternative exists — `sync_retain(strategy:"exact")` — but the bank
setting is what makes every *other* writer's retains verbatim too.)

**Step 3 — set `retain_mission`, in its own call**, forbidding code structure and
credential values. Two verified facts about these fields:
- `mission` and `reflect_mission` are the **same underlying field** — patching
  `reflect_mission` overwrote `mission` (and `background`) with its value. Writing
  one clobbers the other; never assume they are independent.
- `retain_mission` is a **separate** field — patching it left `mission` untouched —
  and, like the extraction mode, it is **write-only**. Re-apply, don't detect.

Treat the guard as **advisory** regardless: on input that was *only* code
structure, the local model ignored it and stored the whole call graph verbatim.

**Step 4 — write with `sync_retain`, not `retain`.** Plain `retain` is
asynchronous and returns `{"status":"accepted","operation_id":…}` — an acceptance
receipt, not a confirmation; the write can fail afterwards with nothing to tell
you, which would make every ✅ in this section unfounded. `sync_retain` blocks and
returns `{"status":"completed","memory_ids":[…]}` and the memory is queryable
immediately. (At HTTP level this is `async:false` on the memories endpoint.) If
you do use async `retain`, you must verify afterwards — `get_operation` for the
status, or the bank's fact count.

**Step 5 — seed a project charter**, after recalling first to confirm none exists
so a re-run does not duplicate it. Prose about **purpose, constraints and current
state**. If you find yourself listing directories, modules or dependencies,
**stop** — that is the graph's job, and retaining it here is the one failure mode
that breaks this whole architecture. Ground it in the README, ADRs, recent commit
subjects and the architecture summary. Write it in the language a colleague would
use: memories are retrieved by domain concept, and that is what makes the
cross-store join work.

A retain costs a model call (~7–11 s), so get the charter right in one pass.

**Step 6 — seed the kickstart outcome** as one `sync_retain` into the bank: what
this run actually did (stack detected, created vs already-conforming, gaps
recorded). **A re-run that changed nothing retains nothing** — an unchanged run
is a no-op here too.

### 3.3 Capture hooks — still seeded, now feeding the bank
Seed `.githooks/` (post-commit capture + pre-commit record lint, templates from
huhhb) and run `git config core.hooksPath .githooks`.

The two-store move changed the **terminal write**, not the capture:
- **post-commit** appends 1–2 outcome-framed lines per commit to
  `.claude/memory/wip/<branch-slug>.md`. Unchanged: zero-LLM, mechanical from git
  facts.
- That journal is a **staging buffer, not a store** — nothing routes to it, it
  holds nothing durable, and it is deleted on consolidation. It is now the draft
  material for the PR retain, and consolidating a branch's journal into
  one paragraph is most of the work of writing a good outcome memory.
- **PR consolidation** now folds the journal into ONE `sync_retain` into the
  repo's bank, then deletes the journal in the same commit.
- **pre-commit record lint** stays. `.claude/memory/` is retired from routing but
  its records are *kept*, and in-place edits to them still need blocking. The
  lint ignores `wip/` by construction, so journals are unaffected.

### 3.4 `.claude/memory/` — retired from routing, data kept
**Never delete it.** This skill no longer seeds the store and no longer writes
records into it. Existing records stay exactly where they are, as history.

### 3.5 Who owns what now — state this in the report
- **`memory-setup`** owns **machine scope**: installing, binding and
  configuring both servers plus the global routing policy. This skill *depends on*
  that having been done and never does it — see §0's remedy line.
- **`repo-kickstart`** (this skill) owns **repo scope**: the two routed stores in
  *this* repo, the convention files that teach the repo to use them, and the
  planning tree.
- **`memory-init`** (a user-scope command that `memory-setup` installs)
  performs the same per-repo bootstrap standalone. Both are idempotent and take
  the same steps, so running both is redundant rather than harmful — but for a
  repo being kickstarted, **`repo-kickstart` is the one to run**; `memory-init`
  is for repos you are not kickstarting. Never treat them as two halves of one
  job.
- **`repo-memory`** is **not deprecated** — it owns architecture decision records
  at `plans/architecture/`, their format and their lifecycle. Machine-scope memory
  health is `memory-setup` Phase 5. What changed is that `.claude/memory/` is no
  longer where new knowledge is routed: structure goes to the graph, experience to
  the bank, ratified decisions to `plans/architecture/`.
- No store in this arrangement has two owners. If a reader has to guess which
  skill is authoritative for one, that is a defect in the report.

---

## 4. The store map — which store owns a fact

After a kickstart a repo has **three** candidate homes for a fact, plus a retired
fourth still on disk. Getting this wrong is the whole risk of this setup: every
failure in building it came from ambiguity about which store owned a fact, never
from a broken command.

| Store | Holds | Tense | Never holds |
|-------|-------|-------|-------------|
| **codebase-memory-mcp** graph | What the code **is** | Present, derived from source | Why anything was done |
| **`plans/architecture/`** (repo-memory) | Ratified architecture decisions | Permanent record | Deliberation |
| **Hindsight** bank | **Why**, what was rejected and why it lost, failures with root cause, **outcomes** | Historical, experiential | Code structure; credential values |
| ~~`.claude/memory/`~~ | Retired from routing — kept as history | — | New knowledge (nothing routes here) |

`.claude/memory/wip/<branch-slug>.md` is not in this table on purpose: it is a
staging buffer, deleted on consolidation, never a store.

### The overlap rules

- **Ratified decision vs deliberation.** A ratified decision goes to
  `plans/architecture/`, written via `repo-memory`. The deliberation behind it —
  what was feared, what was tried first and abandoned, and why the rejected
  option lost — goes to the Hindsight bank. Keep no second ADR directory beside
  `plans/architecture/`.
- **Never use the graph tool's ADR store.** It writes into the disposable index,
  the content never reaches the shareable artifact, and any change to the codebase
  **hard-deletes it on the next index**. Verified: one added file moved node count
  251 → 255 and the ADR row count went to 0, with no warning. A committed file
  does the same job and survives. **Expect to be nudged toward the trap:** every
  `index_repository` response carries an `adr_hint` recommending `manage_adr`
  (observed on 0.9.0). It is the tool's suggestion, not a reason to use it.

### Precedence
Where a **user-scope routing policy** exists (the operator's own agent config), it
**wins**. This section is the repo-level default, so the skill works on a machine
that has no such policy — which is most machines. Point at a user policy from the
emitted `AGENTS.md`; never restate one there, and never require one to exist.

---

## 5. Review tooling

### .coderabbit.yaml — author from schema (no repo config to copy)
```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: en-US
reviews:
  profile: chill
  request_changes_workflow: false
  high_level_summary: true
  poem: false
  review_status: true
  auto_review:
    enabled: true
    drafts: false
  path_instructions:
    - path: "**/*.md"
      instructions: "Prose clarity and broken links only; do not nitpick style."
  tools:
    markdownlint: { enabled: true }
    gitleaks: { enabled: true }
    # --- enable per detected <stack>; leave the rest off ---
    # ruff:          { enabled: true }   # Python
    # eslint:        { enabled: true }   # JS/TS
    # golangci-lint: { enabled: true }   # Go
    # rubocop:       { enabled: true }   # Ruby
    # shellcheck:    { enabled: true }   # shell
```
Enable only the language tools the stack actually uses. Verify keys against the
schema URL — CodeRabbit's schema evolves.

### Branch protection — ruleset first, then hand off (never configure silently)
```bash
# No GitHub remote yet? report N/A and STOP — otherwise the calls below run with
# empty vars and hit an invalid `repos//rules/branches/`.
if ! gh repo view --json nameWithOwner >/dev/null 2>&1; then
  echo "N/A — no GitHub remote yet; re-run after pushing (then run this check)."
else
  OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  BR=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
  # 1. Rulesets first. Any rule of type pull_request = protected by a ruleset.
  gh api "repos/$OWNER_REPO/rules/branches/$BR"
  # 2. Only if no pull_request rule came back: classic protection.
  gh api "repos/$OWNER_REPO/branches/$BR/protection"   # 200 = present; 404 = absent
fi
```

Read the results in this order:

1. **A rule of type `pull_request` in the ruleset response** → protected by a
   ruleset. Report ✅ with the `ruleset_id`. Never recommend classic protection
   on top of a ruleset.
2. **Otherwise, classic protection returns 200** → classic protection is
   present. Report it; suggest no change.
3. **Otherwise (404)** → absent. Do NOT configure it yourself. Emit this
   command for the human (it needs admin) and report the gap in the run's
   summary:

```bash
gh api -X POST "repos/$OWNER_REPO/rulesets" --input - <<JSON
{
  "name": "protect-$BR",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
    } },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
JSON
```

Required reviews on the default branch are a precondition for pr-shepherd. A
ruleset `pull_request` rule with `required_approving_review_count: 0` is
therefore a **reportable gap**, not a failure: report it alongside the ✅.

---

## 6. Verification checklist — the closing report
```text
repo-kickstart — <owner>/<repo> (<greenfield|brownfield>, <stack>)

  item                         status
  ---------------------------  --------------------------------------
  README links doc set         ✅ present | ➕ created | ⚠ merge proposed
  AGENTS.md (canonical)        ✅ | ➕   (Repo Memory section present)
  CLAUDE.md (pointer)          ✅ | ➕ | ⚠ full file kept
  KICKSTART.md                 ✅ | ➕
  ARCHITECTURE.md              ✅ | ➕
  plans/ tree                  ✅ | ➕
  .cbmignore + secrets pass    ✅ | ➕  (line drawn: <what was excluded vs kept>)
  graph indexed + artifact     ✅ | ➕  (<nodes> nodes / <edges> edges) | ⚠ skipped — <reason>
  graph.db.zst merge=ours      ✅ verified | ➕ repaired | ⚠ skipped — <reason>
  Hindsight bank (verbatim)    ✅ | ➕  (bank <id>, verbatim re-applied) | ⚠ skipped — <reason>
  charter in bank              ✅ present | ➕ retained | ⚠ skipped — <reason>
  capture hooks → bank         ✅ | ➕  (core.hooksPath=.githooks)
  .coderabbit.yaml             ✅ | ➕
  branch protection            ✅ ruleset <id> | ✅ classic | ❌ absent — commands emitted + gap recorded | N/A no remote yet

  store ownership stated:  <yes>          (§3.5 — which skill owns which store)
  gaps recorded in index:  <list | none>
  second-run no-op:        <yes | n/a first run>
```
`❌ branch protection` with emitted commands (or `N/A` when the repo has no
GitHub remote yet) is an **expected pass** for a fresh repo. So is any
`⚠ skipped — <reason>` row **whose gap was reported in the summary**: a
missing prerequisite is a status,
not a failure. Only fabricated or unverified rows are failures — and these four
rows may never be ✅ without their evidence in hand: the node/edge counts, the
passing `check-attr` output, a verbatim round-trip that brought a rejected
alternative back, and a domain-language recall that actually returned the charter.

---

## Idempotency matrix (how to detect "already conforming")

| Item | Present-and-conforming test |
|------|-----------------------------|
| README links | README mentions AGENTS.md, KICKSTART.md, ARCHITECTURE.md, plans/ |
| AGENTS.md | file exists |
| CLAUDE.md pointer | file exists and references AGENTS.md |
| KICKSTART / ARCHITECTURE | file exists |
| plans tree | `plans/development/`, `plans/architecture/` and `plans/product/` exist, each with its README, and **no *active* change-index file** is present. Brownfield: a repo that had one before may keep it as a **retired artifact** — its first heading says so, nothing writes to it, and it carries no instruction to maintain it. That passes, because the failure this row guards is two live registers of one fact, not the existence of history. An index that still reads as current, or that any tool still writes, is a **fail**; migrate it by retiring it in place (status now lives in the work tracker and the PRs) rather than by deleting rows that link to past work |
| plans/product | `plans/product/README.md` exists (content optional — inception is opt-in, never mandatory) |
| ADR structure | `plans/architecture/DECISIONS.md` and `TEMPLATE.md` exist; the record set and the index sets match **both ways** — every ADR in a `YYYY/YYYY-MM.md` has a row in that year's `INDEX.md` AND a line in `DECISIONS.md`, **and** every index row and master line resolves to an existing record. An index that omits a record is a **fail**; so is an index row pointing at a record that does not exist, because an orphaned row reads as a decision that was never made |
| AGENTS.md memory block | AGENTS.md carries the `## Repo Memory` heading and it names this repo's bank id |
| `.cbmignore` | file exists and already contains the always-list, the `<stack>` entries and the secrets entries — append-only, so a re-run adds no line |
| graph index | `index_status` reports the project indexed; `.codebase-memory/graph.db.zst` exists and is committed |
| graph merge attr | `git check-attr merge -- .codebase-memory/graph.db.zst` prints `merge: ours` |
| Hindsight bank | bank `<bank-id>` exists (derived per §0, **not** a bare directory name). The mode is **not readable**, so re-apply the `verbatim` PATCH every run — idempotent, and it changes no content. "Bank exists" alone is never evidence the mode is right |
| charter | a domain-language recall against the bank returns a charter-like memory |
| capture hooks | `.githooks/` present and `git config core.hooksPath` = `.githooks` |
| .coderabbit.yaml | file exists |
| branch protection | `gh api "repos/$OWNER_REPO/rules/branches/$BR"` includes a `pull_request` rule, or `gh api "repos/$OWNER_REPO/branches/$BR/protection"` returns 200 |

Any "present-and-conforming" → report ✅ and change nothing. A second
consecutive run must produce **no diff**.

---

## Rationalization table — STOP if you catch yourself here

| Excuse | Reality |
|--------|---------|
| "The repo has a README, I'll rewrite it cleanly" | It's theirs. Merge a links block; never overwrite. |
| "CLAUDE.md should hold the full instructions" | AGENTS.md is canonical; CLAUDE.md is a one-line pointer. Two sources drift. |
| "I'll drop a memory log under plans/" | plans/ holds DOCUMENTS only. Experience goes to the Hindsight bank, structure to the graph, instructions to AGENTS.md. No memory of any kind under plans/, ever. |
| "`.claude/memory/` is retired, so I'll delete/migrate it" | Retired from **routing**. The data is kept, in place. Deleting someone's history is not a kickstart — §3.4. |
| "The re-index says it's `excluded` / the node count didn't move, so the secret is out" | Neither is evidence — `excluded` never lists the ignored path and counts drift for unrelated reasons. `.cbmignore` never retracts indexed nodes: delete_project + remove the artifact + re-index, then prove it with the file list — §3.1 step 3. |
| "`graph.db.zst merge=ours binary` is what the tool wrote, so it works" | It doesn't. `binary` is a macro that unsets `merge=ours`. Reverse the order and require `merge: ours` from check-attr — §3.1 step 4. |
| "`retain` returned `accepted`, so the memory is saved" | `accepted` is a receipt, not a write. Use `sync_retain`, or verify with `get_operation` — §3.2 step 4. |
| "The bank's `retain_mission` will keep code structure out" | Advisory only — verified being ignored on structure-only input. The writer is the filter, not the store. |
| "The bank already exists, so that row is ✅" | Existing ≠ conforming, and the mode is write-only so you cannot check it. Re-apply the `verbatim` PATCH every run; a `concise` bank silently drops the content the store exists for. |
| "Hindsight/the graph is unreachable, so the run failed" | Report `skipped — <reason>`, record the gap, and finish every other stratum. A missing prerequisite never fails the whole run. |
| "I'll record this decision with the graph tool's ADR store" | Never — disposable index, hard-deleted on the next index, absent from the artifact. Write it to `plans/architecture/` via `repo-memory`. |
| "This decision deserves its own ADR folder" | No second ADR directory. Ratified decisions go to `plans/architecture/` via `repo-memory`; the deliberation goes to the bank. |
| "I'll put the memory block in CLAUDE.md" | AGENTS.md is canonical; CLAUDE.md stays a one-line pointer. Two sources drift. |
| "Branch protection is missing, I'll just enable it" | Don't configure silently — emit the ruleset command for the human and record the gap. |
| "There's a ruleset, but I'll add classic protection to be safe" | Never recommend classic protection on top of a ruleset. A ruleset `pull_request` rule is ✅. |
| "Second run — I'll just recreate everything" | Re-run must be a no-op. Detect, report ✅, change nothing. |

## Red flags — STOP and correct
- Overwriting a file you did not just create.
- A `.coderabbit.yaml`, config, or committed file containing a real token/URL/workspace.
- Reporting any ✅ without running the check.
- Enabling branch protection without the human.
- A second run that produces a diff.
- Reporting the graph, merge-attr, bank or charter rows ✅ without the evidence in
  hand — node/edge counts, the passing `check-attr` output, a verbatim round-trip,
  a recall that returned the charter.
- Claiming the bank's extraction mode was "verified" or "read back". It is
  write-only; that claim cannot be true.
- Deleting, moving or migrating `.claude/memory/`. Retired ≠ removable.
- Retaining code structure — paths, symbols, signatures, call graphs, dependency
  lists — into the bank. This is the one failure mode that breaks the whole
  architecture: it looks like useful context, goes stale on the next commit, and
  then the two stores disagree with no signal saying which to trust.
- Indexing without the secrets pass — or stripping a private repo's environment
  *data* because it "looks sensitive", without saying so in the report.
- Treating an async `retain` receipt as a verified write.
- Hardcoding the experience store's host/port instead of probing §0's `$HS`.
- Requiring a user-scope routing policy to exist. It's an optional layer that wins
  where present; the repo-level default here must stand on its own.
