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
command -v node >/dev/null 2>&1 || exit 0

node - "$CTX" "$DATA/pending" <<'JS'
import { readFileSync, readdirSync } from "node:fs";
let ctx = "";
try { ctx = readFileSync(process.argv[2], "utf-8").trim(); } catch { process.exit(0); }
let pending = 0;
try { pending = readdirSync(process.argv[3]).filter(f => f.endsWith(".json")).length; } catch {}
if (pending) {
  ctx += `\n\n**${pending} evolve proposal(s) pending approval** — a headless ` +
         "review staged changes; run /evolve-review to inspect and approve them.";
}
if (ctx) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: "SessionStart", additionalContext: ctx } }));
}
JS

exit 0
