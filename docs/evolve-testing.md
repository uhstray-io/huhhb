# evolve — test plan & acceptance criteria

Run everything: `python3 tests/test_evolve.py` (offline suite, stdlib only) —
then, once a Honcho instance is configured, `honcho_client.py smoke` and
`python3 scripts/evolve/evals.py` — now a 25-scenario catalog (S01-S25), documented in `docs/evolve-scenarios.md`; offline scenarios run free in local mode, `--mode honcho --runs 3` for the §7 deriver bar.

Legend: **auto** = asserted by `tests/test_evolve.py`; **live** = needs a
configured Honcho (deriver running); **manual** = human procedure.

## Criteria matrix

| ID | Criterion (source) | How verified | Mode |
|---|---|---|---|
| C-01 | Unconfigured machine: every evolve hook exits 0 silently, no state created — huhhb behaves as 0.4.7 (Phase 4 accept, D-inert) | `InertTests` — capture + inject hooks on clean env, assert no output, no dirs, <1s | auto |
| C-02 | Config chain: env > `~/.config/huhhb/evolve.json` > none (D3) | `ConfigTests` — file-only, env-overrides-file, source labels | auto |
| C-03 | Stable pseudonymous profile id across runs | `ConfigTests` | auto |
| C-04 | Detectors capture: stated preference, explicit "remember", correction of agent behavior, skill-usage w/ partial outcome inside 3-turn window, install-fix for zsh/bash/dash formats (§4.2) | `DetectorTests` | auto |
| C-05 | Anti-capture: unresolved failures emit nothing; negative-capability phrasing dropped unless fix-phrased; benign "don't worry" not a correction (§4.2 non-negotiable) | `DetectorTests` | auto |
| C-06 | Sanitizer: system-reminder blocks stripped, harness command wrappers skipped, secrets redacted (§4.2) | `DetectorTests` | auto |
| C-07 | Stop-hook payload → spool file; repeated Stop firings are incremental (cursor), appended transcript digests only new lines | `DigestCliTests` | auto |
| C-08 | Malformed stdin / missing transcript: digest exits 0, no crash | `DigestCliTests` | auto |
| C-09 | Capture hook <1s with network blackholed; no stdout; spool written; flusher detached (Phase 1 accept, §9 CI check) | `CaptureHookTests` — HONCHO_URL to refused port | auto |
| C-10 | Flush is at-least-once: unreachable Honcho keeps spool + logs; corrupt spool renamed .bad; missing honcho-ai leaves spool intact; lock released | `FlushTests` | auto |
| C-11 | Inject hook <1s offline, valid SessionStart JSON contract, pending-proposal nudge with count, unicode-safe (Phase 2 accept) | `InjectHookTests` | auto |
| C-12 | Overlay lifecycle: `-local` suffix enforced, no duplicate scaffold, patch bumps semver + provenance(version←sessions+signal), confidence = min(runs/10,1)×success_rate (10/10→1.0, 1/1→0.1, 5 successes in 10 runs→0.5), status new→validated→active, pinned never archived, archive→`_archive/` never delete (Phase 3 accept, D7, D14) | `OverlayTests` | auto |
| C-13 | Headless write confinement: `propose` validates kind + required fields and writes only under pending/; `apply-pending` replays and removes; repo-memory proposals refuse CLI apply | `OverlayTests` | auto |
| C-14 | Repo conventions: marketplace/plugin versions match & bumped, all skill paths exist, `.mcp.json` mirrors plugin.json, evolve skill frontmatter is name+description only, Stop/SessionStart hooks registered with guard pattern + timeout 5, guard exits 0 when script missing | `ManifestTests` | auto |
| C-15 | No AGPL code vendored — repo imports external honcho-ai only (D13) | `ManifestTests` — no honcho source in tree | auto |
| C-16 | Every command referenced by the three SKILL.md bodies exists and parses | `SkillContractTests` | auto |
| C-17 | Smoke: 6-step round trip incl. seeded failure-mode grounding in `peer.chat` (Phase 0 accept) | `honcho_client.py smoke` | live |
| C-18 | E1 cold preference: session A statement → user-peer conclusion + session B injected context contains it (Phase 2 accept) | `evals.py --only s01` | live |
| C-19 | E2 skill experience: correction after `writing-plans` → `[skill-usage] outcome=partial` + `[correction]`; review proposes overlay patch (never hub skill) | `evals.py --only s02 --with-claude` | live |
| C-20 | E3 anti-capture: command-not-found→install session yields fix obs, zero negative-capability, review says nothing-to-save | `evals.py --only s03` | live |
| C-21 | E4 routing: "we decided repo uses uv" → review routes to repo-memory, not overlay/conclusion | `evals.py --only s04 --with-claude` | live |
| C-22 | Eval pass bar: 3 runs; artifact assertions 3/3, phrasing-sensitive 2/3 (§7) | `evals.py --mode honcho --runs 3` (offline set: local mode, deterministic) | live |
| C-23 | Skill quality: descriptions trigger correctly, no shadowing between evolve/evolve-review/evolve-status or existing memory skills (repo quality bar) | skill-reviewer agent pass | manual |
| C-24 | Two-session loop demo recorded in docs (Phase 4 accept) | follow docs/evolve.md after configuring | manual |
| C-25 | Local install test before PR (team practice) | `claude plugin marketplace add <local path>` + invoke each skill once | manual |

## Behavior scenarios (what "works as expected" means)

1. **Fresh machine, never configured** → zero behavior change, zero files.
2. **Configured, Honcho down** → sessions still fast; observations queue in
   spool; `/evolve-status` names the failure; next successful flush delivers.
3. **User states a preference in session A** → session B starts with it
   injected, before any user turn.
4. **User corrects a skill's output** → next `/evolve-review` proposes an
   overlay patch (diff shown), never edits the hub skill.
5. **A tool was missing and got installed** → memory contains the install
   fix; nowhere does "X is broken / not found" persist.
6. **Headless review runs overnight** → only `pending/*.json` appears; next
   SessionStart nudges; nothing was applied without approval.
7. **An overlay works 10 times** → confidence reads 1.0/active; one that
   never runs stays 0.0/new and recall flags it as unverified.
