#!/usr/bin/env sh
# huhhb PreToolUse (Bash) hook — no merge while review findings are unanswered.
#
# Denies `gh pr merge` while the PR has an unresolved review thread whose last
# comment is not by the merging user, i.e. a finding nobody has fixed-and-resolved
# or replied to. The deny reason (shown to Claude) names the PR and the count;
# re-running that merge with REVIEW_ANSWERED=1 directly in front of its gh call
# lets it through. Guard for docs/MISTAKES.md entry 2.1.
#
# The PR is the first non-flag argument (number, …/pull/N URL, or branch, resolved
# with `gh pr view`), else the current branch's PR; -R/--repo picks the repository.
# Every `gh pr merge` in the command is checked. One GraphQL query per merge.
# Fails open: if gh cannot answer (offline, no PR, no auth) the merge proceeds.
# The repo comes from -R, else from the `cd`s before that merge replayed from the session cwd.
# ponytail: first 100 threads; `cd` via variables or pushd is not followed; a quoted
# selector ('#62') or a glued flag (-Ro/r) fails open; a line starting `gh pr merge`
# in a heredoc also triggers.

payload=$(cat)

start='("command"[[:space:]]*:[[:space:]]*"|[;&|`]|\$\()[[:space:]]*'
envs='([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
flat=$(printf '%s' "$payload" | sed -e 's/\\\\\\n/ /g' -e 's/\\n/;/g')
segs=$(printf '%s' "$flat" | grep -Eo "${start}${envs}gh[[:space:]]+pr[[:space:]]+merge([[:space:]][^;&|]*)?" 2>/dev/null)
[ -n "$segs" ] || exit 0

cwd=$(printf '%s' "$payload" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[ -n "$cwd" ] && cd "$cwd" 2>/dev/null

# Prints the count of unanswered threads on PR $1 in repo $2 (owner/name, or empty for the cwd repo).
unanswered() {
  if [ -n "$2" ]; then set -- "$1" "owner=${2%%/*}" "name=${2#*/}"; else set -- "$1" 'owner={owner}' 'name={repo}'; fi
  gh api graphql -F "$2" -F "$3" -F n="$1" -f query='
query($owner: String!, $name: String!, $n: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) { pullRequest(number: $n) {
    reviewThreads(first: 100) { nodes { isResolved comments(last: 1) { nodes { author { login } } } } }
  } }
}' --jq '.data.viewer.login as $me | [.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved | not) | select(.comments.nodes[0].author.login != $me)] | length' 2>/dev/null
}

set -f
nl='
'
IFS=$nl
for seg in $segs; do
  pre=${seg%%gh[[:space:]]*}
  case "$pre" in REVIEW_ANSWERED=1' '*|*[!A-Za-z0-9_]REVIEW_ANSWERED=1' '*) continue ;; esac

  # The merge runs wherever the `cd`s before it left the shell: replay them, in order, from the cwd.
  [ -n "$cwd" ] && cd "$cwd" 2>/dev/null
  before=${flat%%"$seg"*}
  dirs=$(printf '%s' "$before" | grep -Eo '(^|[;&|(][[:space:]]*|"[[:space:]]*:[[:space:]]*")cd[[:space:]]+[^;&|]+' \
    | sed -E -e 's/^([;&|(][[:space:]]*|"[[:space:]]*:[[:space:]]*")?cd[[:space:]]+//' -e 's/[[:space:]]+$//' \
      -e "s/^'(.*)'$/\\1/" -e 's/^\\"(.*)\\"$/\\1/')
  moved=1
  for dir in $dirs; do
    case "$dir" in '~'*) dir=$HOME${dir#\~} ;; -) continue ;; esac
    cd "$dir" 2>/dev/null || { moved=0; break; }
  done
  [ "$moved" = 1 ] || continue

  # Arguments after `merge`, up to the end of the command string (the first unescaped quote);
  # quoted values then become Q, double-quoted first so an apostrophe inside one is harmless.
  args=$(printf '%s' "${seg#*[[:space:]]merge}" | sed -E -e 's/^(([^"\\]|\\.)*)".*/\1/' \
    -e 's/\\"[^"]*\\"/Q/g' -e "s/'[^']*'/Q/g")
  sel=''; repo=''; want=''
  IFS=' '
  for w in $args; do
    if [ -n "$want" ]; then [ "$want" = repo ] && repo=$w; want=''; continue; fi
    case "$w" in
      -R|--repo) want=repo ;;
      --repo=*) repo=${w#--repo=} ;;
      -b|--body|-F|--body-file|-t|--subject|-A|--author-email|--match-head-commit) want=skip ;;
      -*) ;;
      *) [ -z "$sel" ] && sel=$w ;;
    esac
  done
  IFS=$nl

  case "$sel" in
    *[!0-9]*/pull/[0-9]*)                    # a PR URL names its own repository
      n=${sel##*/pull/}; n=${n%%[!0-9]*}
      [ -n "$repo" ] || { u=${sel%%/pull/*}; repo=${u#*://*/}; } ;;
    *[!0-9]*|'')                             # a branch, or nothing: ask gh (-R as two arguments)
      if [ -n "$repo" ]; then set -- -R "$repo"; else set --; fi
      if [ -n "$sel" ]; then set -- "$sel" "$@"; fi
      n=$(gh pr view "$@" --json number -q .number 2>/dev/null) ;;
    *) n=$sel ;;
  esac
  case "$n" in ''|*[!0-9]*) continue ;; esac

  open=$(unanswered "$n" "$repo")
  case "$open" in ''|*[!0-9]*|0) continue ;; esac

  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"pr-merge-guard: PR #%s has %s unresolved review thread(s) whose last comment is not yours. Fix each finding and push, or reply on its thread with the reason it is not changed, then merge again. If every finding is already answered elsewhere, re-run the merge with REVIEW_ANSWERED=1 directly in front of that gh call."}}\n' "$n" "$open"
  exit 0
done
exit 0
