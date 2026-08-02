import { useQuery } from '@tanstack/react-query'
import { PERIOD_SECONDS, POLLING_INTERVAL } from '@/config/constants'
import type { PairConfig } from '@/config/pairs'
import { rspc } from '@/lib/rspc'
import type { Period, TimeFrame } from '@/types/candle'

export interface FetchCandlesResult {
  candles: { time: number; open: number; high: number; low: number; close: number }[]
  regularMarketPrice: number
  previousClose: number
}

function computeDateRange(period: Period, goToTimestamp: number | null) {
  const seconds = PERIOD_SECONDS[period]
  if (goToTimestamp != null) {
    return { period1: goToTimestamp - seconds, period2: goToTimestamp }
  }
  const now = Math.floor(Date.now() / 1000)
  const rounded = Math.floor(now / (POLLING_INTERVAL / 1000)) * (POLLING_INTERVAL / 1000)
  return { period1: rounded - seconds, period2: rounded }
}

export function useHistoricalData(
  pair: PairConfig,
  timeframe: TimeFrame,
  period: Period,
  goToTimestamp: number | null,
  source?: 'yahoo' | 'db',
) {
  const { period1, period2 } = computeDateRange(period, goToTimestamp)

  return useQuery<FetchCandlesResult>({
    queryKey: ['candles.list', pair.id, timeframe, period1, period2, source ?? null],
    queryFn: async () =>
      (await rspc.query([
        'candles.list',
        { pairId: pair.id, timeframe, from: period1, to: period2, ...(source ? { source } : {}) },
      ])) as FetchCandlesResult,
    staleTime: POLLING_INTERVAL,
    refetchInterval: goToTimestamp != null ? false : POLLING_INTERVAL,
  })
}
