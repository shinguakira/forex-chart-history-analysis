import { formatCandles, formatSnapshot } from '@/lib/ai/prompts'
import { formatDateJST } from '@/lib/date-utils'
import type { ForecastContext } from '@/types/ai'

const FORECAST_SYSTEM_PROMPT = `You are an expert forex market analyst providing real-time technical forecasts.
You analyze multi-timeframe technical data across correlated currency pairs to predict short-term price movements.

Guidelines:
- Provide specific price levels, not vague statements
- For each timeframe, give expected range (high/low) and directional bias
- Consider cross-pair correlations (e.g., if EUR/USD is strengthening, how does that affect USD/JPY?)
- Identify key support/resistance levels from technical indicators
- Note divergences between timeframes
- All times are in JST (Japan Standard Time, UTC+9)
- Be concise — prioritize actionable information over explanation

IMPORTANT — you MUST use this exact section structure with ## headers:

## Market Overview
Brief 2-3 sentence summary of current conditions across all pairs.

## USD/JPY Forecast
Use a markdown table with columns: Timeframe | Range | Bias | Confidence
One row per timeframe (5m, 15m, 1H, 4H, 1D). Then 1-2 sentences of context.

## Key Levels
Use a markdown table with columns: Level | Price | Type | Significance
List critical support/resistance levels. Type = Support or Resistance.

## Cross-Pair Analysis
How other pairs correlate with USD/JPY. Use bullet points for each pair.

## Risk Factors
Bullet list of technical patterns or conditions that could invalidate the forecast.

## Trading Opportunities
Specific setups with entry, stop-loss, and target levels. Use a table if multiple setups exist.
If no clear setups, say so — do not force trades.`

export function buildForecastMessages(ctx: ForecastContext): { system: string; user: string } {
  let user = `Generate a forex forecast as of ${formatDateJST(ctx.generatedAt)}.\n\n`

  for (const pair of ctx.pairs) {
    user += `## ${pair.displayName}\n`
    user += `Current: ${pair.currentPrice}`
    if (pair.previousClose) {
      const change = pair.currentPrice - pair.previousClose
      const pct = ((change / pair.previousClose) * 100).toFixed(3)
      user += ` | Prev Close: ${pair.previousClose} | Change: ${change > 0 ? '+' : ''}${change.toFixed(5)} (${pct}%)`
    }
    user += '\n\n'

    for (const tf of pair.timeframes) {
      user += `### ${tf.timeframe}\n`
      user += formatCandles(tf.candles, `Recent ${tf.timeframe}`, 15)
      user += formatSnapshot(tf.indicators, `Latest ${tf.timeframe} Indicators`)
      user += '\n'
    }
  }

  user += '---\n\n'
  user += 'Respond using the exact ## section headers defined in your instructions.'

  return { system: FORECAST_SYSTEM_PROMPT, user }
}
