export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type TimeFrame = '1' | '5' | '15' | '60' | '240' | 'D' | 'W'

export interface TimeFrameConfig {
  label: string
  resolution: TimeFrame
  intervalMs: number
}
