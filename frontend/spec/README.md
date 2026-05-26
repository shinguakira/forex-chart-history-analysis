# Forex Chart History Analysis — User Manual

A personal-use forex charting & journaling app combining technical analysis tools with AI-assisted review, prediction, and trade-practice features.

This folder contains a per-page user manual. Each file describes what you can see, what controls do, typical workflows, and any limits to be aware of.

## Pages

| Page | Route | Summary |
|---|---|---|
| [Chart](./chart.md) | `/` and `/pair/$pairId` | Multi-window candlestick charts with indicators, trade overlays, and date navigation. |
| [Analysis](./analysis.md) | `/analysis` | Statistical breakdown of your trade history (win rate, drawdown, streaks, etc.). |
| [AI Review](./review.md) | `/review` | Claude-powered portfolio and per-trade reviews with follow-up chat. |
| [AI Forecast](./forecast.md) | `/forecast` | Claude-powered market outlook across all configured pairs. |
| [AI Predictions](./predictions.md) | `/predictions` | Generate, store, and validate AI-driven entry/SL/TP predictions. |
| [Backtest](./backtest.md) | `/backtest` | Run AI predictions across historical cutoff points and aggregate the result. |
| [Practice](./practice.md) | `/practice` | Replay / Quiz / Setup modes for building trading intuition on past charts. |
| [Notes](./notes.md) | `/notes` | Quick free-form notes saved to disk. |
| [Learning](./learning.md) | `/learning` | Static reference library of 21 chart patterns. |

## Common: AI Settings

Several pages (`/review`, `/forecast`, `/predictions`, `/backtest`, `/practice`) talk to an AI model. They share the same Settings dialog (top-right "Settings" button on each page).

**Provider** — choose between:
- **Claude API** (default) — requires an API key from Anthropic.
- **Ollama** (local) — requires a running Ollama server URL and model name.

**Environment variables** (loaded on startup; never persisted from the dialog for security):
- `VITE_CLAUDE_API_KEY` — Claude API key
- `VITE_OLLAMA_URL` — Ollama server URL (default `http://localhost:11434`)
- `VITE_OLLAMA_MODEL` — Ollama model name (default `plutus`)

**Test Connection** — sends a tiny "say ok" message to verify the configured provider responds. Green = ok, red = error message.

When the API isn't configured, AI-using pages show a yellow "API Key Required" banner with a shortcut to open Settings.

## Common: Data storage

Several pages persist data to JSON files in `data/` at the project root, served via Vite dev-server middleware:

| File | Used by | API endpoint |
|---|---|---|
| `data/notes.json` | Notes | `/api/notes` |
| `data/practice-sessions.json` | Practice (all modes) | `/api/practice` |
| `data/backtests.json` | Backtest | `/api/backtests` |
| `data/predictions.json` | Predictions | `/api/predictions` |

Trade history (`/analysis`, `/review` Trade Review tab, sidebar Trades panel) is **not** stored as JSON — it's compiled into the source as `src/config/trade-history.ts`.

Chart candles come from Yahoo Finance, proxied via `/api/yahoo` in dev mode.

## Common: Header navigation

The top header is shown on every page and contains links to all 9 pages. The active page is highlighted in blue. The right side shows "30s auto-refresh" — a static label noting that chart data refreshes every 30 seconds when on a live (non-historical) view.
