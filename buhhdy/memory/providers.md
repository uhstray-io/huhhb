# providers — calibration, drift, and verification records

Append-only. Observational only — see MEMORY.md
for the record contract and write discipline. Seeded 2026-07-14 by
migrating the dated operator notes embedded in `buhhdy/config.yaml`
(which keeps its copies during the transition; the calibration-refresh
skill owns removing them from config).

- date: 2026-06-30
  kind: calibration
  scope: openai
  statement: gpt-5, gpt-5-mini, and gpt-4.1-nano were superseded by gpt-5.5, gpt-5.4-mini, and gpt-5.4-nano; o3 and o4-mini are fully retired, as are all o-series and first-gen gpt-5 IDs.
  evidence: cross-vendor verified against OpenAI's own GPT-5.4 mini/nano announcement
  status: active

- date: 2026-06-30
  kind: calibration
  scope: anthropic
  statement: claude-sonnet-5 uses ~30% more tokens than the prior (Sonnet 4) tokenizer, which affects cost and context-fit when sizing tasks.
  evidence: 2026-06-30 calibration pass, cross-vendor verified
  status: active

- date: 2026-06-30
  kind: calibration
  scope: anthropic
  statement: claude-sonnet-5 performs near claude-opus-4-8 quality on coding/agentic-shaped work at a lower per-token price.
  evidence: Anthropic's own docs
  status: active

- date: 2026-06-30
  kind: calibration
  scope: gemini
  statement: Gemini's 2M-token context is Vertex AI enterprise only; the standard API caps at 1M.
  evidence: 2026-06-30 calibration pass, cross-vendor verified
  status: active

- date: 2026-06-30
  kind: calibration
  scope: gemini
  statement: gemini-2.5-pro/flash/flash-lite were superseded by gemini-3.1-pro-preview, gemini-3.5-flash, and gemini-3.1-flash-lite; 2.5-pro and 2.5-flash have a confirmed shutdown no earlier than 2026-10-16, 2.5-flash-lite's exact retirement status was disputed between the two sources, gemini-2.0-flash-lite was fully shut down 2026-06-01, and gemini-3.1-pro-preview is PREVIEW rather than GA.
  evidence: cross-vendor verified — codex and gemini itself, both citing Google's own docs
  status: active

- date: 2026-06-30
  kind: observation
  scope: gemini
  statement: Gemini became available again after the earlier headless-OAuth failure (exit code 41, FatalAuthenticationError) was resolved upstream.
  evidence: successful live review dispatch; superseded by the 2026-07-08 ACP-migration record below, after which fork-era exit-code semantics no longer apply
  status: superseded-by:2026-07-08

- date: 2026-07-01
  kind: observation
  scope: anthropic
  statement: claude-fable-5 reached GA as Anthropic's most capable widely-released model and was added as buhhdy's FRONTIER tier, claude_code only.
  evidence: direct operator confirmation, corroborated by Anthropic's own claude-api model catalog
  status: active

- date: 2026-07-07
  kind: observation
  scope: opencode
  statement: The opencode worker was added running openrouter/z-ai/glm-5.2 (harness opencode-native, opencode v1.17.15, openrouter auth); the model ID partitions on the first slash into providerID/modelID.
  evidence: verified against the installed runner source, a live boot, and the ID's presence in `opencode models`
  status: active

- date: 2026-07-08
  kind: calibration
  scope: opencode
  statement: GLM 5.2 performs just below gemini-3.1-pro-preview at a far lower per-token price; this ranking is not yet backed by observed dispatch history.
  evidence: operator calibration confirmation (operator-reported)
  status: active

- date: 2026-07-08
  kind: outcome
  scope: anthropic
  statement: The Claude Max flat-subscription window for claude-fable-5 ended 2026-07-07; from 2026-07-08 Fable requires a separate ANTHROPIC_API_KEY billed per-token ($10/$50 per MTok).
  evidence: direct operator statement plus Fable's own pricing docs
  status: active

- date: 2026-07-08
  kind: outcome
  scope: gemini
  statement: Gemini migrated to upstream omnigent's generic ACP harness with three tier-pinned gemini-* workers (the uhstray-io/omnigent fork and its custom harness are retired); fork-era exit-code semantics (41/42) no longer apply.
  evidence: omnigent-ai/omnigent PR #2152 verified merged; live boot of the ACP workers
  status: active

- date: 2026-07-09
  kind: observation
  scope: gemini
  statement: This deployment's Gemini access is a standard team/business Google subscription, not the consumer tier that mid-2026 reports describe losing legacy CLI access; worth re-verifying after any Google plan change since an auth/tier failure downs all three gemini-* workers at once.
  evidence: operator confirmation plus a live gemini-3.1-flash-lite round-trip (`gemini -m gemini-3.1-flash-lite -p`)
  status: active
