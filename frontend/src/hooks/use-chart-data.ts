import type { PairConfig } from '@/config/pairs'
import type { Candle, Period, TimeFrame } from '@/types/candle'
import { useHistoricalData } from './use-historical-data'

interface ChartDataResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
  isLoading: boolean
}

export function useChartData(
  pair: PairConfig,
  timeframe: TimeFrame,
  period: Period,
  goToTimestamp: number | null,
  source?: 'yahoo' | 'db',
): ChartDataResult {
  const { data, isLoading } = useHistoricalData(pair, timeframe, period, goToTimestamp, source)
  return {
    candles: data?.candles ?? [],
    regularMarketPrice: data?.regularMarketPrice ?? 0,
    previousClose: data?.previousClose ?? 0,
    isLoading,
  }
}
