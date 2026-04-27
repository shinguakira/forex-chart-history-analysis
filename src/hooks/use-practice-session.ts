import { useEffect, useState } from 'react'
import type { PairConfig } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import type { Candle, Period, TimeFrame } from '@/types/candle'

export type ScenarioFilter = 'random' | 'high-volatility' | 'consolidation' | 'gap'

interface Args {
  pair: PairConfig
  timeframe: TimeFrame
  period: Period
  scenario: ScenarioFilter
}

interface SessionState {
  candles: Candle[]
  isLoading: boolean
  cursorIndex: number | null
  goToTimestamp: number | null
  randomJump: () => void
  setCursorIndex: (n: number | null) => void
  advanceCursor: (delta: number) => void
}

/**
 * Practice fetch window per timeframe — kept short so target + window stays within
 * Yahoo Finance intraday limits (1m=7d, 5m/15m=60d, 1h/4h=730d).
 */
export const PERIOD_FOR_PRACTICE_TF: Record<TimeFrame, Period> = {
  '1': '1d',
  '5': '5d',
  '15': '5d',
  '60': '3mo',
  '240': '6mo',
  D: '2y',
  W: '5y',
}

/**
 * Pick a random target timestamp within the timeframe's effective Yahoo Finance history,
 * leaving room for PERIOD_FOR_PRACTICE_TF to fetch backwards without exceeding limits.
 */
export function getRandomTargetTimestamp(timeframe: TimeFrame): number {
  const now = Math.floor(Date.now() / 1000)
  const day = 86_400
  let minAge: number
  let maxAge: number
  switch (timeframe) {
    case '1':
      // 1m limit ~7d, fetch=1d
      minAge = 1 * day
      maxAge = 5 * day
      break
    case '5':
      // 5m limit ~60d, fetch=5d
      minAge = 5 * day
      maxAge = 50 * day
      break
    case '15':
      // 15m limit ~60d, fetch=5d
      minAge = 5 * day
      maxAge = 50 * day
      break
    case '60':
      // 1h limit ~730d, fetch=90d
      minAge = 30 * day
      maxAge = 600 * day
      break
    case '240':
      // 4h limit ~730d, fetch=180d
      minAge = 60 * day
      maxAge = 500 * day
      break
    case 'D':
      // daily: no limit
      minAge = 90 * day
      maxAge = 1500 * day
      break
    case 'W':
      // weekly: no limit
      minAge = 180 * day
      maxAge = 3000 * day
      break
  }
  return now - Math.floor(minAge + Math.random() * (maxAge - minAge))
}

export function pickScenarioCursor(candles: Candle[], scenario: ScenarioFilter): number {
  // Default candidate band: middle 50% so we have room before & after
  const minIdx = Math.floor(candles.length * 0.25)
  const maxIdx = Math.floor(candles.length * 0.75)

  if (scenario === 'random' || candles.length < 20) {
    return Math.floor(minIdx + Math.random() * (maxIdx - minIdx))
  }

  // Score each candidate; pick one of the top-scoring with randomness
  const scores: Array<{ idx: number; score: number }> = []
  const lookback = 10
  for (let i = minIdx; i <= maxIdx; i++) {
    const window = candles.slice(Math.max(0, i - lookback), i + 1)
    if (window.length < 5) continue

    const ranges = window.map((c) => c.high - c.low)
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length
    const last = candles[i]
    const prev = candles[i - 1]
    const lastRange = last.high - last.low
    const gap = prev ? Math.abs(last.open - prev.close) : 0
    const closes = window.map((c) => c.close)
    const closeMax = Math.max(...closes)
    const closeMin = Math.min(...closes)
    const closeSpread = closeMax - closeMin
    const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length

    let score = 0
    if (scenario === 'high-volatility') {
      score = (lastRange / (avgPrice || 1)) * 1000 + (avgRange / (avgPrice || 1)) * 500
    } else if (scenario === 'consolidation') {
      score = -(closeSpread / (avgPrice || 1)) * 1000
    } else if (scenario === 'gap') {
      score = (gap / (avgPrice || 1)) * 10000
    }
    scores.push({ idx: i, score })
  }

  if (scores.length === 0) {
    return Math.floor(minIdx + Math.random() * (maxIdx - minIdx))
  }

  scores.sort((a, b) => b.score - a.score)
  const topN = scores.slice(0, Math.max(5, Math.floor(scores.length * 0.1)))
  const pick = topN[Math.floor(Math.random() * topN.length)]
  return pick.idx
}

export function usePracticeSession({ pair, timeframe, period, scenario }: Args): SessionState {
  const [goToTimestamp, setGoToTimestamp] = useState<number | null>(null)
  const [cursorIndex, setCursorIndex] = useState<number | null>(null)
  const [pendingPick, setPendingPick] = useState(false)

  const { candles, isLoading } = useChartData(pair, timeframe, period, goToTimestamp)

  // After data loads following a jump, position cursor according to scenario
  useEffect(() => {
    if (!pendingPick) return
    if (candles.length === 0) return
    const idx = pickScenarioCursor(candles, scenario)
    setCursorIndex(idx)
    setPendingPick(false)
  }, [pendingPick, candles, scenario])

  const randomJump = () => {
    const target = getRandomTargetTimestamp(timeframe)
    setGoToTimestamp(target)
    setCursorIndex(null)
    setPendingPick(true)
  }

  const advanceCursor = (delta: number) => {
    setCursorIndex((c) => {
      if (c == null) return c
      return Math.max(0, Math.min(candles.length - 1, c + delta))
    })
  }

  return {
    candles,
    isLoading,
    cursorIndex,
    goToTimestamp,
    randomJump,
    setCursorIndex,
    advanceCursor,
  }
}
