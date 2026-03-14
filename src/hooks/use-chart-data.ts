import type { PairConfig } from '@/config/pairs'
import type { Candle, TimeFrame } from '@/types/candle'
import { useHistoricalData } from './use-historical-data'

interface ChartDataResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
  isLoading: boolean
}

export function useChartData(pair: PairConfig, timeframe: TimeFrame): ChartDataResult {
  const { data, isLoading } = useHistoricalData(pair, timeframe)
  return {
    candles: data?.candles ?? [],
    regularMarketPrice: data?.regularMarketPrice ?? 0,
    previousClose: data?.previousClose ?? 0,
    isLoading,
  }
}
