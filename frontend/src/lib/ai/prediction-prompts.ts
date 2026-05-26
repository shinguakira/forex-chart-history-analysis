import { formatCandles, formatSnapshot } from '@/lib/ai/prompts'
import { formatDateJST } from '@/lib/date-utils'
import type { ForecastContext } from '@/types/ai'

export interface PredictionPromptOptions {
  count?: number
  pairIds: string[]
  maxHoldingPeriod?: string
}

function buildSystemPrompt(opts: PredictionPromptOptions): string {
  const pairList = opts.pairIds.map((id) => `"${id}"`).join(', ')
  const countInstruction = opts.count
    ? `Provide exactly ${opts.count} predictions.`
    : 'Provide as many predictions as the technical data supports — no upper limit. Generate predictions for every viable setup you can identify across different timeframes.'

  return `You are an expert forex market analyst. Your task is to generate specific trade predictions based on multi-timeframe technical analysis.

You MUST respond with ONLY a valid JSON array. No markdown code fences. No explanation. No commentary.

Each element in the array must have exactly these fields:
- "pairId": string — one of: ${pairList}
- "direction": "long" or "short"
- "entryPrice": number — specific entry price level
- "stopLoss": number — specific stop loss price level
- "takeProfit": number — specific take profit price level
- "timeframe": string — the expected horizon, one of: "5m", "15m", "1H", "4H", "today"

Rules:
- ${countInstruction}
- All prices must be specific numbers, not ranges
- Stop loss and take profit must be realistic relative to the entry price and timeframe
- For long: stopLoss < entryPrice < takeProfit
- For short: takeProfit < entryPrice < stopLoss
- Use current price levels from the data as reference for entry prices
- Only predict when the technical data supports a clear setup — do not force trades
- All times are in JST (Japan Standard Time, UTC+9)${opts.maxHoldingPeriod ? `\n- Maximum position holding period is ${opts.maxHoldingPeriod}. All trades must resolve within this window.` : ''}

Example response format:
[{"pairId":"USD_JPY","direction":"long","entryPrice":150.250,"stopLoss":149.950,"takeProfit":150.800,"timeframe":"1H"}]`
}

export function buildPredictionMessages(
  ctx: ForecastContext,
  opts: PredictionPromptOptions,
): { system: string; user: string } {
  let user = `Generate trade predictions based on the following market data as of ${formatDateJST(ctx.generatedAt)}.\n\n`

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
  user += 'Respond with ONLY a valid JSON array. No markdown. No explanation.'

  return { system: buildSystemPrompt(opts), user }
}
