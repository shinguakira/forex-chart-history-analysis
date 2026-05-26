import type { Candle } from '@/types/candle'

/** Single data point for line-type indicators */
export interface LinePoint {
  time: number
  value: number
}

/** Bollinger Bands output */
export interface BollingerBandsResult {
  upper: LinePoint[]
  middle: LinePoint[]
  lower: LinePoint[]
}

/** MACD output */
export interface MacdResult {
  macd: LinePoint[]
  signal: LinePoint[]
  histogram: LinePoint[]
}

// ─── Moving Averages ───

export function sma(candles: Candle[], period: number): LinePoint[] {
  const result: LinePoint[] = []
  if (candles.length < period) return result

  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += candles[i].close
  }
  result.push({ time: candles[period - 1].time, value: sum / period })

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close
    result.push({ time: candles[i].time, value: sum / period })
  }
  return result
}

export function ema(candles: Candle[], period: number): LinePoint[] {
  const result: LinePoint[] = []
  if (candles.length < period) return result

  // Seed with SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += candles[i].close
  }
  let prev = sum / period
  result.push({ time: candles[period - 1].time, value: prev })

  const k = 2 / (period + 1)
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k)
    result.push({ time: candles[i].time, value: prev })
  }
  return result
}

// ─── RSI ───

export function rsi(candles: Candle[], period = 14): LinePoint[] {
  const result: LinePoint[] = []
  if (candles.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close
    if (diff > 0) avgGain += diff
    else avgLoss -= diff
  }
  avgGain /= period
  avgLoss /= period

  const rsiVal = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  result.push({ time: candles[period].time, value: rsiVal })

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const val = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    result.push({ time: candles[i].time, value: val })
  }
  return result
}

// ─── MACD ───

function emaFromValues(values: number[], period: number): number[] {
  const result: number[] = []
  if (values.length < period) return result

  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += values[i]
  }
  let prev = sum / period
  // Fill leading nulls with NaN to keep index alignment
  for (let i = 0; i < period - 1; i++) {
    result.push(Number.NaN)
  }
  result.push(prev)

  const k = 2 / (period + 1)
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

export function macd(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  const closes = candles.map((c) => c.close)
  const fastEma = emaFromValues(closes, fastPeriod)
  const slowEma = emaFromValues(closes, slowPeriod)

  // MACD line = fast EMA - slow EMA
  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (Number.isNaN(fastEma[i]) || Number.isNaN(slowEma[i]) || !fastEma[i] || !slowEma[i]) {
      macdLine.push(Number.NaN)
    } else {
      macdLine.push(fastEma[i] - slowEma[i])
    }
  }

  // Signal line = EMA of MACD line (only valid values)
  const validMacd = macdLine.filter((v) => !Number.isNaN(v))
  const signalArr = emaFromValues(validMacd, signalPeriod)

  const result: MacdResult = { macd: [], signal: [], histogram: [] }

  // Map signal back to original indices
  let validIdx = 0
  for (let i = 0; i < candles.length; i++) {
    if (Number.isNaN(macdLine[i])) continue
    const m = macdLine[i]
    const s = signalArr[validIdx]
    if (!Number.isNaN(s)) {
      result.macd.push({ time: candles[i].time, value: m })
      result.signal.push({ time: candles[i].time, value: s })
      result.histogram.push({ time: candles[i].time, value: m - s })
    }
    validIdx++
  }

  return result
}

// ─── Bollinger Bands ───

export function bollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerBandsResult {
  const result: BollingerBandsResult = { upper: [], middle: [], lower: [] }
  if (candles.length < period) return result

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close
    }
    const mean = sum / period

    let sqSum = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - mean
      sqSum += diff * diff
    }
    const stdDev = Math.sqrt(sqSum / period)

    const time = candles[i].time
    result.upper.push({ time, value: mean + stdDevMultiplier * stdDev })
    result.middle.push({ time, value: mean })
    result.lower.push({ time, value: mean - stdDevMultiplier * stdDev })
  }

  return result
}
