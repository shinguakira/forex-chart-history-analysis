import { PERIOD_SECONDS, POLLING_INTERVAL } from '@/config/constants'
import type { Candle, Period, TimeFrame } from '@/types/candle'
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

export function computeDateRange(
  period: Period,
  goToTimestamp: number | null,
): { period1: number; period2: number } {
  const seconds = PERIOD_SECONDS[period]
  if (goToTimestamp != null) {
    return { period1: goToTimestamp - seconds, period2: goToTimestamp }
  }
  // Round to nearest polling interval for query key stability
  const now = Math.floor(Date.now() / 1000)
  const rounded = Math.floor(now / (POLLING_INTERVAL / 1000)) * (POLLING_INTERVAL / 1000)
  return { period1: rounded - seconds, period2: rounded }
}

export interface FetchCandlesResult {
  candles: Candle[]
  regularMarketPrice: number
  previousClose: number
}

export async function fetchCandles(
  yahooSymbol: string,
  resolution: TimeFrame,
  period1: number,
  period2: number,
): Promise<FetchCandlesResult> {
  const interval = INTERVAL_MAP[resolution]
  const base = getBaseUrl()
  const url = `${base}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&period1=${period1}&period2=${period2}`

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
