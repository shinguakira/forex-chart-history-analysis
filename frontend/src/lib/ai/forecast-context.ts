import { PAIRS } from '@/config/pairs'
import { extractSnapshot } from '@/lib/ai/trade-context'
import { fetchCandles } from '@/lib/yahoo-finance'
import type { ForecastContext, ForecastPairData, ForecastTimeframeData } from '@/types/ai'
import type { TimeFrame } from '@/types/candle'

export const FORECAST_PAIR_IDS = ['USD_JPY', 'EUR_USD', 'EUR_JPY', 'AUD_USD', 'AUD_JPY']

const TIMEFRAMES: { label: string; resolution: TimeFrame; lookbackSeconds: number }[] = [
  { label: '5m', resolution: '5', lookbackSeconds: 30 * 300 },
  { label: '15m', resolution: '15', lookbackSeconds: 30 * 900 },
  { label: '1H', resolution: '60', lookbackSeconds: 30 * 3600 },
  { label: '4H', resolution: '240', lookbackSeconds: 30 * 14400 },
  { label: '1D', resolution: 'D', lookbackSeconds: 60 * 86400 },
]

export async function buildForecastContext(
  onProgress?: (message: string) => void,
  pairIds?: string[],
): Promise<ForecastContext> {
  const pairs: ForecastPairData[] = []
  const targetPairIds = pairIds ?? FORECAST_PAIR_IDS

  for (const pairId of targetPairIds) {
    const pair = PAIRS.find((p) => p.id === pairId)
    if (!pair) continue

    onProgress?.(`Fetching ${pair.displayName}...`)

    const timeframes: ForecastTimeframeData[] = []
    let currentPrice = 0
    let previousClose = 0

    for (const tf of TIMEFRAMES) {
      const now = Math.floor(Date.now() / 1000)
      const period1 = now - tf.lookbackSeconds

      try {
        const result = await fetchCandles(pair.yahooSymbol, tf.resolution, period1, now)

        if (tf.label === '5m' && result.regularMarketPrice) {
          currentPrice = result.regularMarketPrice
          previousClose = result.previousClose
        }

        const candles = result.candles.slice(-30)

        if (candles.length > 0) {
          const indicators = extractSnapshot(candles, candles.length - 1)

          timeframes.push({
            timeframe: tf.label,
            candles,
            indicators,
          })
        }

        await new Promise((r) => setTimeout(r, 500))
      } catch {
        // Skip failed timeframes
      }
    }

    if (currentPrice === 0 && timeframes.length > 0) {
      const firstTf = timeframes[0]
      const lastCandle = firstTf.candles[firstTf.candles.length - 1]
      if (lastCandle) currentPrice = lastCandle.close
    }

    pairs.push({
      pairId,
      displayName: pair.displayName,
      currentPrice,
      previousClose,
      timeframes,
    })
  }

  return { pairs, generatedAt: Date.now() }
}
