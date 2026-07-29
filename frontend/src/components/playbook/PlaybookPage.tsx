import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPairById, PAIRS } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import { PERIOD_FOR_PRACTICE_TF } from '@/hooks/use-practice-session'
import { useTradeHistory } from '@/hooks/use-trade-history'
import { ResultFlash } from '@/components/practice/ResultFlash'
import { usePracticeStore } from '@/store/practice-store'
import { type ChartMarker, PracticeChart } from '@/components/practice/PracticeChart'
import type { IndicatorEntry } from '@/types/indicators'
import type { Trade } from '@/types/trade'

const DEFAULT_INDICATORS: IndicatorEntry[] = [
  { id: 'bb', enabled: true, config: { type: 'bollingerBands', period: 20, stdDev: 2 } },
]

type Filter = 'random' | 'win' | 'loss'
type Judgement = 'long' | 'short'
type Phase = 'idle' | 'asking' | 'revealed'

export function PlaybookPage() {
  const { trades: allTrades, loaded } = useTradeHistory()
  const flashResult = usePracticeStore((s) => s.flashResult)
  const [filter, setFilter] = useState<Filter>('random')
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null)
  const [goToTimestamp, setGoToTimestamp] = useState<number | null>(null)
  const [cursorIndex, setCursorIndex] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [judgement, setJudgement] = useState<Judgement | null>(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const pendingRef = useRef<string | null>(null)

  const pool = useMemo(() => {
    if (!loaded) return []
    if (filter === 'win') return allTrades.filter((t) => t.pl >= 0)
    if (filter === 'loss') return allTrades.filter((t) => t.pl < 0)
    return allTrades
  }, [allTrades, filter, loaded])

  const pair = activeTrade ? (getPairById(activeTrade.pairId) ?? PAIRS[0]) : PAIRS[0]
  const period = PERIOD_FOR_PRACTICE_TF['60']
  const { candles, isLoading, isError } = useChartData(pair, '60', period, goToTimestamp)

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
    if (pool.length === 0) return
    const t = pool[Math.floor(Math.random() * pool.length)]
    setActiveTrade(t)
    setGoToTimestamp(Math.floor(new Date(t.openDate).getTime() / 1000) + 86400)
    setCursorIndex(null)
    setJudgement(null)
    setPhase('idle')
    pendingRef.current = t.ref
  }, [pool])

  // Auto-skip when chart data is unavailable for the picked trade
  useEffect(() => {
    if (!activeTrade || isLoading || candles.length > 0 || phase !== 'idle') return
    if (pendingRef.current !== activeTrade.ref) return
    pickTrade()
  }, [isLoading, candles, activeTrade, phase, pickTrade])

  const submit = useCallback(() => {
    if (!judgement || !activeTrade || cursorIndex == null) return
    const correct =
      (judgement === 'long' && activeTrade.direction === 'bull') ||
      (judgement === 'short' && activeTrade.direction === 'bear')
    setIsCorrect(correct)
    flashResult(correct ? 'correct' : 'wrong')
    setPhase('revealed')
    setCursorIndex(null)
  }, [judgement, activeTrade, pair, flashResult])

  const markers = useMemo<ChartMarker[]>(() => {
    if (phase !== 'revealed' || !activeTrade || candles.length === 0) return []
    const openTs = Math.floor(new Date(activeTrade.openDate).getTime() / 1000)
    const closeTs = Math.floor(new Date(activeTrade.closeDate).getTime() / 1000)
    const entry = candles.reduce((b, c) =>
      Math.abs(c.time - openTs) < Math.abs(b.time - openTs) ? c : b,
    )
    const exit = candles.reduce((b, c) =>
      Math.abs(c.time - closeTs) < Math.abs(b.time - closeTs) ? c : b,
    )
    const out: ChartMarker[] = [
      {
        time: entry.time,
        position: activeTrade.direction === 'bull' ? 'belowBar' : 'aboveBar',
        shape: activeTrade.direction === 'bull' ? 'arrowUp' : 'arrowDown',
        color: activeTrade.direction === 'bull' ? '#22c55e' : '#ef4444',
        text: activeTrade.direction === 'bull' ? 'BUY' : 'SELL',
      },
    ]
    if (exit.time !== entry.time) {
      out.push({
        time: exit.time,
        position: activeTrade.direction === 'bull' ? 'aboveBar' : 'belowBar',
        shape: 'circle',
        color: activeTrade.pl >= 0 ? '#22c55e' : '#ef4444',
        text: 'EXIT',
      })
    }
    return out
  }, [phase, activeTrade, candles])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0f1117] text-gray-200">
      <ResultFlash />
      <div className="max-w-4xl mx-auto px-4 py-4 pb-28 md:pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Playbook</h1>
          {activeTrade && (
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-400 ml-auto"
              onClick={() => { setActiveTrade(null); setPhase('idle') }}
            >
              reset
            </button>
          )}
        </div>

        <div
          data-no-swipe
          className="rounded-lg border border-gray-800 bg-[#0f1117] h-[60vh] md:h-[480px] overflow-hidden"
        >
          {!loaded ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading...
            </div>
          ) : phase === 'idle' && !activeTrade ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-gray-500 uppercase tracking-widest">Mode</span>
                <div className="flex gap-2">
                  {(['random', 'win', 'loss'] as Filter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`px-5 py-2 text-sm rounded-full font-medium transition-colors ${
                        filter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'random' ? 'Random' : f === 'win' ? 'Win' : 'Loss'}
                    </button>
                  ))}
                </div>
              </div>
              {pool.length === 0 ? (
                <span className="text-xs text-gray-600">No {filter} trades in history.</span>
              ) : (
                <button
                  type="button"
                  className="px-10 py-3 text-base font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-500"
                  onClick={pickTrade}
                >
                  Start
                </button>
              )}
            </div>
          ) : phase === 'idle' && activeTrade && isLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading chart...
            </div>
          ) : phase === 'idle' && activeTrade && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-3">
              <span>No chart data for this trade.</span>
              <button
                type="button"
                className="px-4 py-2 text-xs rounded bg-blue-600 text-white"
                onClick={pickTrade}
              >
                Skip
              </button>
            </div>
          ) : (
            <PracticeChart
              candles={candles}
              cursorIndex={cursorIndex}
              markers={markers}
              decimals={pair.decimals}
              indicators={DEFAULT_INDICATORS}
            />
          )}
        </div>

        {phase === 'asking' && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
            <div className="text-sm text-center text-gray-300">Long or Short?</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded ${
                  judgement === 'long'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setJudgement('long')}
              >
                <TrendingUp size={16} aria-hidden /> Long
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded ${
                  judgement === 'short'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setJudgement('short')}
              >
                <TrendingDown size={16} aria-hidden /> Short
              </button>
            </div>
            <button
              type="button"
              disabled={!judgement}
              className="w-full py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
              onClick={submit}
            >
              Reveal
            </button>
          </div>
        )}

        {phase === 'revealed' && activeTrade && judgement && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Actual</div>
                <div className={activeTrade.direction === 'bull' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {activeTrade.direction === 'bull' ? 'Long' : 'Short'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Result</div>
                <div className={activeTrade.pl >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {activeTrade.pl >= 0 ? 'Win' : 'Loss'} {activeTrade.pl >= 0 ? '+' : ''}{activeTrade.pl.toLocaleString()}¥
                </div>
              </div>
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
              onClick={pickTrade}
            >
              Next <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
