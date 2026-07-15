# Fleet conformance audit — uhstray-io (2026-07-15)

Fleet-level complement to `repo-kickstart` (which fixes one repo at a time):
this **measures**; the retrofit **fixes**. **Read-only** — no repo settings or
contents were modified. Produced by the auditor in this session (gh GraphQL +
REST sweep); the checks are mechanical and deterministic (a re-run reproduces
this matrix exactly).

**Scope (human-confirmed):** 29 active non-fork repos fully audited · 9 forks
report-only (conventions n/a) · 15 excluded (org-meta `.github`/`.github-private`,
`dev-test`, and dormant non-forks last pushed ≤2024).

**Companion deliverables:**
- Settings remediation (human-run only): [`2026-07-15-remediation.sh`](2026-07-15-remediation.sh) — idempotent, dry-run with `ECHO_ONLY=1`.
- Retrofit worklist: one `conventions-retrofit` issue per audited non-fork repo (29), for the retrofit task to consume.
- Registration records: appended to [`buhhdy/memory/repos.md`](../../../buhhdy/memory/repos.md).

Read-only audit. Cells: ✓ pass · ✗ fail · – n/a · DIV divergent CLAUDE.md · ptr pointer · ⚠ present-but-weak.
Protection = classic branch protection on the default branch — the precondition pr-shepherd checks (via `gh api …/branches/<branch>/protection`) before it will operate. Org-level rulesets are not readable without `admin:org` scope; repo-level rulesets were empty everywhere.

**Verdict counts:** fork (report-only): 9 · kickstart + settings needed: 29

| repo | type | prot | rev≥1 | dism | chk:CI | chk:CR | admin | noFP | noDel | autoDelOff | README | AGENTS | KICK | ARCH | CLAUDE | plan | archdir | openspec | memory | CR-cfg | CI-wf | secret | depbot | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| agent-cloud | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✗ | ✓ | ptr | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | enabled | ✓ | kickstart + settings needed |
| as-I-go | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| autobox | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| blog | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| caddy | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| data-warehouse | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| devlog | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| doku | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| huhhb | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | DIV | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | disabled | ✓ | kickstart + settings needed |
| infra-automation | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| loom | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| nerdwa.rs | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| o11y | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| open-k8s | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| openbao | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| pyrizon | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✓ | kickstart + settings needed |
| PyStockBot | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| scientific-business | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| site-config | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| skynet | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✓ | ✓ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | kickstart + settings needed |
| stonks | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| uhstray.io | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| weft | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✗ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| WisAI | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| WisBot | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✓ | ✗ | DIV | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | disabled | ✓ | kickstart + settings needed |
| workstations | pub | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✓ | kickstart + settings needed |
| xlblueprint.com | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | kickstart + settings needed |
| zerds | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✓ | ✗ | DIV | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | disabled | ✗ | kickstart + settings needed |
| zerds-website | priv | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✓ | ✗ | DIV | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | disabled | ✗ | kickstart + settings needed |
| cudf | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |
| NemoClaw | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✗ | ✗ | DIV | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | disabled | ✗ | fork (report-only) |
| omnigent | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |
| openstack-ansible | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✗ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | fork (report-only) |
| opentelemetry-demo | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |
| rcon-cli | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |
| smartcore | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |
| smartcore-jupyter | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | disabled | ✗ | fork (report-only) |
| traefik-helm-chart | fork | ✗ | – | – | – | – | – | – | – | ✓ | ✓ | ✗ | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | disabled | ✗ | fork (report-only) |

## Fleet-wide observations

- **No repo has branch protection** — every audited repo fails pr-shepherd's hard precondition; buhhdy could merge without a human anywhere. This is the top remediation priority (settings script).
- `delete_branch_on_merge` is **off** on every repo — GitHub won't pre-empt the 90-day janitor.
- Conventions: only `huhhb` is fully conforming (9/9). 29 audited repos need a conventions retrofit (repo-kickstart).
- Divergent `CLAUDE.md` (full file, not an AGENTS.md pointer) is a recurring finding, including huhhb itself.
