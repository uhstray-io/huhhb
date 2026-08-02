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
BACKUP_DIR="$HOME/.cache/memory-init/backups/$BANK_ID"   # snapshots for every config write
mkdir -p "$BACKUP_DIR"
```

`BANK_ID` is a basename, so sibling checkouts with the same directory name map
to the same bank — step 4 checks ownership before writing to one that exists.

The code-graph store derives its own project name from the full path (leading
`/` dropped, `/` → `-`). That is separate and is not the bank id.

Confirm `$REPO_ROOT` is inside `$CBM_ALLOWED_ROOT` — **fail closed**, and
compare canonical paths. Do not rely on the indexer refusing later: an unset
variable means containment is not configured at all, and a naive string prefix
lets a sibling like `…/GitHubOutside` through.

```bash
: "${CBM_ALLOWED_ROOT:?unset — containment is not configured; stop here}"
ROOT_C=$(cd "$CBM_ALLOWED_ROOT" 2>/dev/null && pwd -P) || { echo "allowed root does not exist"; exit 1; }
REPO_C=$(cd "$REPO_ROOT" && pwd -P)          # pwd -P resolves symlinks and ../
case "$REPO_C/" in
  "$ROOT_C"/*) ;;                             # trailing slash defeats prefix siblings
  *) echo "REFUSE: $REPO_C is outside $ROOT_C"; exit 1 ;;
esac
```

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
files — and cover the variants, since `*.env` alone misses `.env.local` and
`id_rsa*` alone misses newer key types:

```gitignore
*.env
*.env.*
*credentials*.json
*secret*.json
*.pem
*.p12
*.pfx
*.key
id_rsa*
id_ed25519*
id_ecdsa*
!*.env.example      # negations must come AFTER the pattern that excluded them
!*.env.sample
!*.env.template
```

**Draw the line explicitly and say where you drew it:**
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

**Prove the check fires before believing a clean result.** `git check-ignore`
does *not* accept `--exclude-from`; passing it matches nothing and reports
every path as included, which reads exactly like "no problems found". Run one
path you *know* must be excluded and one you know must not; if the known-bad
path comes back clean, your detector is broken, not your patterns.

**Idempotency:** read the existing `.cbmignore` first and append only lines not
already present. Never rewrite it wholesale — the user may have added entries.
Preserve their ordering and comments.

**Snapshot before, diff after** — this is a config write like any other, and
the skill's rule 2 applies to it. Same for the `CLAUDE.md` block in step 6.

```bash
cp .cbmignore "$BACKUP_DIR/cbmignore.$(git rev-parse --short HEAD)" 2>/dev/null || true
# ... append the missing lines ...
git diff --no-index -- "$BACKUP_DIR/cbmignore.…" .cbmignore || true
```

Show the diff. If anything changed outside the lines you meant to add, stop.

## 2. Index, with the persistent artifact

```text
index_repository(repo_path="$REPO_ROOT", persistence=true)
```

Re-running is safe: the existing artifact is imported and indexing continues
incrementally. Report `nodes` and `edges`.

**If step 1 added or changed any entry, a plain re-index is not enough.**
`.cbmignore` gates what is indexed *next*; it does not retract what is already
in the graph. Verified: after adding a credentials path, the file and its
API-key node stayed queryable. The index response is not the signal you want:
a full rebuild does list its excluded dirs, but the incremental path retracts
nothing while reporting success, and node count drifts for unrelated reasons
because the artifact directory indexes itself. Newly-excluded content persists
silently, which matters most when the reason for excluding it was that it was
sensitive.

Force a clean rebuild whenever step 1 changed anything.

> **STOP — deleting an index is a destructive action.** Say what will be
> destroyed (project name, current node/edge count, whether an artifact is
> committed) and get an explicit go-ahead. Back the artifact up first; the
> graph is regenerable, but only if the rebuild actually succeeds.

```bash
mkdir -p "$BACKUP_DIR"
cp "$REPO_ROOT/.codebase-memory/graph.db.zst" "$BACKUP_DIR/" 2>/dev/null || true
```
```text
delete_project(project="<resolve from list_projects by root_path — never hardcode>")
```
```bash
rm -f "$REPO_ROOT/.codebase-memory/graph.db.zst"   # keep .gitattributes; see step 3
```

then index again, and **prove absence** rather than assuming it:

```text
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

Replace **only** the `graph.db.zst` rule. The file may carry other attributes
or comments, and `>` would silently destroy them:

```bash
F=.codebase-memory/.gitattributes
cp "$F" "$F.bak"
# rewrite just the graph.db.zst line; leave every other line untouched
awk '/^graph\.db\.zst[[:space:]]/ { print "graph.db.zst binary merge=ours"; next } { print }' \
  "$F.bak" > "$F"
grep -q '^graph\.db\.zst ' "$F" || printf 'graph.db.zst binary merge=ours\n' >> "$F"
diff "$F.bak" "$F" || true                               # show exactly what changed
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

**Every Hindsight call below uses `--fail-with-body --show-error`, not bare
`-s`.** Plain `curl -s` exits 0 on an HTTP 500, so a failed write reads as
success and the step continues on a bank that was never configured.

```bash
CURL="curl -sS --fail-with-body"
```

**Look before you PUT.** `bank_id` is the repo directory name, so two
checkouts named alike — `site-config` in two orgs, a fork beside its upstream —
resolve to the *same* bank and silently interleave their decisions. Nothing
rebuilds this store, so confirm ownership before writing:

```bash
$CURL "$HINDSIGHT_URL/v1/default/banks" | python3 -c "
import json,sys,os
b={x['bank_id']:x for x in json.load(sys.stdin)['banks']}.get(os.environ['BANK_ID'])
print('NEW BANK' if not b else f\"EXISTS: {b['fact_count']} facts — mission: {b['mission'][:120]}\")"
```

If it exists, read the mission and recall the charter. Does it describe *this*
repo? If it describes a different one, **stop** — you have a name collision,
and the fix (a disambiguated bank id) is the human's call, not a silent
overwrite. If it holds facts and does describe this repo, you are repairing,
not creating: keep the existing name and mission unless asked otherwise.

```bash
$CURL -X PUT "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"<Repo Name>","mission":"<one sentence: what this repo is for, and that this bank holds only decisions, rationale and outcomes for it>"}'
```

Set the extraction mode to **`verbatim`** — required, not optional. The default
`concise` mode silently discards rejected alternatives and root causes,
verified by feeding it a decision plus its abandoned alternative and watching
only the conclusion survive. That experiential content is the whole reason this
store exists.

```bash
$CURL -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' -d '{"retain_extraction_mode":"verbatim"}'
```

Verbatim stores what you send, unchanged — so it preserves rationale, and
equally preserves anything else you send, including code structure. **The
never-retain rules bind the writer, not the store.**

Then set the write guard. `retain_mission` is a separate field and must be set
on its own call — `mission` and `reflect_mission` are the **same underlying
field**, so writing one overwrites the other.

**Neither the mode nor the guard can be read back**: there is no per-bank GET
(it returns 405), and the bank list omits both fields. So a bank existing is
never evidence it is configured. **Re-apply both settings on every run** — the
PATCH is idempotent, which is what makes that safe — and confirm the mode
*behaviourally* by retaining a decision plus its rejected alternative and
checking the alternative survived. Do not write a step that claims to verify
by reading these fields; it cannot be done.

The guard is advisory regardless: on input that was *only* code structure, the
model ignored it and stored the whole call graph verbatim.

```bash
$CURL -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" \
  -H 'Content-Type: application/json' \
  -d '{"retain_mission":"Retain decisions, rationale, rejected alternatives, failures with their root cause, outcomes labelled worked/dead-end/corrected, constraints discovered the hard way, and stated preferences. Never extract or retain code structure: file paths, function or class names, signatures, call relationships, import graphs, dependency lists, whole file contents, or long diffs. Those are regenerable from source and go stale on the next commit."}'
```

If the API is unreachable, check the service status and its log, then stop and
report — do not skip the bank silently.

## 5. Seed a project charter

Check first, so a re-run does not retain a duplicate:

```bash
$CURL -X POST "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/recall" \
  -H 'Content-Type: application/json' -d '{"query":"project charter purpose constraints current state"}'
```

If nothing charter-like comes back, write one. Ground it in what you can
observe — README, ADRs, recent commit messages, open issues, the graph's
architecture view — and keep it to a short paragraph covering **what this repo
is for, its constraints, and its current state**.

**Use the blocking write, and check what came back.** The async `retain`
returns `{"status":"accepted","operation_id":…}` — a receipt, not a
confirmation; a failure after that point is silent and the charter is simply
gone. Call the MCP tool `sync_retain` with `bank_id` set to `$BANK_ID`, and
continue only when the response carries persisted ids:

```text
sync_retain(bank_id="<BANK_ID>",
            context="Project charter — purpose, constraints and current state.",
            content="<the charter paragraph>")
→ {"status":"completed","memory_ids":["…"]}     # anything else: stop and report
```

Then recall it once and confirm it comes back — a completed write plus a
successful recall is the round trip; either alone is not.

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
