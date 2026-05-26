import type { TimeFrame } from './candle'

export type PracticeMode = 'replay' | 'quiz' | 'setup'

/** Practice tab — covers the three trading modes plus the review/history tab. */
export type PracticeView = PracticeMode | 'history'

export type ReplayDirection = 'long' | 'short'
export type ReplayResult = 'win' | 'loss' | 'manual' | 'breakeven'

export interface ReplayDetail {
  direction: ReplayDirection
  entryPrice: number
  stopLoss: number
  takeProfit: number
  exitPrice: number
  exitReason: 'tp' | 'sl' | 'manual'
  entryTime: number
  exitTime: number
  pips: number
  result: ReplayResult
  holdBars: number
  note?: string
}

export interface QuizDetail {
  prediction: 'up' | 'down'
  barsAhead: number
  actualMove: number
  correct: boolean
}

export interface SetupDetail {
  judgement: 'long' | 'short' | 'no-trade'
  confidence: 1 | 2 | 3 | 4 | 5
  reason: string
  outcomePips: number
  outcomeBars: number
}

export interface PracticeTrade {
  id: string
  mode: PracticeMode
  pairId: string
  timeframe: TimeFrame
  cutoffTimestamp: number
  createdAt: number
  replay?: ReplayDetail
  quiz?: QuizDetail
  setup?: SetupDetail
}
