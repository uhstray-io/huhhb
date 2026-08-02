# repo-kickstart — reference (templates · mechanisms · guardrails)

Heavy detail for the `repo-kickstart` skill, kept out of `SKILL.md` to keep it
lean. Placeholders: `<project>`, `<stack>`, `<owner>/<repo>`, `<default-branch>`.
Everything here is a starting point — adapt wording to the repo; never paste a
placeholder through.

---

## 0. Derived names & prerequisite probes

### The three names — different strings, from different inputs

| Name | Derivation | Example |
|------|------------|---------|
| Hindsight `bank_id` | `<dir>-<8 hex of sha256(canonical identity)>` | `huhhb-da43e85b` |
| OpenSpec store id | repo **directory** name | `huhhb` |
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
STORE_ID=$(basename "$REPO_ROOT")                        # OpenSpec, machine-local
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
recorded in `AGENTS.md` as an explicit exception. `OpenSpec store id` stays the
directory name — it is machine-local and human-typed; if `openspec store register`
reports that id taken by a different path, disambiguate then and record it.

### Probe every prerequisite — none of them is fatal
Each missing prerequisite reports `skipped — <reason>` in the closing checklist
**and** records the gap in `plans/development/00-implementation-plan.md`. A
missing prerequisite is never a silent pass and never a hard failure of the whole
run — the same graceful-degradation contract Honcho already has here.

