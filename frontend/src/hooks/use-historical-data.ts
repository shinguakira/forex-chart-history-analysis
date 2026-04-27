import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVAL } from '@/config/constants'
import type { PairConfig } from '@/config/pairs'
import { computeDateRange, fetchCandles } from '@/lib/yahoo-finance'
import type { Period, TimeFrame } from '@/types/candle'

export function useHistoricalData(
  pair: PairConfig,
  timeframe: TimeFrame,
  period: Period,
  goToTimestamp: number | null,
) {
  const { period1, period2 } = computeDateRange(period, goToTimestamp)

  return useQuery({
    queryKey: ['candles', pair.id, timeframe, period1, period2],
    queryFn: () => fetchCandles(pair.yahooSymbol, timeframe, period1, period2),
    staleTime: POLLING_INTERVAL,
    refetchInterval: goToTimestamp != null ? false : POLLING_INTERVAL,
  })
}
