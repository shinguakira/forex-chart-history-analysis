// Thin wrapper that routes the legacy fetchCandles signature through the
// Rust backend's candles.list rspc procedure. Step 12 inlines the few
// remaining callers and removes this shim entirely.

import { PERIOD_SECONDS, POLLING_INTERVAL } from '@/config/constants'
import { rspc } from '@/lib/rspc'
import { getPairById } from '@/config/pairs'
import type { Candle, Period, TimeFrame } from '@/types/candle'

export interface FetchCandlesResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
}

export function computeDateRange(
  period: Period,
  goToTimestamp: number | null,
): { period1: number; period2: number } {
  const seconds = PERIOD_SECONDS[period]
  if (goToTimestamp != null) {
    return { period1: goToTimestamp - seconds, period2: goToTimestamp }
  }
  const now = Math.floor(Date.now() / 1000)
  const rounded = Math.floor(now / (POLLING_INTERVAL / 1000)) * (POLLING_INTERVAL / 1000)
  return { period1: rounded - seconds, period2: rounded }
}

function pairIdFromYahooSymbol(yahooSymbol: string): string | null {
  const match = yahooSymbol.match(/^([A-Z]{3})([A-Z]{3})=X$/)
  if (!match) return null
  const candidate = `${match[1]}_${match[2]}`
  return getPairById(candidate) ? candidate : null
}

export async function fetchCandles(
  yahooSymbol: string,
  resolution: TimeFrame,
  period1: number,
  period2: number,
): Promise<FetchCandlesResult> {
  const pairId = pairIdFromYahooSymbol(yahooSymbol)
  if (!pairId) {
    throw new Error(`unable to map yahoo symbol "${yahooSymbol}" to a pair id`)
  }
  return (await rspc.query([
    'candles.list',
    { pairId, timeframe: resolution, from: period1, to: period2 },
  ])) as FetchCandlesResult
}
