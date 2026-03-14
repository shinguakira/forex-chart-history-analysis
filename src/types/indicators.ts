export type IndicatorType = 'sma' | 'ema' | 'rsi' | 'macd' | 'bollingerBands'

export interface SmaConfig {
  type: 'sma'
  period: number
  color: string
}

export interface EmaConfig {
  type: 'ema'
  period: number
  color: string
}

export interface RsiConfig {
  type: 'rsi'
  period: number
}

export interface MacdConfig {
  type: 'macd'
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}

export interface BollingerBandsConfig {
  type: 'bollingerBands'
  period: number
  stdDev: number
}

export type IndicatorConfig = SmaConfig | EmaConfig | RsiConfig | MacdConfig | BollingerBandsConfig

export interface IndicatorEntry {
  id: string
  enabled: boolean
  config: IndicatorConfig
}
