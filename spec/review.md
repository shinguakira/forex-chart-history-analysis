# AI Trade Review  (route: `/review`)

## What it's for

Get Claude (or Ollama) to write narrative reviews of either your whole portfolio or individual trades, with chart-context awareness. Includes a follow-up chat for asking questions about each review.

## Layout

- **Header** — page title, "API configured" indicator (if set), Settings button.
- **Two tabs** — `Portfolio Review` | `Trade Review`.
- **Portfolio tab** — Generate button → streaming response → action bar (Regenerate / Chat about portfolio).
- **Trade tab** — Filter row → list of trade cards (paginated 20 per page) → Prev/Next.
- **Chat panel** — slides in from the right when opened (page content shifts left to make room).
- **Floating chat button** — bottom-right, opens chat panel.

## Controls & actions

### Header

- **Settings** — opens the AI provider dialog (Claude / Ollama).

### Portfolio tab

- **Generate Portfolio Review** — sends all currently-filtered trades + sample chart contexts to the AI; the response streams in.
- **Stop** (during streaming) — aborts generation.
- **Regenerate** — clears the cached review and re-runs.
- **Chat about portfolio** — opens chat panel with portfolio context preset.
- Trade-count summary appears on the Generate button (e.g., "Generate Portfolio Review (47 trades)").

### Trade tab — filters

- **Date filter row** — same preset buttons (All / 1m / 3m / 6m / 1y / 2y) and custom From/To inputs as `/analysis`.
- **Pair dropdown** — `All Pairs` or specific pair.
- **Win/Loss toggle** — `All` / `Wins` / `Losses`.
- **Search** — free-text search against trade ref / open date / close date.
- **Trade count** — displayed next to the filter row.

### Trade tab — trade cards

Each card shows a trade summary plus its own controls:

- **Get AI review** (per trade) — generates a focused review of just that trade. The first call is slow (~10s) because it fetches surrounding chart data.
- **Chat about trade** — opens chat panel with that trade's context preset.
- Cached reviews appear instantly on revisit (review cache is keyed by trade ref).

### Pagination

- **Prev / Next** with `current / total` page indicator.
- Page resets to 1 when any filter changes.

### Chat panel

- Streaming chat with the configured provider, scoped to the current context (portfolio, forecast, or specific trade).
- Per-context history is preserved (last 50 messages per context) until you clear it.

## Workflows

**Read a portfolio review** — Set date filter to `6m`, click `Generate Portfolio Review`, watch it stream. After it finishes, click `Chat about portfolio` and ask follow-up questions.

**Drill into a single trade** — Switch to Trade Review tab, filter by Losses + a specific pair, find a trade card, click its Review button. After it loads, click "Chat about trade" to ask "what could I have done differently?".

**Compare wins vs. losses** — Use the Wins/Losses toggle to scroll through one set, then the other. Open a few in chat to look for common patterns.

## Data shown

- **Portfolio review** — Markdown-styled AI output (rendered via `StructuredResponse`).
- **Trade card** — pair, direction, dates, prices, P&L, and a per-trade review snippet once generated.
- **Chat history** — per-context message log shown in the side panel.

## Configuration

- Requires Claude API key or Ollama setup (see [README — AI Settings](./README.md#common-ai-settings)).
- Without it, the page shows a yellow "API Key Required" banner and the Generate buttons are disabled.

## Storage / persistence

- **Review cache** — stored in `localStorage` (Zustand `ai-store`). Re-opening the app shows previous reviews instantly.
- **Chat histories** — in-memory only (per-context, not persisted).

## Limits / gotchas

- Per-trade review fetches chart data on first call → ~10s delay. Subsequent calls hit cache.
- Streaming uses Anthropic's direct browser API (`anthropic-dangerous-direct-browser-access` header). Your API key is sent from the browser; suitable for personal use only.
- Portfolio review is built from a sample of the filtered trades (top trades by P&L size), not all of them — designed to fit in the context window.
- Chat side panel reduces page width by 400px when open.
