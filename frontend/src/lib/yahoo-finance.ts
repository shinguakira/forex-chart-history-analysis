// Thin wrapper that routes the legacy fetchCandles signature through the
// Rust backend's candles.list rspc procedure.

import { getPairById } from '@/config/pairs'
import { rspc } from '@/lib/rspc'
import type { Candle, TimeFrame } from '@/types/candle'

export interface FetchCandlesResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
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
