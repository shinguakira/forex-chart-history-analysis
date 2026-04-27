import type { Candle } from './candle'
import type { Trade } from './trade'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

export interface AIProvider {
  readonly name: string
  stream(messages: AIMessage[], callbacks: AIStreamCallbacks, signal?: AbortSignal): Promise<void>
  isConfigured(): boolean
}

export interface IndicatorSnapshot {
  rsi: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
  sma20: number | null
  sma50: number | null
  ema12: number | null
  ema26: number | null
  bollingerUpper: number | null
  bollingerMiddle: number | null
  bollingerLower: number | null
}

export interface TradeContext {
  trade: Trade
  candlesBefore: Candle[]
  candlesDuring: Candle[]
  candlesAfter: Candle[]
  indicatorsAtEntry: IndicatorSnapshot
  indicatorsAtExit: IndicatorSnapshot
}

export interface ReviewResult {
  id: string
  key: string
  content: string
  createdAt: number
}

export interface ForecastTimeframeData {
  timeframe: string
  candles: Candle[]
  indicators: IndicatorSnapshot
}

export interface ForecastPairData {
  pairId: string
  displayName: string
  currentPrice: number
  previousClose: number
  timeframes: ForecastTimeframeData[]
}

export interface ForecastContext {
  pairs: ForecastPairData[]
  generatedAt: number
}
