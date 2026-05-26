import { Bot, ChevronLeft, ChevronRight, Dices, Pause, Play, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { TIMEFRAMES } from '@/config/constants'
import { getPairById, PAIRS } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import {
  getRandomTargetTimestamp,
  PERIOD_FOR_PRACTICE_TF,
  pickScenarioCursor,
  type ScenarioFilter,
} from '@/hooks/use-practice-session'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { formatDateJST } from '@/lib/date-utils'
import { calcPips } from '@/lib/practice'
import { formatPrice } from '@/lib/utils'
import { usePracticeStore } from '@/store/practice-store'
import type { Candle, TimeFrame } from '@/types/candle'
import type { PracticeTrade, ReplayDirection } from '@/types/practice'
import { AIReviewModal } from './AIReviewModal'
import { type ChartMarker, PracticeChart, type PriceLineSpec } from './PracticeChart'

const SCENARIOS: Array<{ id: ScenarioFilter; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'high-volatility', label: 'Volatile' },
  { id: 'consolidation', label: 'Range' },
  { id: 'gap', label: 'Gap' },
]

interface AutoCloseResult {
  exitIndex: number
  exitPrice: number
  exitReason: 'tp' | 'sl'
}

function findAutoClose(
  candles: Candle[],
  fromIdx: number,
  toIdx: number,
  direction: ReplayDirection,
  sl: number,
  tp: number,
): AutoCloseResult | null {
  for (let i = fromIdx; i <= toIdx; i++) {
    const c = candles[i]
    if (!c) continue
    if (direction === 'long') {
      const slHit = c.low <= sl
      const tpHit = c.high >= tp
      if (slHit && tpHit) {
        return { exitIndex: i, exitPrice: sl, exitReason: 'sl' }
      }
      if (slHit) return { exitIndex: i, exitPrice: sl, exitReason: 'sl' }
      if (tpHit) return { exitIndex: i, exitPrice: tp, exitReason: 'tp' }
    } else {
      const slHit = c.high >= sl
      const tpHit = c.low <= tp
      if (slHit && tpHit) {
        return { exitIndex: i, exitPrice: sl, exitReason: 'sl' }
      }
      if (slHit) return { exitIndex: i, exitPrice: sl, exitReason: 'sl' }
      if (tpHit) return { exitIndex: i, exitPrice: tp, exitReason: 'tp' }
    }
  }
  return null
}

