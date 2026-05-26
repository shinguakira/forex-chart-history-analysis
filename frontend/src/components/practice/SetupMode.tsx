import {
  ArrowRight,
  Bot,
  Check,
  Dices,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { TIMEFRAMES } from '@/config/constants'
import { getPairById, PAIRS } from '@/config/pairs'
import {
  PERIOD_FOR_PRACTICE_TF,
  type ScenarioFilter,
  usePracticeSession,
} from '@/hooks/use-practice-session'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { formatDateJST } from '@/lib/date-utils'
import { judgementCorrect, pipsBetween, type SetupJudgement } from '@/lib/practice'
import { usePracticeStore } from '@/store/practice-store'
import type { TimeFrame } from '@/types/candle'
import type { PracticeTrade } from '@/types/practice'
import { AIReviewModal } from './AIReviewModal'
import { type ChartMarker, PracticeChart } from './PracticeChart'

const SCENARIOS: Array<{ id: ScenarioFilter; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'high-volatility', label: 'Volatile' },
  { id: 'consolidation', label: 'Range' },
  { id: 'gap', label: 'Gap' },
]

const BARS_AHEAD_OPTIONS = [10, 20, 50, 100]

type Judgement = SetupJudgement

export function SetupMode() {
  const pairId = usePracticeStore((s) => s.pairId)
  const timeframe = usePracticeStore((s) => s.timeframe)
  const blindMode = usePracticeStore((s) => s.blindMode)
  const setPairId = usePracticeStore((s) => s.setPairId)
  const setTimeframe = usePracticeStore((s) => s.setTimeframe)
  const setBlindMode = usePracticeStore((s) => s.setBlindMode)
  const indicators = usePracticeStore((s) => s.indicators)
  const toggleIndicator = usePracticeStore((s) => s.toggleIndicator)

  const pair = getPairById(pairId) ?? PAIRS[0]
  const [scenario, setScenario] = useState<ScenarioFilter>('random')
  const [barsAhead, setBarsAhead] = useState(20)

  const session = usePracticeSession({
    pair,
    timeframe,
    period: PERIOD_FOR_PRACTICE_TF[timeframe],
    scenario,
  })

  const [phase, setPhase] = useState<'idle' | 'asking' | 'revealed'>('idle')
  const [judgement, setJudgement] = useState<Judgement | null>(null)
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [reason, setReason] = useState('')
  const [reviewTrade, setReviewTrade] = useState<PracticeTrade | null>(null)

  const { candles, cursorIndex, isLoading, randomJump, goToTimestamp } = session
  const { addTrade, trades } = usePracticeSessions()

  useEffect(() => {
    if (cursorIndex != null && candles.length > 0 && phase === 'idle') {
      setPhase('asking')
    }
  }, [cursorIndex, candles.length, phase])

  const askCandle = cursorIndex != null ? candles[cursorIndex] : null
  const revealIdx =
    cursorIndex != null ? Math.min(cursorIndex + barsAhead, candles.length - 1) : null
  const revealCandle = revealIdx != null ? candles[revealIdx] : null

  const submit = () => {
    if (!judgement || !askCandle || !revealCandle || cursorIndex == null || revealIdx == null)
      return
    const movePips = pipsBetween(askCandle.close, revealCandle.close, pair.decimals)
    setPhase('revealed')
    const trade: PracticeTrade = {
      id: crypto.randomUUID(),
      mode: 'setup',
      pairId: pair.id,
      timeframe,
      cutoffTimestamp: askCandle.time,
      createdAt: Date.now(),
      setup: {
        judgement,
        confidence,
        reason: reason.trim(),
        outcomePips: movePips,
        outcomeBars: revealIdx - cursorIndex,
      },
    }
    addTrade(trade)
  }

  const next = () => {
    setJudgement(null)
    setConfidence(3)
    setReason('')
    setPhase('idle')
    randomJump()
  }

  const visibleCursor = phase === 'revealed' ? revealIdx : cursorIndex

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

  const setupTrades = trades.filter((t) => t.mode === 'setup' && t.setup)
  const stats = useMemo(() => {
    const total = setupTrades.length
    const correct = setupTrades.filter((t) => {
      const s = t.setup
      return s ? judgementCorrect(s.judgement, s.outcomePips) : false
    }).length
    const byConfidence: Record<number, { total: number; correct: number }> = {}
    for (const t of setupTrades) {
      const s = t.setup
      if (!s) continue
      const k = s.confidence
      if (!byConfidence[k]) byConfidence[k] = { total: 0, correct: 0 }
      byConfidence[k].total += 1
      if (judgementCorrect(s.judgement, s.outcomePips)) byConfidence[k].correct += 1
    }
    return {
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      byConfidence,
    }
  }, [setupTrades])

  const movePips =
    askCandle && revealCandle ? pipsBetween(askCandle.close, revealCandle.close, pair.decimals) : 0
  const lastCorrect = judgement ? judgementCorrect(judgement, movePips) : false

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
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
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => {
              setPhase('idle')
              setJudgement(null)
              setReason('')
              randomJump()
            }}
          >
            <Dices size={14} aria-hidden />
            New
          </button>
          <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
            />
            Blind
          </label>
          <div className="ml-auto">
            <IndicatorPanel indicators={indicators} onToggle={toggleIndicator} />
          </div>
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
                className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => {
                  setPhase('idle')
                  setJudgement(null)
                  setReason('')
                  randomJump()
                }}
              >
                <Dices size={14} aria-hidden />
                Try Again
              </button>
            </div>
          ) : candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Press New to start
            </div>
          ) : (
            <PracticeChart
              candles={candles}
              cursorIndex={visibleCursor}
              markers={markers}
              blindMode={blindMode}
              decimals={pair.decimals}
              indicators={indicators}
            />
          )}
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          {phase === 'asking' && askCandle && (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                What's your read? Resolves in{' '}
                <span className="text-white font-bold">{barsAhead}</span> bars.
              </div>
              {!blindMode && (
                <div className="text-[11px] text-gray-500">
                  Now: {formatDateJST(askCandle.time * 1000)} @{' '}
                  {askCandle.close.toFixed(pair.decimals)}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(['long', 'short', 'no-trade'] as Judgement[]).map((j) => {
                  const Icon = j === 'long' ? TrendingUp : j === 'short' ? TrendingDown : Minus
                  const label = j === 'long' ? 'Long' : j === 'short' ? 'Short' : 'No Trade'
                  return (
                    <button
                      key={j}
                      type="button"
                      className={`flex items-center justify-center gap-1 px-3 py-2 text-xs rounded font-medium ${
                        judgement === j
                          ? j === 'long'
                            ? 'bg-green-600 text-white'
                            : j === 'short'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                      onClick={() => setJudgement(j)}
                    >
                      <Icon size={14} aria-hidden />
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-gray-300 font-medium">{confidence} / 5</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`flex-1 py-1 text-xs rounded ${
                        confidence >= n ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'
                      }`}
                      onClick={() => setConfidence(n as 1 | 2 | 3 | 4 | 5)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this read? (e.g. higher highs, RSI divergence, support level holding)"
                rows={2}
                className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                type="button"
                disabled={!judgement}
                className="w-full px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
                onClick={submit}
              >
                Submit & Reveal
              </button>
            </div>
          )}
          {phase === 'revealed' && judgement && askCandle && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-300">Your call:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    judgement === 'long'
                      ? 'bg-green-900/50 text-green-400'
                      : judgement === 'short'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {judgement.toUpperCase()}
                </span>
                <span className="text-[11px] text-gray-500">conf {confidence}/5</span>
                <span className="text-sm text-gray-300 ml-3">Outcome:</span>
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
                  {movePips} pips
                </span>
                <span
                  className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${
                    lastCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {lastCorrect ? (
                    <>
                      <Check size={12} aria-hidden />
                      Right
                    </>
                  ) : (
                    <>
                      <X size={12} aria-hidden />
                      Wrong
                    </>
                  )}
                </span>
              </div>
              {reason && (
                <div className="text-[11px] text-gray-400 italic border-l-2 border-gray-700 pl-2">
                  {reason}
                </div>
              )}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={next}
              >
                Next Setup
                <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          )}
          {phase === 'idle' && (
            <div className="text-xs text-gray-500 text-center py-2">Click New to start.</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Setup Stats</div>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
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
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500">By confidence</div>
            {[1, 2, 3, 4, 5].map((c) => {
              const e = stats.byConfidence[c]
              const acc = e && e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0
              return (
                <div key={c} className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-500 w-4">{c}</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${acc >= 50 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                  <span className="text-gray-400 w-12 text-right">
                    {e?.total ?? 0} · {acc}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Recent Setups</div>
          {setupTrades.length === 0 ? (
            <div className="text-[10px] text-gray-600">No setups yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {setupTrades.slice(0, 30).map((t) => {
                const s = t.setup
                if (!s) return null
                const p = getPairById(t.pairId)
                const correct = judgementCorrect(s.judgement, s.outcomePips)
                return (
                  <div key={t.id} className="text-[10px] px-2 py-1 rounded bg-gray-800 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-1 py-0.5 text-[9px] font-bold uppercase rounded ${
                            s.judgement === 'long'
                              ? 'bg-green-900/50 text-green-400'
                              : s.judgement === 'short'
                                ? 'bg-red-900/50 text-red-400'
                                : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {s.judgement === 'long' ? 'L' : s.judgement === 'short' ? 'S' : '—'}
                        </span>
                        <span className="text-gray-400 truncate">{p?.displayName ?? t.pairId}</span>
                        <span className="text-gray-600">c{s.confidence}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={s.outcomePips >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {s.outcomePips > 0 ? '+' : ''}
                          {s.outcomePips}p
                        </span>
                        <span
                          aria-label={correct ? 'correct' : 'wrong'}
                          className={correct ? 'text-green-400' : 'text-red-400'}
                        >
                          {correct ? (
                            <Check size={12} aria-hidden />
                          ) : (
                            <X size={12} aria-hidden />
                          )}
                        </span>
                        <button
                          type="button"
                          aria-label="AI review"
                          className="text-gray-600 hover:text-blue-400"
                          title="AI review"
                          onClick={() => setReviewTrade(t)}
                        >
                          <Bot size={12} aria-hidden />
                        </button>
                      </div>
                    </div>
                    {s.reason && <div className="text-gray-500 italic truncate">{s.reason}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <AIReviewModal trade={reviewTrade} onClose={() => setReviewTrade(null)} />
    </div>
  )
}
