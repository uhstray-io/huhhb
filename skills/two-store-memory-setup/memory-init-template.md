---
description: Bootstrap the current repo into the two-store memory setup (code-graph index + experience-store bank). Idempotent.
---

<!-- Template shipped by huhhb's two-store-memory-setup skill (Phase 4).
     Install to ~/.claude/commands/memory-init.md ONLY if no command is
     already there. If one exists, read it, verify it covers all eight steps
     below, and keep it — never clobber a working command.
     Substitute the bracketed values for this machine; hardcode nothing. -->

Bootstrap the current repository into the two-store memory architecture.
**Every step is idempotent — running this twice must not duplicate banks,
ignore entries, gitattributes lines, charters or CLAUDE.md sections.**

Work through the steps in order. Report a short summary at the end: node and
edge counts, bank id, and what was skipped because it already existed.

## 0. Establish names

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)   # abort if this fails: not a git repo
BANK_ID=$(basename "$REPO_ROOT")             # bank id = repo directory name, verbatim
```

The code-graph store derives its own project name from the full path (leading
`/` dropped, `/` → `-`). That is separate and is not the bank id.

Confirm `$REPO_ROOT` is inside `$CBM_ALLOWED_ROOT`. If it is not, stop and say
so — `index_repository` will refuse the path anyway.

## 1. Write `.cbmignore` before indexing

Order matters: indexing first wastes work on vendored trees. Detect the stack
from marker files, then seed `.cbmignore` with matching entries (gitignore
syntax). The `.gitignore` hierarchy is already honoured, so `.cbmignore` is
only for things that are committed but still not worth indexing.

| Marker | Add |
| ------ | --- |
| always | `.worktrees/`, `**/testdata/`, `**/fixtures/`, `**/__snapshots__/`, `*.min.js`, `*.min.css`, `**/*.generated.*`, `**/*_pb2.py`, `**/*.pb.go` |
| `package.json` | `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `*.bundle.js` |
| `pyproject.toml`, `requirements.txt`, `setup.py` | `.venv/`, `venv/`, `env/`, `__pycache__/`, `*.egg-info/`, `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/` |
| `go.mod` | `vendor/`, `bin/` |
| `Cargo.toml` | `target/` |
| `*.csproj`, `*.sln` | `obj/`, `bin/` |
| `pom.xml`, `build.gradle` | `target/`, `build/`, `.gradle/` |
| `Gemfile` | `vendor/bundle/` |
| `*.tf` | `.terraform/`, `*.tfstate*` |

**Secrets pass.** The index stores no file contents, but snippet retrieval
reads from disk at query time using stored line numbers — so an indexed secret
file becomes a convenient credential reader for anything driving the MCP
server, including subagents. Exclude credential files, key material and env
files (`*.env`, `!*.env.example`, `*credentials*.json`, `*.pem`, `*.p12`,
`id_rsa*`). **Draw the line explicitly and say where you drew it:**
environment *data* — inventory, host lists, IP ranges — is often the most
structurally valuable content in a private repo and is not a secret. Exclude
key material, not documentation of the environment.

Validate the patterns before trusting them, using git as the reference engine:

```bash
git ls-files --cached --others --ignored --exclude-from=.cbmignore --directory
```

Accept when the output contains the intended exclusions and **nothing from
first-party source**. A too-broad pattern silently eating real code is the
other way this goes wrong.

**Idempotency:** read the existing `.cbmignore` first and append only lines not
already present. Never rewrite it wholesale — the user may have added entries.
Preserve their ordering and comments.

## 2. Index, with the persistent artifact

```
index_repository(repo_path="$REPO_ROOT", persistence=true)
```

Re-running is safe: the existing artifact is imported and indexing continues
incrementally. Report `nodes` and `edges`.

**If step 1 added or changed any entry, a plain re-index is not enough.**
`.cbmignore` gates what is indexed *next*; it does not retract what is already
in the graph. Verified: after adding a credentials path, the re-index reported
it as excluded while the file and its API-key node were still queryable.
Newly-excluded content persists silently — which matters most when the reason
for excluding it was that it was sensitive.

Force a clean rebuild whenever step 1 changed anything:

```
delete_project(project="<derived-project-name>")
```
```bash
rm -f "$REPO_ROOT/.codebase-memory/graph.db.zst"   # keep .gitattributes; see step 3
```

then index again, and **prove absence** rather than assuming it:

```
query_graph(query="MATCH (f:File) RETURN f.file_path")
```

Pair it with a control — the same query shape against a path you know is
indexed must return results — so an empty result cannot be confused with a
broken query or an empty graph.

## 3. Repair the artifact's `.gitattributes` — not optional

The tool auto-writes `$REPO_ROOT/.codebase-memory/.gitattributes` containing
`graph.db.zst merge=ours binary`. **That line does not work.** `binary` is a
git macro expanding to `-diff -merge -text`, and because it comes *after*
`merge=ours` it unsets it.

```bash
cd "$REPO_ROOT"
git check-attr merge -- .codebase-memory/graph.db.zst    # broken state: "merge: unset"
```

If it reports anything other than `merge: ours`, rewrite with the order
reversed so `merge=ours` survives:

```bash
printf '# Reordered so merge=ours survives the binary macro\ngraph.db.zst binary merge=ours\n' \
  > .codebase-memory/.gitattributes
git check-attr merge -- .codebase-memory/graph.db.zst    # must now print "merge: ours"
```

Do not proceed until it prints `merge: ours`. Two verified behaviours: the file
is written **only** when the tool first creates `.codebase-memory/` — deleting
it and re-indexing does not recreate it, leaving `merge: unspecified`, which is
quieter and worse than the broken version — and an existing file is **never
overwritten**, so a hand-corrected one survives every subsequent index. The
repair is therefore one-time per repo, but this step runs every time because
initial creation uses the broken order.

Then ensure `graph.db.zst`, `.gitattributes` and `artifact.json` are committed
(or at least not gitignored) — the point of the artifact is that teammates
bootstrap from it.

## 3a. ADR location — and do not use `manage_adr`

Ratified architectural decisions belong in committed files at
`docs/adr/NNN-title.md`. Create the directory **only if the repo actually has
decisions to record** — do not scaffold an empty one.

**Never write them with `manage_adr`.** Verified: an ADR written through it is
stored in the disposable index, is absent from the shareable artifact, and is
hard-deleted the next time the graph changes — adding one file was enough, and
the row count went to zero with no warning. There is no recovery. A committed
file does the same job and survives.

## 4. Create the bank

Idempotent by API design — `PUT` on an existing bank updates rather than
duplicating. Substitute the API base for this machine.

```bash
curl -s -X PUT "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"<Repo Name>","mission":"<one sentence: what this repo is for, and that this bank holds only decisions, rationale and outcomes for it>"}'
```

Set the extraction mode to **`verbatim`** — required, not optional. The default
`concise` mode silently discards rejected alternatives and root causes,
verified by feeding it a decision plus its abandoned alternative and watching
only the conclusion survive. That experiential content is the whole reason this
store exists.

```bash
curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' -d '{"retain_extraction_mode":"verbatim"}'
```

Verbatim stores what you send, unchanged — so it preserves rationale, and
equally preserves anything else you send, including code structure. **The
never-retain rules bind the writer, not the store.**

Then set the write guard. `retain_mission` is a separate field and must be set
on its own call — `mission` and `reflect_mission` are the **same underlying
field**, so writing one overwrites the other. Set it, then re-read all three.
Understand it is advisory: on input that was *only* code structure, the model
ignored it and stored the whole call graph verbatim.

```bash
curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' \
  -d '{"retain_mission":"Retain decisions, rationale, rejected alternatives, failures with their root cause, outcomes labelled worked/dead-end/corrected, constraints discovered the hard way, and stated preferences. Never extract or retain code structure: file paths, function or class names, signatures, call relationships, import graphs, dependency lists, whole file contents, or long diffs. Those are regenerable from source and go stale on the next commit."}'
```

If the API is unreachable, check the service status and its log, then stop and
report — do not skip the bank silently.

## 5. Seed a project charter

Check first, so a re-run does not retain a duplicate:

```bash
curl -s -X POST "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/recall" \
  -H 'Content-Type: application/json' -d '{"query":"project charter purpose constraints current state"}'
```

If nothing charter-like comes back, write one. Ground it in what you can
observe — README, ADRs, recent commit messages, open issues, the graph's
architecture view — and keep it to a short paragraph covering **what this repo
is for, its constraints, and its current state**. Use the blocking write path.

**The charter is prose about purpose, constraints and state — not an inventory
of the codebase.** If you find yourself listing directories, modules, function
names or dependencies, stop: that is the structure store's job, and retaining
it here is the one failure mode that breaks this architecture. Because the bank
is in verbatim mode nothing will strip structure out for you. A retain costs a
model call, so get it right in one pass.

Write it in the language a colleague would use, not the language the compiler
uses — that is also what makes the read-routing join work, since memories are
retrieved by domain concept and a charter in domain terms is findable from a
graph query that only yielded identifiers.

## 6. Append a project-scoped `CLAUDE.md` section

Point at the global policy rather than restating it:

```markdown
<!-- two-store-memory:start -->
## Memory

- Experience-store bank for this repo: `<BANK_ID>` — pass it as `bank_id` on
  retain, recall and reflect. The bank is in `verbatim` mode: what you send is
  stored unchanged, so keep code structure out of it yourself.
- Structural questions go to the code-graph store; this repo is indexed and has
  a committed artifact at `.codebase-memory/graph.db.zst`.
- Ratified ADRs live in committed files under `docs/adr/`. Do not use
  `manage_adr` — it stores them in the disposable index and any code change
  deletes them.
- Routing rules live in the global `CLAUDE.md` under "TWO-STORE MEMORY
  ROUTING". Do not restate them here.
<!-- two-store-memory:end -->
```

**Idempotency:** if the block already exists, replace it in place rather than
appending a second one. Leave the rest of the file untouched.

## 7. Report

State plainly: nodes and edges; whether `git check-attr` needed the step-3
repair; `.cbmignore` lines added vs. already present; bank id and whether it
was created or already existed; whether a charter was retained or one already
existed; whether the `CLAUDE.md` block was added or replaced.
