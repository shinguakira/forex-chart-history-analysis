export interface YahooChartResult {
  meta: {
    currency: string
    symbol: string
    regularMarketPrice: number
    previousClose: number
    validRanges: string[]
  }
  timestamp: number[]
  indicators: {
    quote: [
      {
        open: (number | null)[]
        high: (number | null)[]
        low: (number | null)[]
        close: (number | null)[]
      },
    ]
  }
}

export interface YahooChartResponse {
  chart: {
    result: YahooChartResult[]
    error: null | { code: string; description: string }
  }
}
