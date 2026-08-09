# inception-scaffold Specification

## Purpose
Defines what a repository must already have in place for a product-inception
run to write its artifacts somewhere legitimate, rather than inventing a home
for them mid-run.
## Requirements
### Requirement: repo-kickstart seeds plans/product/
`repo-kickstart` SHALL add `plans/product/` (with a one-paragraph README
saying what belongs there) to the conforming tree it seeds, following its
golden rule — detect before write, idempotent, never overwriting existing
content — and SHALL add one row to its verification checklist. Inception
setup SHALL NOT be mandatory for adoption: an adopted repo without
`plans/product/` content is still fully conforming.

#### Scenario: Fresh adoption seeds the directory
- **WHEN** repo-kickstart runs on a repo without `plans/product/`
- **THEN** `plans/product/README.md` is created and the checklist reports it

#### Scenario: Re-run is a no-op
- **WHEN** repo-kickstart runs again on a repo where `plans/product/README.md` exists
- **THEN** nothing is rewritten and the checklist row reports already-conforming

