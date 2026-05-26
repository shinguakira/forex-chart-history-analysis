# Learning  (route: `/learning`)

## What it's for

Static reference library of common chart patterns with short descriptions, identification checklists, and trading hints. Useful as a quick lookup or refresher.

## Layout

- **Header** — page title + count of patterns matching the current filters.
- **Filter bar** — category and signal filters.
- **Pattern grid** — responsive (1 / 2 / 3 columns), each cell is a pattern card.

## Controls & actions

### Filters

- **Category filter** — `All` / `Reversal` / `Continuation` / `Candlestick` (mutually exclusive).
- **Signal filter** — `All` / `Bullish` / `Bearish` / `Neutral` (mutually exclusive).
- Filters compose: e.g., `Reversal` + `Bullish` shows only bullish reversal patterns.

### Per pattern card

- **Card body** (always visible) — pattern name, signal badge, category badge, short description, and a small illustrative candlestick chart (drawn from a hardcoded synthetic OHLC sequence — not real market data).
- **Show details / Hide details** toggle — expands/collapses extra info:
  - Identification checklist (bulleted criteria for spotting the pattern).
  - Trading strategy notes (entry / stop loss / target hints).

## Workflows

**Look up an unfamiliar pattern** — Type or browse to the pattern (filter by category if helpful). Click "Show details" for the criteria and trading hints.

**Refresh on bullish-reversal patterns** — Set Category = `Reversal`, Signal = `Bullish`. Browse the resulting cards.

## Data shown

- All patterns come from `CHART_PATTERNS` in `src/config/chart-patterns.ts` — purely a static config.
- The illustrative chart is rendered from a hardcoded sequence of OHLC values per pattern (not market data).

## Configuration

None.

## Storage / persistence

None — fully read-only / static.

## Limits / gotchas

- The mini chart is a stylized drawing, not real data — don't read price/time values from it.
- Patterns are not searchable by name; use category/signal filters to narrow the grid.
- No way to mark patterns as "studied" or favorite — purely a reference page.
