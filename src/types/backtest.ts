export interface BacktestConfig {
  startTimestamp: number
  endTimestamp: number
  intervalDays: number
  pairIds: string[]
  count?: number
}

export interface BacktestValidationResult {
  exitPrice: number
  exitTime: number
  pipsGained: number
  result: 'win' | 'loss'
}

export type BacktestStatus = 'win' | 'loss' | 'expired'

export interface BacktestPrediction {
  id: string
  pairId: string
  direction: 'long' | 'short'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  timeframe: string
  cutoffTimestamp: number
  status: BacktestStatus
  validationResult: BacktestValidationResult | null
}

export interface BacktestRunStats {
  total: number
  wins: number
  losses: number
  expired: number
  winRate: number
  totalPips: number
}

export interface BacktestRun {
  id: string
  config: BacktestConfig
  predictions: BacktestPrediction[]
  model: string
  provider: 'claude' | 'ollama'
  createdAt: number
  stats: BacktestRunStats
}
