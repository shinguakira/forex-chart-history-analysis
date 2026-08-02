import type { IndicatorEntry } from '@/types/indicators'

const DEFAULT_INDICATORS: IndicatorEntry[] = [
  { id: 'sma-20', enabled: false, config: { type: 'sma', period: 20, color: '#f59e0b' } },
  { id: 'sma-50', enabled: false, config: { type: 'sma', period: 50, color: '#3b82f6' } },
  { id: 'sma-200', enabled: false, config: { type: 'sma', period: 200, color: '#a855f7' } },
  { id: 'ema-12', enabled: false, config: { type: 'ema', period: 12, color: '#06b6d4' } },
  { id: 'ema-26', enabled: false, config: { type: 'ema', period: 26, color: '#ec4899' } },
  { id: 'rsi', enabled: false, config: { type: 'rsi', period: 14 } },
  {
    id: 'macd',
    enabled: false,
    config: { type: 'macd', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  },
  {
    id: 'bb',
    enabled: false,
    config: { type: 'bollingerBands', period: 20, stdDev: 2 },
  },
]

export function cloneIndicators(): IndicatorEntry[] {
  return DEFAULT_INDICATORS.map((ind) => ({
    ...ind,
    config: { ...ind.config },
  }))
}
