# Chart  (route: `/` and `/pair/$pairId`)

## What it's for

The main charting workspace. Open one or more candlestick chart windows, switch timeframes, overlay indicators, and review your historical trades on the chart.

## Layout

- **Header** — global page nav (always visible).
- **Left sidebar** — currency pair list (top) + collapsible trade history panel (bottom). Resizable: drag the vertical divider on the right edge to set width between 160 and 600px.
- **Main canvas** — empty by default; opens floating chart windows on top of it. Click any pair in the sidebar to open a window.
- **Chart window** — a draggable, resizable panel containing a candlestick chart. Multiple windows can be open at once.

## Controls & actions

### Sidebar

- **Currency Pairs list** — click a pair to open a chart window. Pairs already open are visually highlighted.
- **Trades panel header** — click to expand/collapse the trade history list. Shows total trade count and cumulative ¥ P&L.
- **Trade direction filter** (when expanded) — `All` / `Long` / `Short` toggle buttons.
- **Trade row** — click any trade to navigate the matching pair's chart window to the trade's open date. If the pair has no open window, one opens automatically.
- **Sidebar resize** — drag the thin vertical divider next to the sidebar to resize the panel.

### Chart window — title bar

- **Drag** — grab the title bar to move the window anywhere on the canvas.
- **Pair name + price + change** — current bid price and ¥ delta + percent change vs. previous close.
- **Close (✕)** — closes the window.

### Chart window — controls row 1 (Timeframe + Indicators)

- **Timeframe buttons** — `1m`, `5m`, `15m`, `1H`, `4H`, `1D`, `1W`. Switches the candle resolution.
- **Indicator dropdown** — toggle on/off:
  - **Overlay**: SMA (multiple periods), EMA, Bollinger Bands
  - **Subplot**: RSI, MACD
  Shows count of currently-enabled indicators on the dropdown button.

### Chart window — controls row 2 (Period + Trade overlay + Date nav + Latest)

- **Period selector** — varies by timeframe (e.g., `1D / 5D / 1M / 3M / 6M / 1Y / 2Y / 5Y / 10Y`). Sets how much history to fetch. Yahoo Finance imposes per-timeframe limits (see Limits below).
- **Trade toggle** — overlays your historical trades on the chart as entry/exit markers (color-coded by direction, with P&L badges).
- **Go-to-date input** — type/paste a date; chart scrolls to that timestamp and auto-fetches enough history to show it.
- **Latest** — jumps back to the most recent data and resumes 30-second auto-refresh.

### Chart window — resize

- **Bottom-right corner** — drag the SE corner to resize the window.

## Workflows

**Compare two pairs side-by-side** — Click pair A in the sidebar, drag its window left. Click pair B, drag its window right. Resize both as needed.

**Inspect a past trade** — Expand the Trades panel, optionally filter by Long/Short, click a trade row. The relevant pair's chart window opens (or focuses if already open) and scrolls to the trade's open date. Toggle "Trades" on the window to see the entry/exit markers in context.

**Add technical context to a chart** — In the chart window, click the Indicator dropdown and toggle SMA, RSI, etc. Subplots (RSI/MACD) appear below the candles; overlays (SMA, BB) draw on top of price.

**Look at a specific date** — Click "Go to date", enter a date, optionally adjust period to a longer one if you want surrounding context.

## Data shown

- **Candles** — OHLC from Yahoo Finance (`/api/yahoo` proxy in dev). Green = up, red = down.
- **Trade markers** (when toggle on) — vertical lines at open/close times of trades for that pair, with direction badge (L/S) and ¥ P&L.
- **Indicator lines** — computed client-side from the loaded candles.
- **Pairs available** — `USD/JPY`, `EUR/USD`, `EUR/JPY`, `USD/CAD`, `CAD/JPY`, `AUD/USD`, `AUD/JPY`, `NZD/USD`, `NZD/JPY` (configured in `src/config/pairs.ts`).

## Configuration

None — works out of the box (no API key required for charting).

## Storage / persistence

- **Window layout** — persisted to `localStorage` (Zustand `window-store`). Reopening the app restores your open windows, positions, and sizes.
- **Trade history** — read from compiled-in `src/config/trade-history.ts` (not user-editable through the UI).

## Limits / gotchas

- **Yahoo Finance intraday limits**: 1m ≈ 7 days, 5m/15m ≈ 60 days, 1h/4h ≈ 730 days. Daily/weekly are unlimited. The Period selector hides options that would exceed the limit, but combining a long Go-to-date jump with an intraday timeframe may return empty data.
- **30-second auto-refresh** runs only when no `goToTimestamp` is set (i.e., you're on the latest data). Hit "Latest" after navigating historically to resume live refresh.
- **`/pair/$pairId`** is a sub-route used for deep-linking — the chart-window component is the same one used in the main canvas.
