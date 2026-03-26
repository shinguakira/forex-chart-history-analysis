import { getPairById } from '@/config/pairs'
import { mapTimeframeToResolution, walkCandlesForResult } from '@/lib/predictions/validate'
import { fetchCandles } from '@/lib/yahoo-finance'
import type { BacktestStatus, BacktestValidationResult } from '@/types/backtest'

const MAX_HORIZON = 86_400 // 1 day max holding

const HORIZON_SECONDS: Record<string, number> = {
  '5m': 9_000,
  '15m': 27_000,
  '1H': 86_400,
  '4H': 86_400,
  today: 86_400,
  '1D': 86_400,
}

function getHorizon(timeframe: string): number {
  const h = HORIZON_SECONDS[timeframe] ?? 86_400
  return Math.min(h, MAX_HORIZON)
}

export async function validateBacktestPrediction(
  prediction: {
    direction: 'long' | 'short'
    entryPrice: number
    stopLoss: number
    takeProfit: number
    timeframe: string
  },
  cutoffMs: number,
  pairId: string,
): Promise<{ status: BacktestStatus; validationResult: BacktestValidationResult | null }> {
  const pair = getPairById(pairId)
  if (!pair) {
    throw new Error(`Unknown pair: ${pairId}`)
  }

  const resolution = mapTimeframeToResolution(prediction.timeframe)
  const cutoffSec = Math.floor(cutoffMs / 1000)
  const horizon = getHorizon(prediction.timeframe)

  const result = await fetchCandles(pair.yahooSymbol, resolution, cutoffSec, cutoffSec + horizon)
  const pipSize = pair.decimals === 3 ? 0.01 : 0.0001

  const walkResult = walkCandlesForResult(result.candles, prediction, pipSize)

  if (walkResult.status === 'pending') {
    return { status: 'expired', validationResult: null }
  }

  return {
    status: walkResult.status,
    validationResult: walkResult.validationResult,
  }
}
