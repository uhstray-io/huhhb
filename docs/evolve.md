# evolve — self-learning skill suite

evolve makes huhhb sessions compound: what you correct once, the agent knows
next session. It is **off until configured** — on a machine with no Honcho
setup, huhhb behaves exactly as if evolve were not installed.

## How it works

```text
your session ──Stop hook──► digest (local) ──► spool ──► flusher ──► Honcho
                                                            │
next session ◄──SessionStart hook◄── injection.md (cache) ◄─┘
```

- A **Stop hook** digests each session into typed observations — preferences
  you stated, corrections you made, skills that were used, environment fixes.
  Digesting is local; nothing blocks on the network.
- [**Honcho**](https://honcho.dev)'s deriver turns those observations into
  conclusions ("prefers conventional commits, no emoji").
- A **SessionStart hook** injects a cached summary — the next session starts
  already knowing what the last one learned.
- **`/evolve-review`** is the learning pass: it turns repeated signal into
  *overlay skills* (`~/.claude/skills/<name>-local/`) — your personal learned
  layer. Hub skills are never edited; `claude plugin update` stays clean.
- **`/evolve-status`** shows loop health; **`/evolve`** documents how the
  agent reads and writes this memory.

## What it learns — and refuses to learn

Captured: durable preferences, corrections of agent behavior, which skills
were used and how they landed, environment problems *and their fixes*.

Refused (the anti-capture list): failures without fixes, "tool X is broken"
style capability claims, transient errors that resolved, one-off task
narratives. Secrets are redacted and harness-injected scaffolding is stripped
before anything is stored.

## Setup

Choose one:

**Local (no server — lightest)**: nothing to deploy, nothing to install
beyond huhhb itself. Observations land in a local journal; `/evolve-review`
does the deriving (Claude is the deriver) and maintains `conclusions.md`,
which feeds the injected context. Trade-offs: no background derivation
(conclusions form only when review runs), no semantic search, no dialectic
queries, single-machine memory.

```bash
python3 <plugin>/scripts/evolve/honcho_client.py init --local
```

**Self-hosted** (recommended for privacy at full capability): run the
[Honcho server](https://github.com/plastic-labs/honcho) — both the API *and*
the deriver worker (`python -m src.deriver`, needs LLM keys) — then:

```bash
uv pip install honcho-ai==2.2.0
python3 <plugin>/scripts/evolve/honcho_client.py init --url http://your-host:8000
python3 <plugin>/scripts/evolve/honcho_client.py smoke
```

**Managed** ([api.honcho.dev](https://honcho.dev)):

```bash
uv pip install honcho-ai==2.2.0
python3 <plugin>/scripts/evolve/honcho_client.py init --api-key <key>
python3 <plugin>/scripts/evolve/honcho_client.py smoke
```

**Skip**: do nothing. Every hook exits instantly; nothing is stored.

Config precedence: `HONCHO_URL` / `HONCHO_API_KEY` / `HONCHO_WORKSPACE` env
vars > `~/.config/huhhb/evolve.json` > unconfigured.

### Bootstrap from your history (optional)

A fresh install learns only going-forward. To seed it from your existing
Claude Code sessions, mine your transcript history through the same capture
pipeline (redaction, anti-capture, and the volume guardrail all apply — a
bulk/poisoned session is quarantined, never blindly trusted):

```bash
python3 <plugin>/scripts/evolve/digest.py --backfill --dry-run   # preview, writes nothing
python3 <plugin>/scripts/evolve/digest.py --backfill             # mine ~/.claude/projects/*/*.jsonl
python3 <plugin>/scripts/evolve/digest.py --backfill --limit=50  # bound to the 50 most-recent
```

Idempotent — re-running skips transcripts already processed. Afterward,
`/evolve-status` shows the journal (and any quarantined batches) and
`/evolve-review` distills it.

## Where your data lives

| What | Where |
|---|---|
| observations + conclusions | your Honcho workspace (your server, or your managed account); **local mode**: `journal.jsonl` + `conclusions.md` under `~/.local/share/huhhb/evolve/` |
| local spool/cache/journal/state | `~/.local/share/huhhb/evolve/` |
| learned overlay skills | `~/.claude/skills/*-local/` (archived, never deleted, to `_archive/`) |
| config | `~/.config/huhhb/evolve.json` |

Everything is pseudonymous (a random profile id, no account identity) and
device-local except the Honcho workspace you chose. Nothing is shared with
uhstray.io.

### Choosing honcho mode: what the managed service means for your data

Verified against honcho.dev, app.honcho.dev/privacy (eff. 2025-04-24), and
app.honcho.dev/tos as of 2026-07-06 — re-verify before relying on it:

- **Cost**: one-time $100 signup credit (no perpetual free tier), then
  usage-based — $2.00/1M tokens ingested; storage and retrieval free; chat
  reasoning $0.001–$0.50 per query by level. No published spend caps.
- **Data use**: no training of *public* models on your content without
  opt-in, but the policy permits non-public fine-tuning on de-identified
  data by default. On the managed platform the deriver runs on *their*
  models/keys; content transits their inference subprocessors (Groq,
  Anthropic, Google Cloud) and LLM-observability tooling (Langfuse).
- **Protections**: TLS + AES-256, default 90-day retention (configurable),
  hard-delete on workspace purge, logical workspace isolation. **Not** SOC 2
  / HIPAA certified (ToS says so explicitly); US-hosted only; no default SLA.
- **Keeping data local**: local mode (this suite's default) or self-hosting
  the AGPL server with your own LLM keys are the only fully-local options.
  Treat the managed service as fine for low-sensitivity telemetry, not for
  regulated or confidential content. The `honcho-ai` SDK we import is
  Apache-2.0; the server is AGPL-3.0 (never vendored — see CLAUDE.md).

## Purge

```bash
# 1. remove the Honcho workspace (self-host: via the API/DB; managed: dashboard)
# 2. remove all local state and config:
rm -rf ~/.local/share/huhhb/evolve ~/.config/huhhb/evolve.json
# 3. optionally remove the learned layer:
rm -rf ~/.claude/skills/*-local ~/.claude/skills/_archive
```

## Verifying the loop

`scripts/evolve/evals.py` runs the four loop-verification scenarios
(cold preference, skill experience, anti-capture, routing) against your
configured instance in an isolated workspace: `python3 evals.py --runs 3`.
