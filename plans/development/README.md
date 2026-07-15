# plans/development

Implementation plans and the living index (`00-implementation-plan.md`).
This dir is the **OpenSpec store root** — `openspec/` lives here (registered as
store `huhhb`), so active changes are `openspec/changes/<slug>/`.

From the repo root, OpenSpec commands need `--store huhhb` (root resolution only
walks ancestors). Example: `openspec validate --all --store huhhb`.
