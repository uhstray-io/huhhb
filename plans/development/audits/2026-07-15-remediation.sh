#!/usr/bin/env bash
# Fleet settings remediation — uhstray-io (2026-07-15). HUMAN-RUN ONLY.
# buhhdy never runs this: it modifies access controls / branch protection.
# Idempotent (PUT replaces the protection object) and dry-runnable:
#   ECHO_ONLY=1 ./remediation.sh   # print, don't execute
# Requires: gh auth with admin on each repo.
set -euo pipefail
run() { if [ "${ECHO_ONLY:-0}" = "1" ]; then printf "%s\n" "$*"; else eval "$*"; fi; }
OWNER=uhstray-io

# ---- agent-cloud (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/agent-cloud/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- as-I-go (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/as-I-go/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- autobox (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/autobox/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- blog (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/blog/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- caddy (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/caddy/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- data-warehouse (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/data-warehouse/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- devlog (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/devlog/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- doku (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/doku/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- huhhb (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/huhhb/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- infra-automation (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/infra-automation/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- loom (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/loom/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- nerdwa.rs (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/nerdwa.rs/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- o11y (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/o11y/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- open-k8s (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/open-k8s/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- openbao (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/openbao/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- pyrizon (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/pyrizon/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- PyStockBot (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/PyStockBot/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- scientific-business (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/scientific-business/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- site-config (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/site-config/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- skynet (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/skynet/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- stonks (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/stonks/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- uhstray.io (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/uhstray.io/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- weft (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/weft/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- WisAI (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/WisAI/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- WisBot (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/WisBot/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- workstations (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/workstations/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- xlblueprint.com (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/xlblueprint.com/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- zerds (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/zerds/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.

# ---- zerds-website (main) : verdict=kickstart + settings needed ----
# enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete
run 'gh api -X PUT repos/$OWNER/zerds-website/branches/main/protection --input - <<JSON
{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}
JSON'
# NOTE: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists on this repo.
