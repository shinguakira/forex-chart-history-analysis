import { getPairById } from '@/config/pairs'
import { fetchCandles } from '@/lib/yahoo-finance'
import type { Candle, TimeFrame } from '@/types/candle'
import type { Prediction, PredictionStatus, ValidationResult } from '@/types/prediction'

export const TIMEFRAME_MAP: Record<string, TimeFrame> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1H': '60',
  '4H': '240',
  today: '60',
  '1D': 'D',
}

export function mapTimeframeToResolution(timeframe: string): TimeFrame {
  return TIMEFRAME_MAP[timeframe] ?? '15'
}

export interface WalkResult {
  status: 'win' | 'loss' | 'pending'
  validationResult: ValidationResult | null
}

interface WalkInput {
  direction: 'long' | 'short'
  entryPrice: number
  stopLoss: number
  takeProfit: number
}

export function walkCandlesForResult(
  candles: Candle[],
  prediction: WalkInput,
  pipSize: number,
): WalkResult {
  for (const candle of candles) {
    const isLong = prediction.direction === 'long'

    const hitStop = isLong ? candle.low <= prediction.stopLoss : candle.high >= prediction.stopLoss

    const hitTarget = isLong
      ? candle.high >= prediction.takeProfit
      : candle.low <= prediction.takeProfit

    if (hitStop && hitTarget) {
      return buildResult(prediction, prediction.stopLoss, candle.time, pipSize, 'loss')
    }

    if (hitStop) {
      return buildResult(prediction, prediction.stopLoss, candle.time, pipSize, 'loss')
    }

    if (hitTarget) {
      return buildResult(prediction, prediction.takeProfit, candle.time, pipSize, 'win')
    }
  }

  return { status: 'pending', validationResult: null }
}

export async function validatePrediction(
  prediction: Prediction,
): Promise<{ status: PredictionStatus; validationResult: ValidationResult | null }> {
  const pair = getPairById(prediction.pairId)
  if (!pair) {
    throw new Error(`Unknown pair: ${prediction.pairId}`)
  }

  const resolution = mapTimeframeToResolution(prediction.timeframe)
  const period1 = Math.floor(prediction.createdAt / 1000)
  const period2 = Math.floor(Date.now() / 1000)

  const result = await fetchCandles(pair.yahooSymbol, resolution, period1, period2)
  const pipSize = pair.decimals === 3 ? 0.01 : 0.0001

  return walkCandlesForResult(result.candles, prediction, pipSize)
}

function buildResult(
  prediction: WalkInput,
  exitPrice: number,
  candleTime: number,
  pipSize: number,
  outcome: 'win' | 'loss',
): WalkResult {
  let diff = exitPrice - prediction.entryPrice
  if (prediction.direction === 'short') diff = -diff
  const pipsGained = Math.round((diff / pipSize) * 10) / 10

  return {
    status: outcome,
    validationResult: {
      exitPrice,
      exitTime: candleTime * 1000,
      pipsGained,
      result: outcome,
    },
  }
}
