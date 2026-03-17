export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type TimeFrame = '1' | '5' | '15' | '60' | '240' | 'D' | 'W'

export type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y'

export interface TimeFrameConfig {
  label: string
  resolution: TimeFrame
  intervalMs: number
}