export function ReplayMode() {
  const pairId = usePracticeStore((s) => s.pairId)
  const timeframe = usePracticeStore((s) => s.timeframe)
  const cursorIndex = usePracticeStore((s) => s.cursorIndex)
  const blindMode = usePracticeStore((s) => s.blindMode)
  const position = usePracticeStore((s) => s.position)
  const setPairId = usePracticeStore((s) => s.setPairId)
  const setTimeframe = usePracticeStore((s) => s.setTimeframe)
  const setCursorIndex = usePracticeStore((s) => s.setCursorIndex)
  const advanceCursor = usePracticeStore((s) => s.advanceCursor)
  const setBlindMode = usePracticeStore((s) => s.setBlindMode)
  const openPosition = usePracticeStore((s) => s.openPosition)
  const clearPosition = usePracticeStore((s) => s.clearPosition)
  const indicators = usePracticeStore((s) => s.indicators)
  const toggleIndicator = usePracticeStore((s) => s.toggleIndicator)

  const pair = getPairById(pairId) ?? PAIRS[0]
  const [goToTimestamp, setGoToTimestamp] = useState<number | null>(null)
  const [slInput, setSlInput] = useState('')
  const [tpInput, setTpInput] = useState('')
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(500)
  const [note, setNote] = useState('')
  const [scenario, setScenario] = useState<ScenarioFilter>('random')
  const [reviewTrade, setReviewTrade] = useState<PracticeTrade | null>(null)
  const [pendingScenarioPick, setPendingScenarioPick] = useState(false)

  const { addTrade, trades, deleteTrade } = usePracticeSessions()

  const { candles, isLoading } = useChartData(
    pair,
    timeframe,
    PERIOD_FOR_PRACTICE_TF[timeframe],
    goToTimestamp,
  )

  // Initialize cursor when data first loads, using scenario filter if a jump is pending
  useEffect(() => {
    if (candles.length === 0) return
    if (cursorIndex != null && cursorIndex < candles.length) return
    const initial = pendingScenarioPick
      ? pickScenarioCursor(candles, scenario)
      : Math.floor(candles.length * 0.7)
    setCursorIndex(initial)
    setPendingScenarioPick(false)
  }, [candles, cursorIndex, scenario, pendingScenarioPick, setCursorIndex])

  // Auto play
  useEffect(() => {
    if (!autoPlaying) return
    if (cursorIndex == null) return
    if (cursorIndex >= candles.length - 1) {
      setAutoPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      advanceCursor(1, candles.length - 1)
    }, playSpeed)
    return () => clearTimeout(timer)
  }, [autoPlaying, cursorIndex, candles.length, playSpeed, advanceCursor])

  const currentCandle = cursorIndex != null ? candles[cursorIndex] : null
  const currentPrice = currentCandle?.close ?? 0

  // Check auto-close (between entry and current cursor)
  useEffect(() => {
    if (!position || cursorIndex == null) return
    const start = position.entryCursorIndex + 1
    if (start > cursorIndex) return
    const result = findAutoClose(
      candles,
      start,
      cursorIndex,
      position.direction,
      position.stopLoss,
      position.takeProfit,
    )
    if (result) {
      const exitCandle = candles[result.exitIndex]
      if (!exitCandle) return
      const pips = calcPips(
        position.direction,
        position.entryPrice,
        result.exitPrice,
        pair.decimals,
      )
      const trade: PracticeTrade = {
        id: crypto.randomUUID(),
        mode: 'replay',
        pairId: pair.id,
        timeframe,
        cutoffTimestamp: position.entryTime,
        createdAt: Date.now(),
        replay: {
          direction: position.direction,
          entryPrice: position.entryPrice,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          exitPrice: result.exitPrice,
          exitReason: result.exitReason,
          entryTime: position.entryTime,
          exitTime: exitCandle.time,
          pips,
          result: pips > 0 ? 'win' : pips < 0 ? 'loss' : 'breakeven',
          holdBars: result.exitIndex - position.entryCursorIndex,
        },
      }
      addTrade(trade)
      clearPosition()
    }
  }, [position, cursorIndex, candles, pair, timeframe, addTrade, clearPosition])

  const randomJump = () => {
    setAutoPlaying(false)
    clearPosition()
    setSlInput('')
    setTpInput('')
    setNote('')
    const target = getRandomTargetTimestamp(timeframe)
    setGoToTimestamp(target)
    setCursorIndex(null)
    setPendingScenarioPick(true)
  }

  const placeOrder = (direction: ReplayDirection) => {
    if (!currentCandle || cursorIndex == null) return
    const sl = Number.parseFloat(slInput)
    const tp = Number.parseFloat(tpInput)
    if (!Number.isFinite(sl) || !Number.isFinite(tp)) return
    const entry = currentCandle.close
    if (direction === 'long' && (sl >= entry || tp <= entry)) return
    if (direction === 'short' && (sl <= entry || tp >= entry)) return
    openPosition({
      direction,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      entryCursorIndex: cursorIndex,
      entryTime: currentCandle.time,
    })
  }

  const manualClose = () => {
    if (!position || !currentCandle || cursorIndex == null) return
    const exit = currentCandle.close
    const pips = calcPips(position.direction, position.entryPrice, exit, pair.decimals)
    const trade: PracticeTrade = {
      id: crypto.randomUUID(),
      mode: 'replay',
      pairId: pair.id,
      timeframe,
      cutoffTimestamp: position.entryTime,
      createdAt: Date.now(),
      replay: {
        direction: position.direction,
        entryPrice: position.entryPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        exitPrice: exit,
        exitReason: 'manual',
        entryTime: position.entryTime,
        exitTime: currentCandle.time,
        pips,
        result: pips > 0 ? 'win' : pips < 0 ? 'loss' : 'breakeven',
        holdBars: cursorIndex - position.entryCursorIndex,
        note: note.trim() || undefined,
      },
    }
    addTrade(trade)
    clearPosition()
    setNote('')
  }

  const cancelOrder = () => {
    clearPosition()
    setNote('')
  }

  const setSlAtCurrent = (offset: number) => {
    setSlInput(formatPrice(currentPrice + offset, pair.decimals))
  }
  const setTpAtCurrent = (offset: number) => {
    setTpInput(formatPrice(currentPrice + offset, pair.decimals))
  }

  // Build price lines for chart
  const priceLines = useMemo<PriceLineSpec[]>(() => {
    const lines: PriceLineSpec[] = []
    if (position) {
      lines.push({ price: position.entryPrice, color: '#3b82f6', title: 'Entry' })
      lines.push({ price: position.stopLoss, color: '#ef4444', title: 'SL' })
      lines.push({ price: position.takeProfit, color: '#22c55e', title: 'TP' })
    } else {
      const sl = Number.parseFloat(slInput)
      const tp = Number.parseFloat(tpInput)
      if (Number.isFinite(sl)) lines.push({ price: sl, color: '#ef4444', title: 'SL' })
      if (Number.isFinite(tp)) lines.push({ price: tp, color: '#22c55e', title: 'TP' })
    }
    return lines
  }, [position, slInput, tpInput])

  // Build markers for chart (current open position only)
  const chartMarkers = useMemo<ChartMarker[]>(() => {
    if (!position) return []
    return [
      {
        time: position.entryTime,
        position: position.direction === 'long' ? 'belowBar' : 'aboveBar',
        shape: position.direction === 'long' ? 'arrowUp' : 'arrowDown',
        color: '#3b82f6',
        text: position.direction === 'long' ? 'BUY' : 'SELL',
      },
    ]
  }, [position])

  // Filter trades for this mode
  const replayTrades = trades.filter((t) => t.mode === 'replay')
  const stats = useMemo(() => {
    const finished = replayTrades.filter((t) => t.replay)
    const wins = finished.filter((t) => t.replay && t.replay.pips > 0).length
    const losses = finished.filter((t) => t.replay && t.replay.pips < 0).length
    const totalPips = finished.reduce((acc, t) => acc + (t.replay?.pips ?? 0), 0)
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
    return {
      total: finished.length,
      wins,
      losses,
      totalPips: Math.round(totalPips * 10) / 10,
      winRate,
    }
  }, [replayTrades])

  const liveUnrealized = useMemo(() => {
    if (!position) return null
    return calcPips(position.direction, position.entryPrice, currentPrice, pair.decimals)
  }, [position, currentPrice, pair.decimals])

  const canStep = cursorIndex != null && candles.length > 0 && cursorIndex < candles.length - 1
  const canStepBack =
    cursorIndex != null &&
    candles.length > 0 &&
    cursorIndex > 0 &&
    (!position || cursorIndex > position.entryCursorIndex)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      {/* ─── Left: chart + step controls ─── */}
      <div className="space-y-3">
        {/* Top bar: pair / timeframe / blind / random */}
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
            title="Scenario filter for random jump"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={randomJump}
          >
            <Dices size={14} aria-hidden />
            Random Jump
          </button>
          <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
            />
            Blind
          </label>
          {!blindMode && currentCandle && (
            <span className="text-[11px] text-gray-500 ml-auto">
              Cursor: {formatDateJST(currentCandle.time * 1000)} |{' '}
              {formatPrice(currentPrice, pair.decimals)}
            </span>
          )}
          <div className={blindMode || !currentCandle ? 'ml-auto' : ''}>
            <IndicatorPanel indicators={indicators} onToggle={toggleIndicator} />
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-gray-800 bg-[#0f1117] h-[520px] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading chart...
            </div>
          ) : candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Press Random Jump to start a session
            </div>
          ) : (
            <PracticeChart
              candles={candles}
              cursorIndex={cursorIndex}
              priceLines={priceLines}
              markers={chartMarkers}
              blindMode={blindMode}
              decimals={pair.decimals}
              indicators={indicators}
            />
          )}
        </div>

        {/* Step controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canStepBack}
            aria-label="Step back 1 bar"
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => advanceCursor(-1, candles.length - 1)}
          >
            <ChevronLeft size={14} aria-hidden />
            −1
          </button>
          <button
            type="button"
            disabled={!canStep}
            aria-label="Step forward 1 bar"
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => advanceCursor(1, candles.length - 1)}
          >
            +1
            <ChevronRight size={14} aria-hidden />
          </button>
          <button
            type="button"
            disabled={!canStep}
            className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => advanceCursor(10, candles.length - 1)}
          >
            +10
          </button>
          <button
            type="button"
            disabled={!canStep}
            className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => advanceCursor(50, candles.length - 1)}
          >
            +50
          </button>
          <button
            type="button"
            disabled={!canStep}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
              autoPlaying
                ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                : 'bg-green-600 text-white hover:bg-green-500'
            } disabled:opacity-40`}
            onClick={() => setAutoPlaying((p) => !p)}
          >
            {autoPlaying ? (
              <>
                <Pause size={14} aria-hidden />
                Pause
              </>
            ) : (
              <>
                <Play size={14} aria-hidden />
                Play
              </>
            )}
          </button>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
          >
            <option value={1000}>1.0s</option>
            <option value={500}>0.5s</option>
            <option value={250}>0.25s</option>
            <option value={100}>0.1s</option>
          </select>
          <span className="text-[10px] text-gray-500">
            {cursorIndex != null && candles.length > 0
              ? `${cursorIndex + 1} / ${candles.length}`
              : '—'}
          </span>
        </div>
      </div>

      {/* ─── Right: trade panel + stats ─── */}
      <div className="space-y-3">
        {/* Stats */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Replay Stats</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500 text-[10px]">Trades</div>
              <div className="text-gray-200">{stats.total}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">Win Rate</div>
              <div
                className={
                  stats.winRate >= 50 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'
                }
              >
                {stats.winRate}%
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">W / L</div>
              <div className="text-gray-200">
                <span className="text-green-400">{stats.wins}</span> /{' '}
                <span className="text-red-400">{stats.losses}</span>
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">Total Pips</div>
              <div className={stats.totalPips >= 0 ? 'text-green-400' : 'text-red-400'}>
                {stats.totalPips > 0 ? '+' : ''}
                {stats.totalPips}
              </div>
            </div>
          </div>
        </div>

        {/* Position panel */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 space-y-3">
          {position ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-gray-300">Open Position</div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    position.direction === 'long'
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {position.direction}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-gray-500 text-[10px]">Entry</div>
                  <div className="text-white font-mono">
                    {formatPrice(position.entryPrice, pair.decimals)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px]">SL</div>
                  <div className="text-red-400 font-mono">
                    {formatPrice(position.stopLoss, pair.decimals)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px]">TP</div>
                  <div className="text-green-400 font-mono">
                    {formatPrice(position.takeProfit, pair.decimals)}
                  </div>
                </div>
              </div>
              <div className="text-[11px]">
                <span className="text-gray-500">Unrealized: </span>
                <span
                  className={
                    (liveUnrealized ?? 0) >= 0
                      ? 'text-green-400 font-medium'
                      : 'text-red-400 font-medium'
                  }
                >
                  {(liveUnrealized ?? 0) > 0 ? '+' : ''}
                  {liveUnrealized ?? 0} pips
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why did you enter? (optional)"
                rows={2}
                className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                  onClick={manualClose}
                >
                  Close @ {formatPrice(currentPrice, pair.decimals)}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
                  onClick={cancelOrder}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-medium text-gray-300">New Order</div>
              <div className="text-[10px] text-gray-500">
                Current: {currentCandle ? formatPrice(currentPrice, pair.decimals) : '—'}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Stop Loss</label>
                <input
                  type="text"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  placeholder="0.0000"
                  className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setSlAtCurrent(pair.decimals === 3 ? -0.1 : -0.001)}
                  >
                    -10p
                  </button>
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setSlAtCurrent(pair.decimals === 3 ? -0.2 : -0.002)}
                  >
                    -20p
                  </button>
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setSlAtCurrent(pair.decimals === 3 ? -0.5 : -0.005)}
                  >
                    -50p
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Take Profit</label>
                <input
                  type="text"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  placeholder="0.0000"
                  className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setTpAtCurrent(pair.decimals === 3 ? 0.1 : 0.001)}
                  >
                    +10p
                  </button>
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setTpAtCurrent(pair.decimals === 3 ? 0.2 : 0.002)}
                  >
                    +20p
                  </button>
                  <button
                    type="button"
                    disabled={!currentCandle}
                    className="flex-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40"
                    onClick={() => setTpAtCurrent(pair.decimals === 3 ? 0.5 : 0.005)}
                  >
                    +50p
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!currentCandle}
                  className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-40"
                  onClick={() => placeOrder('long')}
                >
                  Buy
                </button>
                <button
                  type="button"
                  disabled={!currentCandle}
                  className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-40"
                  onClick={() => placeOrder('short')}
                >
                  Sell
                </button>
              </div>
            </>
          )}
        </div>

        {/* History */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Recent Trades</div>
          {replayTrades.length === 0 ? (
            <div className="text-[10px] text-gray-600">No trades yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {replayTrades.slice(0, 30).map((t) => {
                const r = t.replay
                if (!r) return null
                const p = getPairById(t.pairId)
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-gray-800"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-1 py-0.5 text-[9px] font-bold uppercase rounded ${
                          r.direction === 'long'
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {r.direction === 'long' ? 'L' : 'S'}
                      </span>
                      <span className="text-gray-400 truncate">{p?.displayName ?? t.pairId}</span>
                      <span className="text-gray-600">{t.timeframe}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-600 text-[9px] uppercase">{r.exitReason}</span>
                      <span className={r.pips >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {r.pips > 0 ? '+' : ''}
                        {r.pips}p
                      </span>
                      <button
                        type="button"
                        aria-label="AI review"
                        className="text-gray-600 hover:text-blue-400"
                        title="AI review"
                        onClick={() => setReviewTrade(t)}
                      >
                        <Bot size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete trade"
                        className="text-gray-600 hover:text-red-400"
                        onClick={() => deleteTrade(t.id)}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </div>
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
