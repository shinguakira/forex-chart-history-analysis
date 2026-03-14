import type { TimeFrameConfig } from '@/types/candle'

export const TIMEFRAMES: TimeFrameConfig[] = [
  { label: '1m', resolution: '1', intervalMs: 60_000 },
  { label: '5m', resolution: '5', intervalMs: 300_000 },
  { label: '15m', resolution: '15', intervalMs: 900_000 },
  { label: '1H', resolution: '60', intervalMs: 3_600_000 },
  { label: '4H', resolution: '240', intervalMs: 14_400_000 },
  { label: '1D', resolution: 'D', intervalMs: 86_400_000 },
  { label: '1W', resolution: 'W', intervalMs: 604_800_000 },
]

export const DEFAULT_TIMEFRAME = TIMEFRAMES[0]

export const CHART_COLORS = {
  background: '#0f1117',
  text: '#9ca3af',
  grid: '#1f2937',
  upColor: '#22c55e',
  downColor: '#ef4444',
  borderUp: '#22c55e',
  borderDown: '#ef4444',
  wickUp: '#22c55e',
  wickDown: '#ef4444',
} as const

export const POLLING_INTERVAL = 30_000
