import { judgementCorrect } from '@/lib/practice'
import type { PracticeTrade } from '@/types/practice'

type Verdict = 'correct' | 'wrong' | 'neutral'

const CSV_HEADERS = [
  'id',
  'mode',
  'pair',
  'timeframe',
  'cutoff_iso',
  'created_iso',
  'verdict',
  'pips',
  'replay_direction',
  'replay_entry',
  'replay_sl',
  'replay_tp',
  'replay_exit',
  'replay_exit_reason',
  'replay_hold_bars',
  'replay_note',
  'quiz_prediction',
  'quiz_bars_ahead',
  'quiz_actual_move',
  'quiz_correct',
  'setup_judgement',
  'setup_confidence',
  'setup_reason',
  'setup_outcome_pips',
  'setup_outcome_bars',
] as const

function tradeVerdict(t: PracticeTrade): Verdict {
  if (t.quiz) return t.quiz.correct ? 'correct' : 'wrong'
  if (t.setup) return judgementCorrect(t.setup.judgement, t.setup.outcomePips) ? 'correct' : 'wrong'
  if (t.replay) {
    if (t.replay.pips > 0) return 'correct'
    if (t.replay.pips < 0) return 'wrong'
    return 'neutral'
  }
  return 'neutral'
}

function tradePips(t: PracticeTrade): number | null {
  if (t.replay) return t.replay.pips
  if (t.setup) return t.setup.outcomePips
  if (t.quiz) return t.quiz.actualMove
  return null
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function tradeRow(t: PracticeTrade): string {
  return [
    t.id,
    t.mode,
    t.pairId,
    t.timeframe,
    new Date(t.cutoffTimestamp * 1000).toISOString(),
    new Date(t.createdAt).toISOString(),
    tradeVerdict(t),
    tradePips(t),
    t.replay?.direction,
    t.replay?.entryPrice,
    t.replay?.stopLoss,
    t.replay?.takeProfit,
    t.replay?.exitPrice,
    t.replay?.exitReason,
    t.replay?.holdBars,
    t.replay?.note,
    t.quiz?.prediction,
    t.quiz?.barsAhead,
    t.quiz?.actualMove,
    t.quiz?.correct,
    t.setup?.judgement,
    t.setup?.confidence,
    t.setup?.reason,
    t.setup?.outcomePips,
    t.setup?.outcomeBars,
  ]
    .map(csvCell)
    .join(',')
}

function buildCsv(trades: PracticeTrade[]): string {
  // \r\n keeps Excel and most spreadsheets happy across platforms.
  return [CSV_HEADERS.join(','), ...trades.map(tradeRow)].join('\r\n')
}

function buildJson(trades: PracticeTrade[]): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: trades.length, trades },
    null,
    2,
  )
}

function timestampedFilename(ext: 'csv' | 'json'): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return `practice-${stamp}.${ext}`
}

function downloadBlob(body: string, mimeType: string, filename: string): void {
  const blob = new Blob([body], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportPracticeCsv(trades: PracticeTrade[]): void {
  downloadBlob(buildCsv(trades), 'text/csv;charset=utf-8', timestampedFilename('csv'))
}

export function exportPracticeJson(trades: PracticeTrade[]): void {
  downloadBlob(buildJson(trades), 'application/json', timestampedFilename('json'))
}
