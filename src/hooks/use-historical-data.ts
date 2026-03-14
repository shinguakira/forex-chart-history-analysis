import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVAL } from '@/config/constants'
import type { PairConfig } from '@/config/pairs'
import { fetchCandles } from '@/lib/yahoo-finance'
import type { TimeFrame } from '@/types/candle'

export function useHistoricalData(pair: PairConfig, timeframe: TimeFrame) {
  return useQuery({
    queryKey: ['candles', pair.id, timeframe],
    queryFn: () => fetchCandles(pair.yahooSymbol, timeframe),
    staleTime: POLLING_INTERVAL,
    refetchInterval: POLLING_INTERVAL,
  })
}