```bash
command -v openspec >/dev/null 2>&1 || echo "skipped — openspec not installed"

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
`skipped — graph tool not installed` and carry on with OpenSpec and the rest.

**Name the remedy, don't just shrug.** Installing and binding the two servers is
**machine scope and not this skill's job** — it belongs to huhhb's
`two-store-memory-setup`. So a missing server reports
`skipped — <tool> not installed; run two-store-memory-setup (machine scope), then
re-run` rather than a bare skip. This skill is repo scope: it assumes the machine
is set up and never installs, binds or configures a server itself.

### Detect existing state — conforming ≠ initializing
- **OpenSpec root.** House convention puts it at `plans/development`, *not* the
  repo root. Check `plans/development/openspec/config.yaml` **and** `openspec
  store list`. Either one already present means you are **conforming, not
  initializing** — never re-init, never overwrite an existing `config.yaml`.
- **Every memory store already on disk**, reported with roughly how much it holds
  and whether that data is regenerable from source: `.claude/memory/` (retired
  from routing — §4), `.remember/`, `graphify-out/`, `.codebase-memory/`, and any
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
worktrees (recommended, toggleable — see huhhb's `using-git-worktrees`) →
branches (`feat/ fix/ docs/ chore/ refactor/` for human-reviewed work;
`<agent>/<task-id>` for orchestrator tasks — only `<agent>/*` is ever
janitored) → one PR per deliverable (stacking sanctioned: base on the
parent, declare it, parents merge first) → human-authorized merge.

## Review pipeline
- Non-trivial change → branch → PR. CodeRabbit reviews are wired up.
- Cross-review by a different-vendor agent before requesting human review.
- Required reviews on `<default-branch>` (see branch protection).

## Memory & specs — which store owns a fact
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
- **OpenSpec** — `specs/` is what the system *should* do; `changes/` is what
  we are changing now, with its public rationale. Store `<store-id>`, rooted at
  `plans/development`; from the repo root every command needs
  `--store <store-id>`.
  **Public rationale vs deliberation:** the change proposal carries the ratified
  "why"; what did *not* make it — what was feared, tried first, abandoned, and
  why the rejected option lost — belongs in the bank.
- **`docs/adr/NNN-title.md`** — ratified decisions with **no capability
  surface** (infra, tooling, process). Capability decisions live in the spec or
  the change; never write the same decision in both. Do **not** use the graph
  tool's own ADR store — it writes into the disposable index and any code change
  deletes it.
- **Honcho workspace** — cross-session team memory (env-scoped; no creds in repo).
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

### On archive, retain the outcome
`openspec archive <change>` records that a change completed. It does **not**
record whether it *worked* — and that gap is this repo's highest-value memory.
So when you archive, retain ONE memory into bank `<bank-id>`: the outcome labelled
plainly **worked / dead end / corrected**, the root cause of anything that
failed, and any constraint discovered along the way. One self-contained
paragraph, in domain language.

### Drift check — a deliberate practice, not an aside
`openspec list --specs --store <store-id>` is intent; the graph's architecture
summary is reality. Compare them on purpose, periodically. Divergence is
**information, not a conflict to reconcile** — it means the specs or the code
moved and nobody wrote it down.

## Conventions
- Conventional Commits; concise subjects. No AI attribution in commits/PRs.
- Plans live in `plans/`; specs validate through OpenSpec (`openspec validate`).
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
- Plans live in `plans/development/`; the living index is
  `plans/development/00-implementation-plan.md`.
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

### plans/development/00-implementation-plan.md — living index
Canonical copy: `skills/openspec-conformance/templates/00-implementation-plan.md`. Keep
the 5 columns exactly — `promote-adr.ts` matches a row by its first cell and
edits the Status/Links cells in place, so a divergent format breaks promotion.
```markdown
# Implementation Plan — living index

The index over ALL OpenSpec changes under `openspec/changes/` — including
archived history: a row is never removed, its Status flips to `archived`
so `promote-adr.ts` can find and update it. One row per change. Who
writes it: see `openspec-conformance`'s "Index writers" —
the canonical four-role enumeration; never restate it, never hand-edit
the status/ADR cells.

| Change | Title | Status | Owner | Links |
|--------|-------|--------|-------|-------|
| <slug> | <one-line title> | proposed | @<owner> | [tasks](openspec/changes/<slug>/tasks.md) · #<issue> |

_Status: proposed · in-progress · in-review · archived._
```

### plans/development/README.md
```markdown
# plans/development

Implementation plans and the living index (`00-implementation-plan.md`).
This dir is the **OpenSpec store root** — `openspec/` lives here (registered as
store `<store-id>`), so active changes are `openspec/changes/<slug>/`.
```

### plans/architecture/README.md
```markdown
# plans/architecture

Durable, numbered ADRs (`NNN-<slug>.md`), promoted from a change's design on
archive. `ARCHITECTURE.md` at the repo root summarizes; the decision records
live here. (Current-state capability specs live in the store at
`plans/development/openspec/specs/`, not here.)
```

### plans/product/README.md
```markdown
# plans/product

Product-inception artifacts, one directory per initiative:
`<initiative-slug>/{brief.md,prd.md,architecture.md}` (huhhb's
`product-inception` skill / buhhdy Workflow 0 — opt-in, rare). The PRD's
Epic Queue feeds Workflow 1; architecture `## Decisions` promote to
`plans/architecture/` on approval. Empty is normal — most repos never
run inception.
```

---

## 3. OpenSpec — store registration (mechanism owned by `openspec-conformance`)

OpenSpec's native **store registration** makes `plans/development` a standalone
OpenSpec root — no symlinks, no config-key hack. `openspec-conformance` (a
sibling huhhb skill) owns the full mechanism, the house `config.yaml` rules, and
the `/opsx:*` per-tool notes; run its **Setup** section. Summary + the caveat:

```bash
mkdir -p plans/development plans/architecture

# 1. Create the root. store register requires an existing openspec/ dir, so init
#    FIRST. --tools none = just openspec/config.yaml, no tool dirs to commit.
[ -f plans/development/openspec/config.yaml ] \
  || ( cd plans/development && openspec init --tools none )

# 2. Register plans/development as the OpenSpec root, id = repo name.
#    Once per MACHINE (registry is ~/.local/share/openspec/stores/registry.yaml);
#    idempotent — re-run prints "already registered". Commit the resulting
#    plans/development/.openspec-store/store.yaml to keep the id stable.
openspec store register plans/development --id <repo> --yes

# 3. Report health (not a gate). A fresh store with no changes is a status.
openspec validate --all --store <repo> --no-interactive || true
```

Then edit `plans/development/openspec/config.yaml` `context:` for the real
`<stack>` and add the house `rules:` (block in `openspec-conformance/reference.md`).

**Also put the memory routing in `context:` — this is the wiring, not a nicety.**
That field is injected into the model's context whenever OpenSpec creates an
artifact, which makes it the one place that gets proposals *authored* with both
stores in view. Append to the `context:` prose:

> Memory routing for this repo: structural questions — what calls what, blast
> radius, where something is defined — go to the codebase-memory graph;
> rationale, rejected alternatives and outcomes go to the Hindsight bank
> `<bank-id>`. On `openspec archive`, retain one memory into that bank recording
> whether the change worked, labelled worked / dead end / corrected, with the
> root cause of anything that failed. Write memories in domain language, not
> identifiers.

Keep it to prose the model can act on; don't restate the whole store map there —
§5 and the emitted `AGENTS.md` carry that.

**Caveats — state these in the checklist, don't hide them:**
- Everything lands under `plans/development/openspec/` (`changes/<slug>/`,
  `specs/`, `changes/archive/`). From the repo root, OpenSpec commands need
  `--store <repo>` — ancestor-only root resolution won't find the nested root
  without it.
- `openspec validate` enforces the **spec** layer only (every requirement needs a
  `#### Scenario:`); it does **not** parse `tasks.md`. A fresh store with no
  changes yet is not a conformance failure — report the real result.

---


## 4. Memory — two routed stores + Honcho (owned by THIS skill; registry-free)

`repo-kickstart` performs this setup itself; it no longer delegates §4 to
`memory-onboarding`, and no longer seeds `.claude/memory/`. **Ownership is stated
in §4.6 — put that answer in the run's report** so no reader has to guess which
skill is authoritative for which store.

Order matters throughout. **Steps 4.1.1–4.1.4 and 4.2.2 each work around a
verified defect, not a preference.** The failure each prevents is stated with it,
because every one of them fails *silently*.

### 4.1 codebase-memory-mcp — the structure store

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

### 4.2 Hindsight — the experience store

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

### 4.3 Honcho — team memory (env-scoped; a server in one mode only)
Scope the repo's workspace through the evolve-suite skills (`/evolve` / the evolve
setup). **`repo-kickstart` never configures Honcho** — it reads the existing
configuration and reports on it, so this step adds no server setup of its own.
Config comes from the environment or evolve's own user-scope config file, never
from the repo: `HONCHO_URL`, `HONCHO_API_KEY`, `HONCHO_WORKSPACE`. **Never write a
URL, key, or workspace into the repo.**

There are **three** states. Collapsing them into "configured / not configured" is
the mistake to avoid, because one of them is configured *and* serverless:

| State | Server | Report |
|-------|--------|--------|
| `honcho` mode | Yes — self-hosted `HONCHO_URL` or managed `HONCHO_API_KEY` | scope the workspace; name it |
| `local` mode | **None** — blank endpoint selects it | `local mode (no server; nothing to scope)` — a *configured* state, not a missing one |
| unconfigured | — | `skipped — not configured` |

**`honcho` mode has a second prerequisite beyond credentials: the `@honcho-ai/sdk`
package must be installed** — an optional runtime dependency, deliberately never
vendored. A machine can hold a valid endpoint, key and workspace and still be
unable to talk to the server. Probe for it, and report `skipped — endpoint
configured, @honcho-ai/sdk not installed` with the one-line install hint rather
than a bare ✅. Local mode also has **no deriver**, so recall-synthesis features
are absent there by design; that is not a gap for this skill to fix.

Whatever the state, this stratum **never fails the run**, and `repo-kickstart`
never installs the SDK or runs an `init` — those are the human's, in a terminal.

### 4.4 Capture hooks — still seeded, now feeding the bank
Seed `.githooks/` (post-commit capture + pre-commit record lint, templates from
huhhb) and run `git config core.hooksPath .githooks`.

The two-store move changed the **terminal write**, not the capture:
- **post-commit** appends 1–2 outcome-framed lines per commit to
  `.claude/memory/wip/<branch-slug>.md`. Unchanged: zero-LLM, mechanical from git
  facts.
- That journal is a **staging buffer, not a store** — nothing routes to it, it
  holds nothing durable, and it is deleted on consolidation. It is now the draft
  material for the PR/archive retain, and consolidating a branch's journal into
  one paragraph is most of the work of writing a good outcome memory.
- **PR consolidation** now folds the journal into ONE `sync_retain` into the
  repo's bank, then deletes the journal in the same commit.
- **pre-commit record lint** stays. `.claude/memory/` is retired from routing but
  its records are *kept*, and in-place edits to them still need blocking. The
  lint ignores `wip/` by construction, so journals are unaffected.

### 4.5 `.claude/memory/` — retired from routing, data kept
**Never delete it.** This skill no longer seeds the store and no longer writes
records into it. Existing records stay exactly where they are, as history.

### 4.6 Who owns what now — state this in the report
- **`two-store-memory-setup`** owns **machine scope**: installing, binding and
  configuring both servers plus the global routing policy. This skill *depends on*
  that having been done and never does it — see §0's remedy line.
- **`repo-kickstart`** (this skill) owns **repo scope**: the two routed stores in
  *this* repo, Honcho, OpenSpec, and the wiring between them.
- **`memory-init`** (a user-scope command that `two-store-memory-setup` installs)
  performs the same per-repo bootstrap standalone. Both are idempotent and take
  the same steps, so running both is redundant rather than harmful — but for a
  repo being kickstarted, **`repo-kickstart` is the one to run**; `memory-init`
  is for repos you are not kickstarting. Never treat them as two halves of one
  job.
- **`repo-memory`** and **`memory-onboarding`** are **not deprecated.** They still
  own `.claude/memory/` — its format, its Record Contract, its diagnostics — and
  remain correct on direct invocation. What changed is that the store they govern
  is no longer where new knowledge is routed.
- No store in this arrangement has two owners. If a reader has to guess which
  skill is authoritative for one, that is a defect in the report.

---

## 5. The store map — which store owns a fact

After a kickstart a repo has **six** candidate homes for a fact, plus a retired
seventh still on disk. Getting this wrong is the whole risk of this setup: every
failure in building it came from ambiguity about which store owned a fact, never
from a broken command.

| Store | Holds | Tense | Never holds |
|-------|-------|-------|-------------|
| **codebase-memory-mcp** graph | What the code **is** | Present, derived from source | Why anything was done |
| **OpenSpec `specs/`** | What the system **should do** — ratified capability specs | Present, intended | What the code currently is; deliberation |
| **OpenSpec `changes/`** | What we are **changing now**, with tasks and public rationale | In-flight | Whether it worked afterwards |
| **`docs/adr/`** | Ratified decisions with **no capability surface** — infra, tooling, process | Permanent record | Deliberation; anything a spec already states |
| **Hindsight** bank | **Why**, what was rejected and why it lost, failures with root cause, **outcomes** | Historical, experiential | Code structure; credential values |
| **Honcho** workspace | Cross-session, cross-repo team context | Accruing | Repo-local structure; anything credential-shaped |
| ~~`.claude/memory/`~~ | Retired from routing — kept as history | — | New knowledge (nothing routes here) |

`.claude/memory/wip/<branch-slug>.md` is not in this table on purpose: it is a
staging buffer, deleted on consolidation, never a store.

### The four overlap rules

- **Intent vs reality.** OpenSpec `specs/` is what the system *should* do; the
  graph is what it *does*. Divergence is a **signal, not a conflict** — comparing
  `openspec list --specs` against the graph's architecture summary is a drift
  check worth running deliberately, not a contradiction to reconcile.
- **Public rationale vs deliberation.** A change proposal carries the ratified,
  public "why". Hindsight carries what did **not** make the proposal: what was
  feared, what was tried first and abandoned, and why the rejected option lost.
- **ADR only for what OpenSpec does not cover.** In an OpenSpec repo, capability
  decisions live in the spec or the change. Reserve `docs/adr/NNN-title.md` for
  decisions with no capability surface. **Never write the same decision in both.**
  Create `docs/adr/` only when there is actually something to put in it — don't
  scaffold an empty directory.
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

## 6. Review tooling

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

### Branch protection — check, then hand off (never configure silently)
```bash
# No GitHub remote yet (fresh local repo)? Nothing to check — report N/A and
# note that the check + the commands below apply once the repo is on GitHub.
# No GitHub remote yet? report N/A and STOP — otherwise the calls below run with
# empty vars and hit an invalid `repos//branches//protection`.
if ! gh repo view --json nameWithOwner >/dev/null 2>&1; then
  echo "N/A — no GitHub remote yet; re-run after pushing (then emit the commands below)."
else
  OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  BR=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
  gh api "repos/$OWNER_REPO/branches/$BR/protection"   # 200 = protected; 404 = absent
fi
```
If **404**, do NOT enable it yourself. Emit these commands for the human (needs
admin) and record the gap in `plans/development/00-implementation-plan.md`:
```bash
gh api -X PUT "repos/$OWNER_REPO/branches/$BR/protection" --input - <<'JSON'
{
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "required_status_checks": null,
  "enforce_admins": true,
  "restrictions": null
}
JSON
```
Required reviews on the default branch are a precondition for pr-shepherd.

---

## 7. Verification checklist — the closing report
```text
repo-kickstart — <owner>/<repo> (<greenfield|brownfield>, <stack>)

  item                         status
  ---------------------------  --------------------------------------
  README links doc set         ✅ present | ➕ created | ⚠ merge proposed
  AGENTS.md (canonical)        ✅ | ➕   (memory + specs sections present)
  CLAUDE.md (pointer)          ✅ | ➕ | ⚠ full file kept
  KICKSTART.md                 ✅ | ➕
  ARCHITECTURE.md              ✅ | ➕
  plans/ tree + index          ✅ | ➕
  OpenSpec init + registration ✅ | ➕  (validate: <pass | N pending>) | ⚠ skipped — <reason>
  OpenSpec context: → routing  ✅ | ➕ | ⚠ skipped — no OpenSpec
  .cbmignore + secrets pass    ✅ | ➕  (line drawn: <what was excluded vs kept>)
  graph indexed + artifact     ✅ | ➕  (<nodes> nodes / <edges> edges) | ⚠ skipped — <reason>
  graph.db.zst merge=ours      ✅ verified | ➕ repaired | ⚠ skipped — <reason>
  Hindsight bank (verbatim)    ✅ | ➕  (bank <id>, verbatim re-applied) | ⚠ skipped — <reason>
  charter in bank              ✅ present | ➕ retained | ⚠ skipped — <reason>
  capture hooks → bank         ✅ | ➕  (core.hooksPath=.githooks)
  Honcho workspace scoped      ✅ <workspace> | ⚠ local mode (no server) | ⚠ skipped (unconfigured | sdk missing)
  .coderabbit.yaml             ✅ | ➕
  branch protection            ✅ present | ❌ absent — commands emitted + gap recorded | N/A no remote yet

  store ownership stated:  <yes>          (§4.6 — which skill owns which store)
  gaps recorded in index:  <list | none>
  second-run no-op:        <yes | n/a first run>
```
`❌ branch protection` with emitted commands (or `N/A` when the repo has no
GitHub remote yet) is an **expected pass** for a fresh repo. So is any
`⚠ skipped — <reason>` row **whose gap was recorded** in
`plans/development/00-implementation-plan.md`: a missing prerequisite is a status,
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
| plans tree | `plans/development/00-implementation-plan.md` + both READMEs exist |
| plans/product | `plans/product/README.md` exists (content optional — inception is opt-in, never mandatory) |
| OpenSpec | `plans/development/openspec/config.yaml` + `.openspec-store/store.yaml` (id `<store-id>`) exist; `openspec store list` includes `<store-id>` (else re-run `register` — it no-ops) |
| OpenSpec context | `config.yaml` `context:` already names the bank id and the graph/rationale split |
| AGENTS.md memory block | AGENTS.md carries the `## Memory & specs` heading and it names this repo's bank id |
| `.cbmignore` | file exists and already contains the always-list, the `<stack>` entries and the secrets entries — append-only, so a re-run adds no line |
| graph index | `index_status` reports the project indexed; `.codebase-memory/graph.db.zst` exists and is committed |
| graph merge attr | `git check-attr merge -- .codebase-memory/graph.db.zst` prints `merge: ours` |
| Hindsight bank | bank `<bank-id>` exists (derived per §0, **not** a bare directory name). The mode is **not readable**, so re-apply the `verbatim` PATCH every run — idempotent, and it changes no content. "Bank exists" alone is never evidence the mode is right |
| charter | a domain-language recall against the bank returns a charter-like memory |
| capture hooks | `.githooks/` present and `git config core.hooksPath` = `.githooks` |
| Honcho | evolve reports the workspace scoped. `local` mode, unconfigured, and endpoint-without-SDK are **terminal states, not gaps to fix here** — report which one and move on |
| .coderabbit.yaml | file exists |
| branch protection | `gh api …/protection` returns 200 |

Any "present-and-conforming" → report ✅ and change nothing. A second
consecutive run must produce **no diff**.

---

## Rationalization table — STOP if you catch yourself here

| Excuse | Reality |
|--------|---------|
| "The repo has a README, I'll rewrite it cleanly" | It's theirs. Merge a links block; never overwrite. |
| "CLAUDE.md should hold the full instructions" | AGENTS.md is canonical; CLAUDE.md is a one-line pointer. Two sources drift. |
| "Symlink openspec/specs + changes into plans/" | Obsolete — that was the rejected pre-1.6 hack. Use `openspec store register plans/development` (native). No symlinks. |
| "openspec validate failed → the kickstart failed" | A fresh index isn't a conforming change yet. Report "pending"; don't fail the run. |
| "I'll drop a memory log under plans/" | plans/ holds DOCUMENTS only. Experience goes to the Hindsight bank, structure to the graph, instructions to AGENTS.md. No memory of any kind under plans/, ever. |
| "`.claude/memory/` is retired, so I'll delete/migrate it" | Retired from **routing**. The data is kept, in place. Deleting someone's history is not a kickstart — §4.5. |
| "The re-index says it's `excluded` / the node count didn't move, so the secret is out" | Neither is evidence — `excluded` never lists the ignored path and counts drift for unrelated reasons. `.cbmignore` never retracts indexed nodes: delete_project + remove the artifact + re-index, then prove it with the file list — §4.1 step 3. |
| "Honcho has no URL set, so it's unconfigured" | A blank endpoint selects **local mode**, which is configured and needs no server. Report local mode — §4.3. |
| "Endpoint and key are set, so Honcho is ✅" | `honcho` mode also needs `@honcho-ai/sdk` installed. Probe it; valid credentials with no SDK cannot reach the server. |
| "`graph.db.zst merge=ours binary` is what the tool wrote, so it works" | It doesn't. `binary` is a macro that unsets `merge=ours`. Reverse the order and require `merge: ours` from check-attr — §4.1 step 4. |
| "`retain` returned `accepted`, so the memory is saved" | `accepted` is a receipt, not a write. Use `sync_retain`, or verify with `get_operation` — §4.2 step 4. |
| "The bank's `retain_mission` will keep code structure out" | Advisory only — verified being ignored on structure-only input. The writer is the filter, not the store. |
| "The bank already exists, so that row is ✅" | Existing ≠ conforming, and the mode is write-only so you cannot check it. Re-apply the `verbatim` PATCH every run; a `concise` bank silently drops the content the store exists for. |
| "Hindsight/the graph is unreachable, so the run failed" | Report `skipped — <reason>`, record the gap, and finish every other stratum. A missing prerequisite never fails the whole run. |
| "I'll record this decision with the graph tool's ADR store" | Never — disposable index, hard-deleted on the next index, absent from the artifact. Committed file at `docs/adr/`. |
| "This capability decision deserves an ADR *and* a spec" | Pick one. In an OpenSpec repo the spec or the change IS the record; ADRs are for decisions with no capability surface. |
| "I'll put the memory block in CLAUDE.md" | AGENTS.md is canonical; CLAUDE.md stays a one-line pointer. Two sources drift. |
| "I'll commit the Honcho key so it's reproducible" | Never. Creds are env-only; a committed key is a leak. |
| "Branch protection is missing, I'll just enable it" | Don't configure silently — emit the commands for the human and record the gap. |
| "Second run — I'll just recreate everything" | Re-run must be a no-op. Detect, report ✅, change nothing. |

## Red flags — STOP and correct
- Overwriting a file you did not just create.
- A `.coderabbit.yaml`, config, or committed file containing a real token/URL/workspace.
- Reporting "OpenSpec validates" (or any ✅) without running the check.
- Enabling branch protection without the human.
- A second run that produces a diff.
- Inventing a value for Honcho (URL/key/workspace) when none is configured.
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
