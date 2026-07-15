# subscriptions — tier and billing-shape records

Append-only. Observational only — see MEMORY.md
for the record contract. This file is the read-then-confirm source
for the Subscription Tier Interview: present the latest active record's
tiers and date, ask for confirmation, and write a fresh record only on
change.

- date: 2026-07-09
  kind: observation
  scope: all-providers
  statement: Subscription tiers are Claude Max (~$125/mo flat), Codex/ChatGPT standard team/business, and Gemini standard team/business (the same subscription that keeps legacy gemini CLI access working); OpenCode has no subscription and runs on metered OpenRouter credits.
  evidence: operator confirmation, 2026-07-09
  status: active

- date: 2026-07-08
  kind: observation
  scope: anthropic
  statement: claude-fable-5 sits outside the Claude Max subscription — separate ANTHROPIC_API_KEY, per-token billing ($10/$50 per MTok).
  evidence: direct operator statement plus Fable's own pricing docs
  status: active
