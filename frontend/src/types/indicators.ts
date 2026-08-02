interface SmaConfig {
  type: 'sma'
  period: number
  color: string
}

interface EmaConfig {
  type: 'ema'
  period: number
  color: string
}

interface RsiConfig {
  type: 'rsi'
  period: number
}

interface MacdConfig {
  type: 'macd'
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}

interface BollingerBandsConfig {
  type: 'bollingerBands'
  period: number
  stdDev: number
}

type IndicatorConfig = SmaConfig | EmaConfig | RsiConfig | MacdConfig | BollingerBandsConfig

export interface IndicatorEntry {
  id: string
  enabled: boolean
  config: IndicatorConfig
}
