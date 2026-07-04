#!/usr/bin/env sh
# huhhb evolve Stop hook — digest the session transcript, spool observations,
# detach the flusher. The hook JSON payload arrives on stdin and is passed
# straight through to digest.py.
#
# Hard rules (§9): no network in this hook — digest is local-only, and all
# Honcho traffic happens in the detached flusher after this script has exited.
# Inert unless evolve is configured: without HONCHO_* env or the config file,
# this exits 0 immediately and huhhb behaves as if evolve were not installed.

CONF="${XDG_CONFIG_HOME:-$HOME/.config}/huhhb/evolve.json"
if [ -z "$HONCHO_URL" ] && [ -z "$HONCHO_API_KEY" ] && [ -z "$EVOLVE_MODE" ] && [ ! -f "$CONF" ]; then
    exit 0
fi
command -v python3 >/dev/null 2>&1 || exit 0

EVOLVE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)/scripts/evolve"
[ -f "$EVOLVE_DIR/digest.py" ] || exit 0

python3 "$EVOLVE_DIR/digest.py" >/dev/null 2>&1

# fire-and-forget: an unreachable Honcho costs only spool depth, never latency
nohup python3 "$EVOLVE_DIR/flush.py" >/dev/null 2>&1 &

exit 0
