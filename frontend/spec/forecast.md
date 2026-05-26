# AI Forecast  (route: `/forecast`)

## What it's for

Generate a Claude-powered market outlook covering all configured currency pairs across multiple timeframes. Useful for a daily/weekly briefing of where the market sits and what to watch.

## Layout

- **Header** — page title, "API configured" indicator, Settings button.
- **Generate Forecast** button (when no forecast is loaded).
- **Streaming response area** — appears after Generate is clicked.
- **Action bar** (after completion) — Regenerate / Chat about forecast / cached timestamp + "stale" badge.
- **Chat panel** — slide-in from right (same as `/review`).

## Controls & actions

- **Settings** — opens the AI provider dialog.
- **Generate Forecast** — fetches recent multi-timeframe data for every pair, builds a prompt, and streams Claude's analysis.
- **Stop** (during streaming) — aborts generation.
- **Regenerate** — clears the cached forecast and re-runs.
- **Chat about forecast** — opens chat panel with the forecast as context.
- **Floating chat button** — bottom-right, only shown after a forecast exists. Opens chat with forecast context preset.

## Workflows

**Daily briefing** — Open page, click Generate. Read the streamed analysis. If you want a follow-up ("which pair has the cleanest setup right now?"), click Chat about forecast.

**Refresh after a big move** — If the cached timestamp shows the "stale" badge (>10 min old) or is from yesterday, click Regenerate. The cache invalidates and the AI re-runs with fresh candles.

## Data shown

- **Streaming forecast** — Markdown-styled output (rendered via `StructuredResponse`); typically covers each pair's trend, key levels, and risk notes.
- **Cache timestamp + stale badge** — shows when the current forecast was generated; the yellow "stale" pill appears once it's >10 minutes old.

## Configuration

- Requires Claude API key or Ollama setup (see [README — AI Settings](./README.md#common-ai-settings)).
- "API Key Required" banner appears if not configured.

## Storage / persistence

- **Forecast cache** — stored in `localStorage` (Zustand `ai-store` review cache, key = `forecast`).
- **Chat histories** — in-memory per-context only.

## Limits / gotchas

- Pre-fetch step gathers data for all pairs across multiple timeframes — takes a few seconds before streaming starts.
- Cache "staleness" is purely a visual hint; old caches are not auto-deleted, click Regenerate when you want fresh output.
- Same browser-direct API caveat as `/review` — keys are sent from the browser; personal use only.
