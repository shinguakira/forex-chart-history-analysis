# Practice  (route: `/practice`)

## What it's for

Build trading intuition on past charts. Three modes share the same chart engine and history file:

- **Replay** — step through bars one-by-one, place Entry/SL/TP, hold positions, manual or auto-close.
- **Quiz** — see a chart up to a cutoff, predict UP or DOWN over N bars, get immediate feedback.
- **Setup** — make a Long / Short / No-Trade judgement with confidence and reasoning, then see the outcome.

All modes hide future bars until you choose to reveal them.

## Layout (common)

- **Header** — page title, mode tabs (Replay / Quiz / Setup), "AI ready" indicator (if API key set), Settings button.
- **All-mode stats panel** — small summary card at top showing aggregate sessions across all 3 modes (with "Clear all" link).
- **Mode body** — each mode's specific UI (chart on the left, controls/stats on the right).

## Common controls

Available in all 3 modes:

- **Pair dropdown** — choose which currency pair to load.
- **Timeframe dropdown** — `1m / 5m / 15m / 1H / 4H / 1D / 1W`.
- **Scenario dropdown** — biases random jumps:
  - `Random` — uniformly random within the candidate window.
  - `Volatile` — picks bars with above-average ranges.
  - `Range` — picks consolidation bars (low close-to-close spread).
  - `Gap` — picks bars with a noticeable gap from the previous close.
- **🎲 New / Random Jump** button — picks a random target timestamp for the timeframe (within Yahoo's history limits) and re-cursors the chart.
- **Blind checkbox** — hides date / time labels on the chart so you can't tell when the data is from.

If a random jump lands on a timestamp with no Yahoo data (rare), Quiz/Setup show a "🎲 Try Again" button.

## Replay mode

### Layout

- **Chart** (left) with price lines (Entry / SL / TP) and a marker at the entry bar when a position is open.
- **Step controls bar** below the chart.
- **Right column**: stats card → position panel → trade history.

### Controls

**Step bar**:
- `⏪ −1` / `+1 ⏩` / `+10` / `+50` — move the cursor by N bars.
- **▶ Play / ⏸ Pause** — auto-advance.
- **Speed dropdown** — `1.0s` / `0.5s` / `0.25s` / `0.1s` between bars.
- **Cursor index readout** (X / Y).

**New Order panel** (when no position open):
- Stop Loss input + ±10 / ±20 / ±50 pip quick-set buttons.
- Take Profit input + ±10 / ±20 / ±50 pip quick-set buttons.
- **Buy** / **Sell** buttons — open at current bar's close. Order is rejected if SL/TP are on the wrong side of entry.

**Open Position panel** (when position open):
- Entry / SL / TP / unrealized pips readout.
- Optional note textarea ("Why did you enter?").
- **Close @ \<price\>** — manual close at current bar's close.
- **Cancel** — discards the position without recording (note is dropped too).

**Trade history**:
- Last 30 closed trades with direction badge, exit reason (sl / tp / manual), pips.
- **🤖** button — opens AI Review modal for that trade.
- **×** button — delete the trade.

### Auto-close logic

When you advance the cursor past entry, each new bar is checked:
- Long: SL if low ≤ SL, TP if high ≥ TP.
- Short: SL if high ≥ SL, TP if low ≤ TP.
- Both hit in same bar → resolved as SL (conservative).

### Workflow

1. Pick pair + timeframe + scenario.
2. Click 🎲 Random Jump.
3. Look at the chart. Set SL and TP. Click Buy or Sell.
4. Click `+1` or `▶ Play` to advance bars. Watch SL/TP resolve.
5. After the trade closes, optionally click 🤖 on the row for AI feedback.

## Quiz mode

### Layout

- **Chart** (left) showing data up to the cutoff. After answering, future bars reveal and a yellow "Cutoff" marker is drawn at the cutoff bar.
- **Question card** below.
- **Right column**: session streak / all-time accuracy / recent quizzes list.

### Controls

- **Bars-ahead dropdown** — `5` / `10` / `20` / `50` bars ahead to reveal.
- **▲ UP / ▼ DOWN** buttons — submit your call.
- **Next Question →** — random-jump to a fresh chart.

### Workflow

1. Click 🎲 New.
2. Glance at the chart, decide UP or DOWN over the next N bars.
3. Click your call → reveals the next N bars + actual move in pips + correctness badge.
4. Click Next.

## Setup mode

### Layout

- **Chart** (left) — same future-hiding behavior as Quiz.
- **Question card** with judgement buttons + confidence + reason.
- **Right column**: setup stats (total / accuracy / accuracy by confidence) / recent setups list.

### Controls

- **Bars-ahead dropdown** — `10` / `20` / `50` / `100` bars.
- **Judgement buttons** — `▲ Long` / `▼ Short` / `— No Trade`.
- **Confidence buttons** `1 — 5`.
- **Reason textarea** — free-text rationale (optional).
- **Submit & Reveal** — locks in your judgement, reveals the future bars, and computes the outcome.
- **Next Setup →**.

### Correctness rule

- Long correct if outcome > 0 pips.
- Short correct if outcome < 0 pips.
- No-Trade correct if |outcome| < 20 pips.

### Workflow

1. Click 🎲 New.
2. Read the chart. Pick Long / Short / No-Trade. Set confidence (1-5). Type your reasoning.
3. Click Submit & Reveal — see the outcome and whether you were right.
4. Recent Setups list shows your reasoning per row → useful for spotting patterns in your good vs. bad reads.
5. Click 🤖 on a row for AI feedback on your reasoning.

## AI Review modal

Triggered from the 🤖 button on Replay or Setup trades. Sends the trade details to Claude with a focused prompt (entry/SL/TP for Replay; judgement + reasoning for Setup) and streams a short coaching response.

Requires API key (see [README — AI Settings](./README.md#common-ai-settings)).

## Data shown

All trades from all 3 modes are stored together with a `mode` field and mode-specific detail (replay / quiz / setup). The All Modes panel aggregates them into:

- **Replay** — total trades, win rate %, total pips.
- **Quiz** — total, correct count, accuracy %.
- **Setup** — total, correct count, accuracy %.

## Configuration

- AI Review feature requires Claude API key. Other features work offline-of-AI.

## Storage / persistence

- **Practice trades** — `data/practice-sessions.json` via `/api/practice` Vite plugin (single file, all 3 modes interleaved).
- **Mode + pair + timeframe + blind setting** — Zustand `practice-store` persisted to `localStorage`.
- **Cursor / position / scenario / bars-ahead** — in-memory only (resets on page reload).

## Limits / gotchas

- **Yahoo Finance limits** — random jump targets are capped per timeframe (1m: 1-5d ago, 5m/15m: 5-50d, 1h: 30-600d, 4h: 60-500d, daily: 90-1500d, weekly: 180-3000d). If the rare empty-result lands, click "🎲 Try Again".
- **Pip multiplier** — JPY pairs (3-decimals) use ×100; others use ×10000. Hardcoded in the modes.
- **Same-bar SL+TP** in Replay always resolves to SL (worst-case rule).
- Scenario filter is best-effort — picks from top 10% of scoring candidates with randomness, so it's not deterministic.
- Switching pair or timeframe resets cursor + position (Replay) or current quiz (Quiz/Setup).
