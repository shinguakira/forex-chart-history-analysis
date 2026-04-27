import { useEffect, useMemo, useState } from 'react'
import { TIMEFRAMES } from '@/config/constants'
import { getPairById, PAIRS } from '@/config/pairs'
import {
  PERIOD_FOR_PRACTICE_TF,
  type ScenarioFilter,
  usePracticeSession,
} from '@/hooks/use-practice-session'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { formatDateJST } from '@/lib/date-utils'
import { usePracticeStore } from '@/store/practice-store'
import type { TimeFrame } from '@/types/candle'
import type { PracticeTrade } from '@/types/practice'
import { type ChartMarker, PracticeChart } from './PracticeChart'

const SCENARIOS: Array<{ id: ScenarioFilter; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'high-volatility', label: 'Volatile' },
  { id: 'consolidation', label: 'Range' },
  { id: 'gap', label: 'Gap' },
]

const BARS_AHEAD_OPTIONS = [5, 10, 20, 50]

function pipMultiplier(decimals: number): number {
  return decimals === 3 ? 100 : 10000
}

export function QuizMode() {
  const pairId = usePracticeStore((s) => s.pairId)
  const timeframe = usePracticeStore((s) => s.timeframe)
  const blindMode = usePracticeStore((s) => s.blindMode)
  const setPairId = usePracticeStore((s) => s.setPairId)
  const setTimeframe = usePracticeStore((s) => s.setTimeframe)
  const setBlindMode = usePracticeStore((s) => s.setBlindMode)

  const pair = getPairById(pairId) ?? PAIRS[0]
  const [scenario, setScenario] = useState<ScenarioFilter>('random')
  const [barsAhead, setBarsAhead] = useState(10)

  const session = usePracticeSession({
    pair,
    timeframe,
    period: PERIOD_FOR_PRACTICE_TF[timeframe],
    scenario,
  })

  const [phase, setPhase] = useState<'idle' | 'asking' | 'revealed'>('idle')
  const [pick, setPick] = useState<'up' | 'down' | null>(null)
  const [streak, setStreak] = useState({ correct: 0, wrong: 0 })

  const { candles, cursorIndex, isLoading, randomJump, goToTimestamp } = session
  const { addTrade, trades } = usePracticeSessions()

  // Switch to asking phase after loading & cursor set
  useEffect(() => {
    if (cursorIndex != null && candles.length > 0 && phase === 'idle') {
      setPhase('asking')
    }
  }, [cursorIndex, candles.length, phase])

  const askCandle = cursorIndex != null ? candles[cursorIndex] : null
  const revealIdx =
    cursorIndex != null ? Math.min(cursorIndex + barsAhead, candles.length - 1) : null
  const revealCandle = revealIdx != null ? candles[revealIdx] : null

  const submit = (choice: 'up' | 'down') => {
    if (!askCandle || !revealCandle || cursorIndex == null || revealIdx == null) return
    const move = revealCandle.close - askCandle.close
    const correct = (choice === 'up' && move > 0) || (choice === 'down' && move < 0)
    setPick(choice)
    setPhase('revealed')
    setStreak((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }))
    const trade: PracticeTrade = {
      id: crypto.randomUUID(),
      mode: 'quiz',
      pairId: pair.id,
      timeframe,
      cutoffTimestamp: askCandle.time,
      createdAt: Date.now(),
      quiz: {
        prediction: choice,
        barsAhead,
        actualMove: Math.round(move * pipMultiplier(pair.decimals) * 10) / 10,
        correct,
      },
    }
    addTrade(trade)
  }

  const next = () => {
    setPick(null)
    setPhase('idle')
    randomJump()
  }

  const visibleCursor = phase === 'revealed' ? revealIdx : cursorIndex

  // Marker at the cutoff in revealed phase
  const markers = useMemo<ChartMarker[]>(() => {
    if (phase !== 'revealed' || !askCandle) return []
    return [
      {
        time: askCandle.time,
        position: 'aboveBar',
        shape: 'circle',
        color: '#facc15',
        text: 'Cutoff',
      },
    ]
  }, [phase, askCandle])

  // Stats
  const quizTrades = trades.filter((t) => t.mode === 'quiz' && t.quiz)
  const stats = useMemo(() => {
    const total = quizTrades.length
    const correct = quizTrades.filter((t) => t.quiz?.correct).length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return { total, correct, wrong: total - correct, accuracy }
  }, [quizTrades])

  const movePips =
    askCandle && revealCandle
      ? Math.round((revealCandle.close - askCandle.close) * pipMultiplier(pair.decimals) * 10) / 10
      : 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      {/* ─── Left: chart + question ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pairId}
            onChange={(e) => setPairId(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
          >
            {PAIRS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeFrame)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.resolution} value={tf.resolution}>
                {tf.label}
              </option>
            ))}
          </select>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as ScenarioFilter)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={barsAhead}
            onChange={(e) => setBarsAhead(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
          >
            {BARS_AHEAD_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} bars
              </option>
            ))}
          </select>
          <button
            type="button"
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => {
              setPhase('idle')
              setPick(null)
              randomJump()
            }}
          >
            🎲 New
          </button>
          <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
            />
            Blind
          </label>
        </div>

        <div className="rounded-lg border border-gray-800 bg-[#0f1117] h-[480px] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading chart...
            </div>
          ) : candles.length === 0 && goToTimestamp != null ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-2">
              <div>No data for that timestamp on this timeframe.</div>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => {
                  setPhase('idle')
                  setPick(null)
                  randomJump()
                }}
              >
                🎲 Try Again
              </button>
            </div>
          ) : candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Press 🎲 New to start a quiz
            </div>
          ) : (
            <PracticeChart
              candles={candles}
              cursorIndex={visibleCursor}
              markers={markers}
              blindMode={blindMode}
              decimals={pair.decimals}
            />
          )}
        </div>

        {/* Question / answer area */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          {phase === 'asking' && askCandle && (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Where will price go in the next{' '}
                <span className="text-white font-bold">{barsAhead}</span> bars?
              </div>
              {!blindMode && (
                <div className="text-[11px] text-gray-500">
                  Now: {formatDateJST(askCandle.time * 1000)} @{' '}
                  {askCandle.close.toFixed(pair.decimals)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="px-4 py-3 text-sm rounded bg-green-600 text-white hover:bg-green-500"
                  onClick={() => submit('up')}
                >
                  ▲ UP
                </button>
                <button
                  type="button"
                  className="px-4 py-3 text-sm rounded bg-red-600 text-white hover:bg-red-500"
                  onClick={() => submit('down')}
                >
                  ▼ DOWN
                </button>
              </div>
            </div>
          )}
          {phase === 'revealed' && pick && askCandle && revealCandle && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">Your call:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    pick === 'up' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {pick.toUpperCase()}
                </span>
                <span className="text-sm text-gray-300 ml-3">Result:</span>
                <span
                  className={`text-sm font-bold ${
                    movePips > 0
                      ? 'text-green-400'
                      : movePips < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {movePips > 0 ? '+' : ''}
                  {movePips} pips ({movePips > 0 ? 'up' : movePips < 0 ? 'down' : 'flat'})
                </span>
                <span
                  className={`ml-auto px-2 py-1 text-xs font-bold rounded ${
                    (pick === 'up' && movePips > 0) || (pick === 'down' && movePips < 0)
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {(pick === 'up' && movePips > 0) || (pick === 'down' && movePips < 0)
                    ? '✓ Correct'
                    : '✗ Wrong'}
                </span>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={next}
              >
                Next Question →
              </button>
            </div>
          )}
          {phase === 'idle' && (
            <div className="text-xs text-gray-500 text-center py-2">Click 🎲 New to start.</div>
          )}
        </div>
      </div>

      {/* ─── Right: stats ─── */}
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Session Streak</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-green-400">{streak.correct}</span>
            <span className="text-gray-600">/</span>
            <span className="text-2xl font-bold text-red-400">{streak.wrong}</span>
            {streak.correct + streak.wrong > 0 && (
              <span className="ml-auto text-sm text-gray-300">
                {Math.round((streak.correct / (streak.correct + streak.wrong)) * 100)}%
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">All-Time Quiz</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-gray-500">Total</div>
              <div className="text-sm text-gray-200 font-medium">{stats.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Correct</div>
              <div className="text-sm text-green-400 font-medium">{stats.correct}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Accuracy</div>
              <div
                className={`text-sm font-medium ${
                  stats.accuracy >= 50 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.accuracy}%
              </div>
            </div>
          </div>
        </div>

        {/* Recent quiz history */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Recent Quizzes</div>
          {quizTrades.length === 0 ? (
            <div className="text-[10px] text-gray-600">No quizzes yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {quizTrades.slice(0, 30).map((t) => {
                const q = t.quiz
                if (!q) return null
                const p = getPairById(t.pairId)
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-gray-800"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-1 py-0.5 text-[9px] font-bold uppercase rounded ${
                          q.prediction === 'up'
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {q.prediction === 'up' ? '▲' : '▼'}
                      </span>
                      <span className="text-gray-400 truncate">{p?.displayName ?? t.pairId}</span>
                      <span className="text-gray-600">{t.timeframe}</span>
                      <span className="text-gray-600">{q.barsAhead}b</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={q.actualMove >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {q.actualMove > 0 ? '+' : ''}
                        {q.actualMove}p
                      </span>
                      <span className={q.correct ? 'text-green-400' : 'text-red-400'}>
                        {q.correct ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
