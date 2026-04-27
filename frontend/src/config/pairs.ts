export interface PairConfig {
  id: string
  displayName: string
  yahooSymbol: string
  decimals: number
}

export const PAIRS: PairConfig[] = [
  { id: 'USD_JPY', displayName: 'USD/JPY', yahooSymbol: 'USDJPY=X', decimals: 3 },
  { id: 'EUR_USD', displayName: 'EUR/USD', yahooSymbol: 'EURUSD=X', decimals: 5 },
  { id: 'EUR_JPY', displayName: 'EUR/JPY', yahooSymbol: 'EURJPY=X', decimals: 3 },
  { id: 'USD_CAD', displayName: 'USD/CAD', yahooSymbol: 'USDCAD=X', decimals: 5 },
  { id: 'CAD_JPY', displayName: 'CAD/JPY', yahooSymbol: 'CADJPY=X', decimals: 3 },
  { id: 'AUD_USD', displayName: 'AUD/USD', yahooSymbol: 'AUDUSD=X', decimals: 5 },
  { id: 'AUD_JPY', displayName: 'AUD/JPY', yahooSymbol: 'AUDJPY=X', decimals: 3 },
  { id: 'NZD_USD', displayName: 'NZD/USD', yahooSymbol: 'NZDUSD=X', decimals: 5 },
  { id: 'NZD_JPY', displayName: 'NZD/JPY', yahooSymbol: 'NZDJPY=X', decimals: 3 },
]

export const DEFAULT_PAIR = PAIRS[0]

export function getPairById(id: string): PairConfig | undefined {
  return PAIRS.find((p) => p.id === id)
}
