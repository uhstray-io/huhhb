#!/usr/bin/env bash
# Fleet settings remediation — uhstray-io (2026-07-15). HUMAN-RUN ONLY.
# buhhdy never runs this: it modifies access controls / branch protection.
# Idempotent: PUT replaces the branch-protection object; re-running is safe.
# Dry-run (prints the resolved commands, executes nothing):  ECHO_ONLY=1 ./remediation.sh
# Requires: gh auth with admin on each repo. Continues past a failing repo
# and prints a summary of failures at the end.
set -uo pipefail
OWNER=uhstray-io
failed=()
PROTECTION_BODY='{"required_status_checks": null, "enforce_admins": true, "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true}, "restrictions": null, "allow_force_pushes": false, "allow_deletions": false}'

# Enable branch protection: >=1 review, dismiss stale, enforce admins, no force-push/delete.
# TODO per repo: add required_status_checks contexts (CI job name + "CodeRabbit") once CI exists.
protect_repo() {
  local repo="$1" branch="$2"
  local path="repos/$OWNER/$repo/branches/$branch/protection"
  if [ "${ECHO_ONLY:-0}" = "1" ]; then
    printf 'gh api -X PUT %s --input - <<JSON\n%s\nJSON\n\n' "$path" "$PROTECTION_BODY"
    return 0
  fi
  if printf '%s\n' "$PROTECTION_BODY" | gh api -X PUT "$path" --input - >/dev/null; then
    echo "protected: $repo ($branch)"
  else
    echo "FAILED (protection): $repo ($branch)"; failed+=("$repo")
  fi
}
nodelete_repo() {
  local repo="$1"
  if [ "${ECHO_ONLY:-0}" = "1" ]; then printf 'gh repo edit %s/%s --delete-branch-on-merge=false\n\n' "$OWNER" "$repo"; return 0; fi
  if gh repo edit "$OWNER/$repo" --delete-branch-on-merge=false; then echo "delete-branch-off: $repo"; else echo "FAILED (nodelete): $repo"; failed+=("$repo"); fi
}

# agent-cloud: kickstart + settings needed
protect_repo agent-cloud main
# as-I-go: kickstart + settings needed
protect_repo as-I-go main
# autobox: kickstart + settings needed
protect_repo autobox main
# blog: kickstart + settings needed
protect_repo blog main
# caddy: kickstart + settings needed
protect_repo caddy main
# data-warehouse: kickstart + settings needed
protect_repo data-warehouse main
# devlog: kickstart + settings needed
protect_repo devlog main
# doku: kickstart + settings needed
protect_repo doku main
# huhhb: kickstart + settings needed
protect_repo huhhb main
# infra-automation: kickstart + settings needed
protect_repo infra-automation main
# loom: kickstart + settings needed
protect_repo loom main
# nerdwa.rs: kickstart + settings needed
protect_repo nerdwa.rs main
# o11y: kickstart + settings needed
protect_repo o11y main
# open-k8s: kickstart + settings needed
protect_repo open-k8s main
# openbao: kickstart + settings needed
protect_repo openbao main
# pyrizon: kickstart + settings needed
protect_repo pyrizon main
# PyStockBot: kickstart + settings needed
protect_repo PyStockBot main
# scientific-business: kickstart + settings needed
protect_repo scientific-business main
# site-config: kickstart + settings needed
protect_repo site-config main
# skynet: kickstart + settings needed
protect_repo skynet main
# stonks: kickstart + settings needed
protect_repo stonks main
# uhstray.io: kickstart + settings needed
protect_repo uhstray.io main
# weft: kickstart + settings needed
protect_repo weft main
# WisAI: kickstart + settings needed
protect_repo WisAI main
# WisBot: kickstart + settings needed
protect_repo WisBot main
# workstations: kickstart + settings needed
protect_repo workstations main
# xlblueprint.com: kickstart + settings needed
protect_repo xlblueprint.com main
# zerds: kickstart + settings needed
protect_repo zerds main
# zerds-website: kickstart + settings needed
protect_repo zerds-website main

# ---- summary ----
if [ "${ECHO_ONLY:-0}" != "1" ]; then
  if [ "${#failed[@]}" -eq 0 ]; then
    echo "done: all repos remediated"
  else
    echo "done with ${#failed[@]} failure(s): ${failed[*]}"; exit 1
  fi
fi
