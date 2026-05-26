import { useMemo } from 'react'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { judgementCorrect } from '@/lib/practice'
import type { PracticeTrade } from '@/types/practice'

function aggregate(trades: PracticeTrade[]) {
  const replay = trades.filter((t) => t.mode === 'replay' && t.replay)
  const quiz = trades.filter((t) => t.mode === 'quiz' && t.quiz)
  const setup = trades.filter((t) => t.mode === 'setup' && t.setup)

  const replayWins = replay.filter((t) => (t.replay?.pips ?? 0) > 0).length
  const replayLosses = replay.filter((t) => (t.replay?.pips ?? 0) < 0).length
  const replayPips = replay.reduce((acc, t) => acc + (t.replay?.pips ?? 0), 0)
  const replayWinRate =
    replayWins + replayLosses > 0 ? Math.round((replayWins / (replayWins + replayLosses)) * 100) : 0

  const quizCorrect = quiz.filter((t) => t.quiz?.correct).length
  const quizAccuracy = quiz.length > 0 ? Math.round((quizCorrect / quiz.length) * 100) : 0

  const setupCorrect = setup.filter((t) =>
    t.setup ? judgementCorrect(t.setup.judgement, t.setup.outcomePips) : false,
  ).length
  const setupAccuracy = setup.length > 0 ? Math.round((setupCorrect / setup.length) * 100) : 0

  return {
    total: trades.length,
    replay: {
      total: replay.length,
      wins: replayWins,
      losses: replayLosses,
      pips: Math.round(replayPips * 10) / 10,
      winRate: replayWinRate,
    },
    quiz: {
      total: quiz.length,
      correct: quizCorrect,
      accuracy: quizAccuracy,
    },
    setup: {
      total: setup.length,
      correct: setupCorrect,
      accuracy: setupAccuracy,
    },
  }
}

interface Props {
  filterPair?: string
}

export function PracticeStats({ filterPair }: Props) {
  const { trades, clearAll } = usePracticeSessions()

  const filtered = useMemo(
    () => (filterPair ? trades.filter((t) => t.pairId === filterPair) : trades),
    [trades, filterPair],
  )
  const stats = useMemo(() => aggregate(filtered), [filtered])

  if (stats.total === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-500 text-center">
        No practice trades yet — pick a mode below and start.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-medium text-gray-400">
          All Modes ({stats.total} sessions)
        </div>
        <button
          type="button"
          className="text-[10px] text-gray-600 hover:text-red-400"
          onClick={() => {
            if (confirm('Delete all practice sessions?')) clearAll()
          }}
        >
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {/* Replay */}
        <div className="rounded bg-gray-800 p-2">
          <div className="text-[10px] text-gray-500 mb-1">Replay</div>
          <div className="text-sm text-gray-200 font-medium">{stats.replay.total}</div>
          {stats.replay.total > 0 && (
            <>
              <div
                className={`text-[11px] mt-1 ${
                  stats.replay.winRate >= 50 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.replay.winRate}% WR
              </div>
              <div
                className={`text-[10px] ${
                  stats.replay.pips >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.replay.pips > 0 ? '+' : ''}
                {stats.replay.pips}p
              </div>
            </>
          )}
        </div>
        {/* Quiz */}
        <div className="rounded bg-gray-800 p-2">
          <div className="text-[10px] text-gray-500 mb-1">Quiz</div>
          <div className="text-sm text-gray-200 font-medium">{stats.quiz.total}</div>
          {stats.quiz.total > 0 && (
            <>
              <div
                className={`text-[11px] mt-1 ${
                  stats.quiz.accuracy >= 50 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.quiz.accuracy}% Acc
              </div>
              <div className="text-[10px] text-gray-500">
                {stats.quiz.correct}/{stats.quiz.total}
              </div>
            </>
          )}
        </div>
        {/* Setup */}
        <div className="rounded bg-gray-800 p-2">
          <div className="text-[10px] text-gray-500 mb-1">Setup</div>
          <div className="text-sm text-gray-200 font-medium">{stats.setup.total}</div>
          {stats.setup.total > 0 && (
            <>
              <div
                className={`text-[11px] mt-1 ${
                  stats.setup.accuracy >= 50 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.setup.accuracy}% Acc
              </div>
              <div className="text-[10px] text-gray-500">
                {stats.setup.correct}/{stats.setup.total}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
