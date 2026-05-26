# Analysis  (route: `/analysis`)

## What it's for

A static-data dashboard summarizing your trade history. Shows aggregate performance, breakdowns by pair / direction / time, and risk-related metrics — all driven by the trades compiled into the source.

## Layout

A single scrollable page with a date-range filter at the top and ~12 analysis cards below, arranged in a responsive grid (1 column on mobile, 2 columns on desktop).

## Controls & actions

### Date filter (top of page)

- **Preset buttons** — `All` / `1m` / `3m` / `6m` / `1y` / `2y`. Filters trades whose close date falls inside the range.
- **Custom range** — separate `From` and `To` date inputs (used when no preset matches your need).
- Trade count next to the page title updates live as filters change.

### Analysis cards (read-only)

Each card recomputes whenever the filter changes:

- **Summary Cards** — total trades, wins, losses, win rate, average P&L per trade.
- **Cumulative P&L Chart** — line chart of running P&L over the filtered range.
- **Monthly Breakdown** — bar chart of P&L by month.
- **Pair Performance** — table of each pair's trade count, win rate, and total P&L.
- **Direction Analysis** — long vs. short performance comparison.
- **Time Analysis** — heatmap-style breakdown by JST hour and day-of-week.
- **Duration Analysis** — histogram of how long trades stay open.
- **Position Size Analysis** — relationship between size multiplier and outcome.
- **Streak Analysis** — current/longest winning and losing streaks.
- **Drawdown Analysis** — max drawdown depth and recovery duration.
- **Risk/Reward Analysis** — average risk-reward ratios for winners and losers.
- **Consistency Score** — composite metric of how consistent your results are.
- **Recent Trend** — direction indicator for recent performance vs. baseline.

## Workflows

**Quick health check** — Open page, leave preset on `All`. Glance at Summary Cards (win rate, total P&L), Cumulative P&L chart, and Recent Trend.

**Investigate a slump** — Switch preset to `1m` or `3m`. Compare Pair Performance and Streak Analysis to identify a losing pair or a bad streak.

**Tune position sizing** — Look at Position Size Analysis card to see whether larger positions correlate with worse outcomes.

**Find your best trading window** — Time Analysis card shows hour/day patterns; check whether your wins cluster around specific JST hours.

## Data shown

All cards are computed from `TRADE_HISTORY` (`src/config/trade-history.ts`), filtered by the date range. Computations live in `src/lib/trade-analysis.ts`.

## Configuration

None.

## Storage / persistence

None — the page is fully derived from compiled-in trade data and the filter state (in-memory only).

## Limits / gotchas

- Trade data is **static** (compiled into source). Editing trades requires editing `src/config/trade-history.ts` and rebuilding.
- Custom date range only takes effect when both From and To are filled in (otherwise behaves as if no custom range applied).
- All times are interpreted in JST (Asia/Tokyo).
