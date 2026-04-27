export type PredictionDirection = 'long' | 'short'
export type PredictionStatus = 'pending' | 'win' | 'loss' | 'expired'

export interface ValidationResult {
  exitPrice: number
  exitTime: number
  pipsGained: number
  result: 'win' | 'loss'
}

export interface Prediction {
  id: string
  pairId: string
  direction: PredictionDirection
  entryPrice: number
  stopLoss: number
  takeProfit: number
  timeframe: string
  model: string
  provider: 'claude' | 'ollama'
  createdAt: number
  status: PredictionStatus
  validatedAt: number | null
  validationResult: ValidationResult | null
}
