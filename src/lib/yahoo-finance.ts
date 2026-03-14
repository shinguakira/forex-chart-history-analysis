import type { Candle, TimeFrame } from '@/types/candle'
import type { YahooChartResponse } from '@/types/yahoo-finance'

const INTERVAL_MAP: Record<TimeFrame, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  D: '1d',
  W: '1wk',
}

// Range limits balanced for performance (~200-300KB, <3000 candles)
// 1m/1d=1,439本(118KB) | 5m/5d=~1,440本(~120KB) | 15m/1mo=1,920本(164KB)
// 1h/6mo=~3,000本(~250KB) | 4h/1y=~1,500本(~150KB) | 1d/10y=2,611本(271KB)
const RANGE_MAP: Record<TimeFrame, string> = {
  '1': '1d',
  '5': '5d',
  '15': '1mo',
  '60': '6mo',
  '240': '1y',
  D: '10y',
  W: 'max',
}

function getBaseUrl(): string {
  if (import.meta.env.DEV) {
    return '/api/yahoo'
  }
  return 'https://query1.finance.yahoo.com'
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url)
    if (res.status === 429 && i < retries) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
      continue
    }
    return res
  }
  throw new Error('Max retries exceeded')
}

export interface FetchCandlesResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
}

export async function fetchCandles(
  yahooSymbol: string,
  resolution: TimeFrame,
): Promise<FetchCandlesResult> {
  const interval = INTERVAL_MAP[resolution]
  const range = RANGE_MAP[resolution]
  const base = getBaseUrl()
  const url = `${base}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`

  const res = await fetchWithRetry(url)
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`)

  const data = (await res.json()) as YahooChartResponse

  if (data.chart.error) {
    throw new Error(data.chart.error.description)
  }

  const result = data.chart.result[0]
  if (!result?.timestamp) {
    return {
      candles: [],
      regularMarketPrice: result?.meta?.regularMarketPrice ?? 0,
      previousClose: result?.meta?.previousClose ?? 0,
    }
  }

  const { timestamp, indicators } = result
  const quote = indicators.quote[0]
  const candles: Candle[] = []

  for (let i = 0; i < timestamp.length; i++) {
    const o = quote.open[i]
    const h = quote.high[i]
    const l = quote.low[i]
    const c = quote.close[i]
    if (o == null || h == null || l == null || c == null) continue

    candles.push({
      time: timestamp[i],
      open: o,
      high: h,
      low: l,
      close: c,
    })
  }

  return {
    candles,
    regularMarketPrice: result.meta.regularMarketPrice,
    previousClose: result.meta.previousClose,
  }
}
