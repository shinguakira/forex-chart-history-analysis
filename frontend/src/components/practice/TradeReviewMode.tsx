import { ArrowRight, Check, Dices, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { TIMEFRAMES } from '@/config/constants'
import { getPairById, PAIRS } from '@/config/pairs'
import { PERIOD_FOR_PRACTICE_TF } from '@/hooks/use-practice-session'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { useChartData } from '@/hooks/use-chart-data'
import { useTradeHistory } from '@/hooks/use-trade-history'
import { formatDateJST } from '@/lib/date-utils'
import { usePracticeStore } from '@/store/practice-store'
import type { Trade } from '@/types/trade'
import type { TimeFrame } from '@/types/candle'
import type { PracticeTrade } from '@/types/practice'
import { type ChartMarker, PracticeChart } from './PracticeChart'

type Judgement = 'long' | 'short'

/** Max age (seconds) of a trade to be usable at each timeframe, matching Yahoo Finance limits. */
const MAX_TRADE_AGE_S: Record<TimeFrame, number> = {
  '1':   5   * 86_400,
  '5':   50  * 86_400,
  '15':  50  * 86_400,
  '60':  600 * 86_400,
  '240': 500 * 86_400,
  D:     1500 * 86_400,
  W:     3000 * 86_400,
}

export function TradeReviewMode() {
  const pairId = usePracticeStore((s) => s.pairId)
  const timeframe = usePracticeStore((s) => s.timeframe)
  const blindMode = usePracticeStore((s) => s.blindMode)
  const setPairId = usePracticeStore((s) => s.setPairId)
  const setTimeframe = usePracticeStore((s) => s.setTimeframe)
  const setBlindMode = usePracticeStore((s) => s.setBlindMode)
  const indicators = usePracticeStore((s) => s.indicators)
  const toggleIndicator = usePracticeStore((s) => s.toggleIndicator)
  const flashResult = usePracticeStore((s) => s.flashResult)

  const pair = getPairById(pairId) ?? PAIRS[0]

  const { trades: allTrades, loaded } = useTradeHistory()
  const pairTrades = useMemo(() => {
    const cutoff = Date.now() / 1000 - MAX_TRADE_AGE_S[timeframe]
    return allTrades.filter(
      (t) => t.pairId === pairId && new Date(t.openDate).getTime() / 1000 > cutoff,
    )
  }, [allTrades, pairId, timeframe])

  const [activeTrade, setActiveTrade] = useState<Trade | null>(null)
  const [goToTimestamp, setGoToTimestamp] = useState<number | null>(null)
  const [cursorIndex, setCursorIndex] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle' | 'asking' | 'revealed'>('idle')
  const [judgement, setJudgement] = useState<Judgement | null>(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const pendingRef = useRef<string | null>(null)

  const period = PERIOD_FOR_PRACTICE_TF[timeframe]
  const { candles, isLoading } = useChartData(pair, timeframe, period, goToTimestamp)
  const { addTrade, trades: practiceTrades } = usePracticeSessions()

  // Position cursor at the trade's openDate once candles load
  useEffect(() => {
    if (!pendingRef.current || !activeTrade || candles.length === 0) return
    if (pendingRef.current !== activeTrade.ref) return
    const openTs = Math.floor(new Date(activeTrade.openDate).getTime() / 1000)
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < candles.length; i++) {
      const d = Math.abs(candles[i].time - openTs)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    setCursorIndex(best)
    pendingRef.current = null
    setPhase('asking')
  }, [candles, activeTrade])

  const pickTrade = useCallback(() => {
    if (!loaded || pairTrades.length === 0) return
    const t = pairTrades[Math.floor(Math.random() * pairTrades.length)]
    const openTs = Math.floor(new Date(t.openDate).getTime() / 1000)
    setActiveTrade(t)
    setGoToTimestamp(openTs)
    setCursorIndex(null)
    setJudgement(null)
    setPhase('idle')
    pendingRef.current = t.ref
  }, [loaded, pairTrades])

  const submit = useCallback(() => {
    if (!judgement || !activeTrade || cursorIndex == null) return
    const correct =
      (judgement === 'long' && activeTrade.direction === 'bull') ||
      (judgement === 'short' && activeTrade.direction === 'bear')
    setIsCorrect(correct)
    flashResult(correct ? 'correct' : 'wrong')
    setPhase('revealed')

    // Advance cursor toward closeDate so the outcome is visible in the chart
    const closeTs = Math.floor(new Date(activeTrade.closeDate).getTime() / 1000)
    let bestClose = cursorIndex
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = cursorIndex; i < candles.length; i++) {
      const d = Math.abs(candles[i].time - closeTs)
      if (d < bestDist) {
        bestDist = d
        bestClose = i
      }
    }
    setCursorIndex(bestClose)

    const record: PracticeTrade = {
      id: crypto.randomUUID(),
      mode: 'trade-review',
      pairId: pair.id,
      timeframe,
      cutoffTimestamp: Math.floor(new Date(activeTrade.openDate).getTime() / 1000),
      createdAt: Date.now(),
      tradeReview: {
        judgement,
        actualDirection: activeTrade.direction as 'bull' | 'bear',
        actualPl: activeTrade.pl,
        tradeRef: activeTrade.ref,
        correct,
      },
    }
    addTrade(record)
  }, [judgement, activeTrade, cursorIndex, candles, pair, timeframe, flashResult, addTrade])

  const next = () => {
    setJudgement(null)
    pickTrade()
  }

  const actualDir: Judgement | null = activeTrade
    ? activeTrade.direction === 'bull'
      ? 'long'
      : 'short'
    : null

  const entryCandle =
    activeTrade && candles.length > 0
      ? (() => {
          const openTs = Math.floor(new Date(activeTrade.openDate).getTime() / 1000)
          return candles.reduce((best, c) =>
            Math.abs(c.time - openTs) < Math.abs(best.time - openTs) ? c : best,
          )
        })()
      : null

  const markers = useMemo<ChartMarker[]>(() => {
    if (phase !== 'revealed' || !entryCandle || !activeTrade) return []
    const closeTs = Math.floor(new Date(activeTrade.closeDate).getTime() / 1000)
    const closeCandle = candles.reduce(
      (best, c) => (Math.abs(c.time - closeTs) < Math.abs(best.time - closeTs) ? c : best),
      candles[0],
    )
    const result: ChartMarker[] = [
      {
        time: entryCandle.time,
        position: 'aboveBar',
        shape: 'circle',
        color: '#facc15',
        text: 'Entry',
      },
    ]
    if (closeCandle && closeCandle.time !== entryCandle.time) {
      result.push({
        time: closeCandle.time,
        position: 'aboveBar',
        shape: 'circle',
        color: activeTrade.pl >= 0 ? '#22c55e' : '#ef4444',
        text: 'Exit',
      })
    }
    return result
  }, [phase, entryCandle, activeTrade, candles])

  const reviewTrades = practiceTrades.filter((t) => t.mode === 'trade-review' && t.tradeReview)
  const stats = useMemo(() => {
    const total = reviewTrades.length
    const correct = reviewTrades.filter((t) => t.tradeReview?.correct).length
    return {
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }, [reviewTrades])

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
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={pickTrade}
            disabled={!loaded || pairTrades.length === 0}
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

        <div
          data-no-swipe
          className="rounded-lg border border-gray-800 bg-[#0f1117] h-[60vh] md:h-[480px] overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading chart...
            </div>
          ) : !loaded ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading trades...
            </div>
          ) : pairTrades.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              No trade history for {pair.displayName}.
            </div>
          ) : candles.length === 0 && phase === 'idle' && !activeTrade ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Press New to start
            </div>
          ) : candles.length === 0 && activeTrade ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-2">
              <div>No chart data for this timeframe at that date.</div>
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={pickTrade}
              >
                <Dices size={14} aria-hidden />
                Try Another
              </button>
            </div>
          ) : candles.length > 0 ? (
            <PracticeChart
              candles={candles}
              cursorIndex={cursorIndex}
              markers={markers}
              blindMode={blindMode}
              decimals={pair.decimals}
              indicators={indicators}
            />
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          {phase === 'asking' && entryCandle && (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Would you have gone <span className="text-white font-bold">Long</span> or{' '}
                <span className="text-white font-bold">Short</span> on this entry?
              </div>
              {!blindMode && (
                <div className="text-[11px] text-gray-500">
                  Entry: {formatDateJST(entryCandle.time * 1000)} @{' '}
                  {entryCandle.close.toFixed(pair.decimals)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(['long', 'short'] as Judgement[]).map((j) => {
                  const Icon = j === 'long' ? TrendingUp : TrendingDown
                  return (
                    <button
                      key={j}
                      type="button"
                      className={`flex items-center justify-center gap-1 px-3 py-2 text-xs rounded font-medium ${
                        judgement === j
                          ? j === 'long'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                      onClick={() => setJudgement(j)}
                    >
                      <Icon size={14} aria-hidden />
                      {j === 'long' ? 'Long' : 'Short'}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                disabled={!judgement}
                className="w-full px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
                onClick={submit}
              >
                Reveal
              </button>
            </div>
          )}

          {phase === 'revealed' && judgement && activeTrade && actualDir && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-300">Your call:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    judgement === 'long'
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {judgement.toUpperCase()}
                </span>
                <span className="text-sm text-gray-300 ml-2">Actual:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    actualDir === 'long'
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {actualDir.toUpperCase()}
                </span>
                <span
                  className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${
                    isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {isCorrect ? (
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

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded bg-gray-800 px-2 py-1.5">
                  <div className="text-gray-500">Entry</div>
                  <div className="text-gray-200 font-medium">
                    {activeTrade.openPrice.toFixed(pair.decimals)}
                  </div>
                </div>
                <div className="rounded bg-gray-800 px-2 py-1.5">
                  <div className="text-gray-500">Exit</div>
                  <div className="text-gray-200 font-medium">
                    {activeTrade.closePrice.toFixed(pair.decimals)}
                  </div>
                </div>
                <div className="rounded bg-gray-800 px-2 py-1.5">
                  <div className="text-gray-500">P&L</div>
                  <div
                    className={`font-medium ${activeTrade.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {activeTrade.pl >= 0 ? '+' : ''}
                    {activeTrade.pl.toFixed(0)}¥
                  </div>
                </div>
              </div>

              {!blindMode && (
                <div className="text-[10px] text-gray-500">
                  {formatDateJST(new Date(activeTrade.openDate).getTime())} →{' '}
                  {formatDateJST(new Date(activeTrade.closeDate).getTime())}
                </div>
              )}

              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={next}
              >
                Next Trade
                <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          )}

          {phase === 'idle' && (
            <div className="text-xs text-gray-500 text-center py-2">Click New to start.</div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Trade Review Stats</div>
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

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Recent Reviews</div>
          {reviewTrades.length === 0 ? (
            <div className="text-[10px] text-gray-600">No reviews yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {reviewTrades.slice(0, 30).map((t) => {
                const r = t.tradeReview
                if (!r) return null
                const p = getPairById(t.pairId)
                return (
                  <div key={t.id} className="text-[10px] px-2 py-1 rounded bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1 py-0.5 text-[9px] font-bold uppercase rounded ${
                            r.judgement === 'long'
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {r.judgement === 'long' ? 'L' : 'S'}
                        </span>
                        <span className="text-gray-400">{p?.displayName ?? t.pairId}</span>
                        <span className="text-gray-600">
                          → {r.actualDirection === 'bull' ? 'L' : 'S'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={r.actualPl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.actualPl >= 0 ? '+' : ''}
                          {r.actualPl.toFixed(0)}¥
                        </span>
                        <span
                          aria-label={r.correct ? 'correct' : 'wrong'}
                          className={r.correct ? 'text-green-400' : 'text-red-400'}
                        >
                          {r.correct ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar */}
      {phase === 'asking' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-[#0f1117]/95 backdrop-blur px-4 py-3 shadow-2xl">
          <div className="flex flex-col gap-2 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 gap-2">
              {(['long', 'short'] as Judgement[]).map((j) => {
                const Icon = j === 'long' ? TrendingUp : TrendingDown
                return (
                  <button
                    key={j}
                    type="button"
                    className={`flex items-center justify-center gap-1 py-2 text-sm font-semibold rounded ${
                      judgement === j
                        ? j === 'long'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                    }`}
                    onClick={() => setJudgement(j)}
                  >
                    <Icon size={14} aria-hidden />
                    {j === 'long' ? 'Long' : 'Short'}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              disabled={!judgement}
              className="w-full py-3 text-base font-bold rounded bg-blue-600 text-white active:bg-blue-700 disabled:opacity-40"
              onClick={submit}
            >
              Reveal
            </button>
          </div>
        </div>
      )}
      {phase === 'revealed' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-[#0f1117]/95 backdrop-blur px-4 py-3 shadow-2xl">
          <button
            type="button"
            className="w-full py-3 text-base font-bold rounded bg-blue-600 text-white active:bg-blue-700 flex items-center justify-center gap-1 max-w-7xl mx-auto"
            onClick={next}
          >
            Next Trade
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
