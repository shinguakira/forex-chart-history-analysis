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
- Use markdown formatting with clear sections and tables
- Be concise — prioritize actionable information over explanation`

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
  user += 'Provide:\n'
  user +=
    '1. **USD/JPY Forecast**: Predicted range and directional bias for each timeframe (5m, 15m, 1H, 4H, 1D)\n'
  user += '2. **Key Levels**: Critical support/resistance levels to watch\n'
  user +=
    '3. **Cross-Pair Analysis**: How other pairs correlate and what they suggest for USD/JPY\n'
  user +=
    '4. **Risk Factors**: Technical patterns or conditions that could invalidate the forecast\n'
  user += '5. **Trading Opportunities**: Specific setups with entry/exit levels if any exist\n'

  return { system: FORECAST_SYSTEM_PROMPT, user }
}
