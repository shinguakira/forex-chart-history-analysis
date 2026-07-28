import type { Period, TimeFrame, TimeFrameConfig } from '@/types/candle'

export const TIMEFRAMES: TimeFrameConfig[] = [
  { label: '1m', resolution: '1', intervalMs: 60_000 },
  { label: '5m', resolution: '5', intervalMs: 300_000 },
  { label: '15m', resolution: '15', intervalMs: 900_000 },
  { label: '1H', resolution: '60', intervalMs: 3_600_000 },
  { label: '4H', resolution: '240', intervalMs: 14_400_000 },
  { label: '1D', resolution: 'D', intervalMs: 86_400_000 },
  { label: '1W', resolution: 'W', intervalMs: 604_800_000 },
]

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

export interface PeriodConfig {
  label: string
  value: Period
}

export const PERIODS: PeriodConfig[] = [
  { label: '1D', value: '1d' },
  { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
  { label: '10Y', value: '10y' },
]

// Yahoo Finance API limits per interval
export const MAX_PERIODS_BY_TIMEFRAME: Record<TimeFrame, Period[]> = {
  '1': ['1d', '5d'],
  '5': ['1d', '5d', '1mo', '3mo'],
  '15': ['1d', '5d', '1mo', '3mo'],
  '60': ['5d', '1mo', '3mo', '6mo', '1y', '2y'],
  '240': ['1mo', '3mo', '6mo', '1y', '2y'],
  D: ['1mo', '3mo', '6mo', '1y', '2y', '5y', '10y'],
  W: ['3mo', '6mo', '1y', '2y', '5y', '10y'],
}

export const DEFAULT_PERIOD_BY_TIMEFRAME: Record<TimeFrame, Period> = {
  '1': '5d',
  '5': '5d',
  '15': '1mo',
  '60': '6mo',
  '240': '1y',
  D: '5y',
  W: '10y',
}

export const PERIOD_SECONDS: Record<Period, number> = {
  '1d': 86_400,
  '5d': 432_000,
  '1mo': 2_592_000,
  '3mo': 7_776_000,
  '6mo': 15_552_000,
  '1y': 31_536_000,
  '2y': 63_072_000,
  '5y': 157_680_000,
  '10y': 315_360_000,
}
