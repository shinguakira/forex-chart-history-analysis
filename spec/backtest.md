# Backtest  (route: `/backtest`)

## What it's for

Replay AI prediction generation across historical cutoff points to estimate how the AI would have performed in the past. Each cutoff is treated as "the present" — the AI sees only data up to that point, generates predictions, and the predictions are validated against the data that follows.

## Layout

- **Header** — page title, "API configured" indicator, Settings button.
- **Configuration panel** — date range, interval, pair multi-select, count per cutoff, Run / Cancel.
- **Progress panel** (during run) — phase indicators + bars.
- **Aggregate stats card** — totals across all completed runs.
- **Model performance card** — per-model W/L breakdown.
- **Run history** — collapsible cards, each can expand to show every prediction it generated.

## Controls & actions

### Header

- **Settings** — opens AI provider dialog.

### Configuration panel

- **From / To** datetime-local inputs — define the historical window to backtest.
- **Interval dropdown** — `Every day` / `Every 3 days` / `Every week` / `Every 2 weeks` / `Every month`. Spaces the cutoff points within the From-To window.
- **Estimated cutoff count** — live readout next to the interval selector.
- **Pair multi-select** — toggle which pairs to include.
- **Count per cutoff** — number of predictions per cutoff (auto if empty).
- **Run Backtest** — kicks off the run.
- **Cancel** (during run) — aborts.

### Progress panel (only while running)

- **Cutoff X / Y** — overall position.
- **Phase status** — `Fetching historical data` → `Receiving predictions from AI` → `Parsing` → `Validating M/N`. Validation has its own progress bar.
- **Overall progress bar** — completed cutoffs vs. total.

### Aggregate stats card

Shows totals across **all** stored backtest runs (not just the current one): total predictions, wins, losses, expired, win rate, total pips.

### Model performance card

Per-model breakdown — useful when you've run backtests with different models over time.

### Run history

Each completed run is its own card showing:
- Date range, cutoff count, interval, pairs, model.
- Run-level stats: total / W / L / E / win rate / total pips.
- **Click ▶/▼** to expand and see every prediction (pair, direction, entry/SL/TP, status, validation result).
- **Delete** button removes the run.

## Workflows

**Validate a strategy idea** — Set From/To to the last year, Interval to `Every week`, select USD/JPY, leave count empty. Run Backtest. Wait for validation to finish (each cutoff's predictions are validated against the next 1 day of data).

**Compare a date range across models** — After a few backtest runs with different models (change model in Settings between runs), the Model Performance card aggregates them so you can see which model held up best.

**Investigate a particular cutoff** — Find the run in history, click to expand. Each prediction card shows entry/SL/TP and the actual outcome (or "Neither SL nor TP hit within 1 day" for expired ones).

## Data shown

- Per prediction: pair, direction (long/short), status (win/loss/expired), entry / SL / TP, timeframe, cutoff timestamp.
- Validation: exit price, exit time, pips gained/lost.
- Aggregate / model / run-level stats.

## Configuration

- Requires Claude API key.
- Date range and at least one pair must be selected.

## Storage / persistence

- **Backtest runs** — `data/backtests.json` via `/api/backtests` Vite plugin.

## Limits / gotchas

- **1-day holding period** — predictions are validated against the candle data covering the 24 hours after the cutoff. SL / TP that would only hit beyond 1 day show as `expired`.
- **Cost** — long date ranges × short intervals × many pairs × generation count can quickly add up to many AI calls. Cancel button is your friend.
- **Cutoff estimate** is an approximation; actual cutoff count may differ slightly due to weekends/no-data days.
- Yahoo Finance intraday limits apply to historical data fetch — see [Chart spec](./chart.md#limits--gotchas).
