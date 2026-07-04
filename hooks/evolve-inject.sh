#!/usr/bin/env sh
# huhhb evolve SessionStart hook — inject the cached memory context.
#
# Zero network, zero Honcho calls (§9 hard rule): this only cats the cache
# file that the async flusher maintains, plus a one-line nudge when headless
# review proposals are waiting in pending/. Session N+1 learns from session N
# without the agent having to remember to look anything up (Law 3).
#
# No cache file -> exit 0 silently (unconfigured or nothing learned yet).

DATA="${XDG_DATA_HOME:-$HOME/.local/share}/huhhb/evolve"
CTX="$DATA/context/injection.md"
[ -f "$CTX" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

python3 - "$CTX" "$DATA/pending" <<'PY'
import json, os, sys
ctx = open(sys.argv[1], encoding="utf-8", errors="replace").read().strip()
pending_dir = sys.argv[2]
try:
    pending = len([f for f in os.listdir(pending_dir) if f.endswith(".json")])
except OSError:
    pending = 0
if pending:
    ctx += (f"\n\n**{pending} evolve proposal(s) pending approval** — a headless "
            "review staged changes; run /evolve-review to inspect and approve them.")
if ctx:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart", "additionalContext": ctx}}))
PY

exit 0
