# openspec-conformance — reference

Heavy detail kept out of `SKILL.md`. Placeholders: `<repo>`, `<stack>`,
`<slug>`. Everything here was verified live against **openspec 1.6.0**.

---

## 1. House `openspec/config.yaml`

After `openspec init --tools none` in `plans/development`, edit
`plans/development/openspec/config.yaml`. The store schema stays `spec-driven`
(no fork). Fill `context:` from the detected stack and add the house `rules:`:

```yaml
schema: spec-driven

context: |
  Stack: <stack>
  Conventions: Conventional Commits, no AI attribution. Cross-review by a
  different-vendor agent before human review. Plans live under plans/.

rules:
  proposal:
    - Include a "## Rollback Plan" section — how to revert (flag, migration, redeploy).
  specs:
    - Every requirement uses SHALL/MUST and at least one "#### Scenario:" (WHEN/THEN).
  tasks:
    - Each "## <n>." phase ends with an explicit validation gate whose final task
      names the spec scenario that proves the phase (that scenario is the
      openspec-validate-enforced gate).
```

**These `rules:` are AI-authoring guidance** — OpenSpec injects them into
`openspec instructions`, it does **not** enforce them at `validate` time. The
only structurally-enforced rule is the specs one (scenarios), because that is
what `openspec validate` checks. Keep the tasks/proposal rules anyway: they
steer the authoring agent, and the enforced subset backstops the specs.

### The tasks.md per-phase gate convention

Write each phase so its final task is the gate, and the gate names the scenario:

```markdown
## 1. Widget primitive
- [ ] 1.1 Add the declarative widget config type
- [ ] 1.2 Implement render-from-config
- [ ] 1.3 Validation gate: `openspec validate <slug> --store <repo>` green AND
      scenario "Render from config" exercised by a test
```

The enforceable half — the scenario existing on the requirement — is what
`openspec validate` fails on when absent (see the proof below).

---

## 2. `/opsx:*` slash commands — per-tool store resolution (verified)

buhhdy drives OpenSpec through the **raw CLI** with `--store <repo>`, so the
slash commands are not on its critical path and repo-kickstart installs
`--tools none` by default (minimal footprint — one `openspec/config.yaml`, no
generated tool dirs to commit).

Teams that want `/opsx:propose|apply|archive` opt in with
`openspec init --tools claude,codex,gemini,opencode` (run inside
`plans/development`). **Verified for all four tools:** every generated command
(`.claude/commands/opsx/*.md`, `.codex/skills/*`, `.gemini/commands/opsx/*.toml`,
`.opencode/commands/opsx-*.md`) carries an identical **"Store selection"** block:

> If the user names a store or the work lives in one, run `openspec store list
> --json` … then pass `--store <id>` on the commands that read or write specs
> and changes (`new change`, `status`, `instructions`, `list`, `show`,
> `validate`, `archive`, `doctor`, `context`).

No tool hardcodes the default root — all resolve the store via `--store`, so no
`openspec update` patch and no Path-3 fallback is needed for any surface.

**Location caveat:** those tool dirs land **under `plans/development/`** (where
init runs), not at the repo root, so Claude Code / etc. at the repo root won't
auto-discover them. To use `/opsx:*`, work from `plans/development`, or copy the
one relevant `.<tool>/` dir up to the repo root (the command files are
store-agnostic, so relocating them is safe). This is why the raw CLI is the
default programmatic path.

---

## 3. End-to-end proof commands (rerun to reproduce the PR evidence)

```bash
# 1. layout + store
mkdir -p plans/development plans/architecture
( cd plans/development && openspec init --tools none )
openspec store register plans/development --id <repo> --yes

# 2. propose (buhhdy Workflow 1 step 1 uses this; artifacts authored in steps 1-8)
openspec new change <slug> --store <repo> --description "..."
#   author proposal.md / specs/<cap>/spec.md / design.md / tasks.md in
#   plans/development/openspec/changes/<slug>/

# 3. schema gate (Workflow 1 step 5a) — PASS when every requirement has a scenario
openspec validate <slug> --store <repo>

#   FAILING FIXTURE (criterion 2): delete a requirement's "#### Scenario:" block →
#   openspec validate exits 1: '... must include at least one scenario'

# 4. simulate apply, then archive (pr-shepherd close-out)
openspec archive <slug> --store <repo> --yes
#   → moves to openspec/changes/archive/<date>-<slug>/, promotes specs to openspec/specs/

# 5. promote the ADR + update the index (criterion 3)
node "${CLAUDE_PLUGIN_ROOT}/skills/openspec-conformance/promote-adr.ts" \
  plans <date>-<slug> --change-url <url>
```

---

## 4. Idempotency detection (for repo-kickstart's "already conforming" check)

| Item | Present-and-conforming test |
|------|-----------------------------|
| store root | `plans/development/openspec/config.yaml` exists |
| store id stable | `plans/development/.openspec-store/store.yaml` has `id: <repo>` |
| machine registration | `openspec store list --json` includes `<repo>` (else run `register` — it no-ops if already there) |
| store health | `openspec store doctor <repo>` → "Issues: none" |
| ADR home | `plans/architecture/` exists |
| product home | `plans/product/README.md` exists — the README, not just the directory. `repo-bootstrap` requires each plans subtree to carry its own README, and a bare directory passes a test for the tree while failing the requirement it stands for (content stays optional; inception is opt-in) |

Re-running `openspec init` and `openspec store register` are both safe (init
reports structure exists; register reports "already registered"). A second
kickstart run must produce no diff.

---

## 5. Future extraction path (keep in huhhb for now)

The mechanism is intentionally portable: nothing here is huhhb-specific except
the `${CLAUDE_PLUGIN_ROOT}` path to `promote-adr.ts`. If OpenSpec later grows a
proper store-config key, or if artifact **renaming** to house names is ever
wanted, fork the schema then (`openspec schema fork spec-driven uhstray`) and
publish it as a standalone `uhstray-io/openspec-uhstray` community schema. Until
there's a renaming need, the store + promotion pattern is the whole mechanism —
do not fork the schema for layout (it provably cannot relocate the root).
