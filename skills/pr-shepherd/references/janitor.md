# Branch janitor script

Run once per pr-shepherd pass. Confined to the orchestrator's own branch
prefix — buhhdy's is `buhhdy/*`; substitute your agent's prefix in BOTH
the `for-each-ref` pattern and the `case` guard, never a bare
`refs/heads/`. Deletes only branches that are BOTH >90 days inactive AND
already merged into the default branch; everything else is reported, not
deleted.

```bash
# ponytail: git for-each-ref over refs/heads/buhhdy/ can only ever yield
# buhhdy/* branches — non-buhhdy branches are unreachable by construction.
cutoff=$(( $(date +%s) - 90*24*3600 ))
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
default=${default:-main}
git for-each-ref --format='%(refname:short) %(committerdate:unix)' refs/heads/buhhdy/ |
while read -r branch ts; do
  case "$branch" in buhhdy/*) ;; *) continue ;; esac       # re-assert namespace
  [ "$ts" -lt "$cutoff" ] || continue                      # keep if <90d inactive
  if git merge-base --is-ancestor "$branch" "origin/$default"; then
    git branch -D "$branch"                                # merged → safe to delete
    echo "janitored $branch (merged, last commit $(( ($(date +%s) - ts) / 86400 ))d ago)"
  else
    echo "SKIP $branch — >90d but NOT merged into $default; reporting, not deleting"
  fi
done
```

Log every deletion (branch + age) to repo-memory via the `repo-memory`
skill's save flow.
