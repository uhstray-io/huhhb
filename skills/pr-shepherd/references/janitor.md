# Branch janitor script

Run once per pr-shepherd pass. Confined to the orchestrator's own branch
prefix via ONE validated variable — `ORCHESTRATOR_PREFIX` (buhhdy's is
`buhhdy`; never empty, never a bare `refs/heads/`). Fails CLOSED: if the
remote default branch cannot be resolved from `origin/HEAD`, nothing is
deleted. Deletes only branches that are BOTH >90 days inactive AND already
merged into the default branch — and deletes them atomically
(`git update-ref -d` with the inspected object id, so a branch replaced or
advanced between inspection and deletion survives). Success is logged only
when the deletion actually succeeded.

```bash
prefix="${ORCHESTRATOR_PREFIX:-buhhdy}"
case "$prefix" in ''|*/*|*' '*) echo "janitor: invalid prefix '$prefix' — aborting"; exit 1;; esac

# Fail closed: no resolvable default branch => no deletions at all.
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
if [ -z "$default" ]; then
  echo "janitor: cannot resolve origin/HEAD — set it (git remote set-head origin -a); skipping all deletions"
  exit 0
fi

cutoff=$(( $(date +%s) - 90*24*3600 ))
git for-each-ref --format='%(refname:short) %(objectname) %(committerdate:unix)' "refs/heads/$prefix/" |
while read -r branch oid ts; do
  case "$branch" in "$prefix"/*) ;; *) continue ;; esac     # re-assert namespace
  [ "$ts" -lt "$cutoff" ] || continue                       # keep if <90d inactive
  if git merge-base --is-ancestor "$oid" "origin/$default"; then
    # Atomic compare-and-delete: only removes the ref if it still points
    # at the inspected oid — a concurrent push survives.
    if git update-ref -d "refs/heads/$branch" "$oid"; then
      echo "janitored $branch (merged, last commit $(( ($(date +%s) - ts) / 86400 ))d ago)"
    else
      echo "SKIP $branch — moved since inspection; not deleted"
    fi
  else
    echo "SKIP $branch — >90d but NOT merged into $default; reporting, not deleting"
  fi
done
```

Log every successful deletion (branch + age) to repo-memory via the
`repo-memory` skill's save flow.
