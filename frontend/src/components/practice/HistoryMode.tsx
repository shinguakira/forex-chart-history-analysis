import { Bot, Check, Download, Eye, EyeOff, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { getPairById, PAIRS } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import { PERIOD_FOR_PRACTICE_TF } from '@/hooks/use-practice-session'
import { usePracticeSessions } from '@/hooks/use-practice-sessions'
import { formatDateJST } from '@/lib/date-utils'
import { judgementCorrect } from '@/lib/practice'
import { exportPracticeCsv, exportPracticeJson } from '@/lib/practice-export'
import { usePracticeStore } from '@/store/practice-store'
import type { PracticeMode, PracticeTrade } from '@/types/practice'
import { AIReviewModal } from './AIReviewModal'
import { type ChartMarker, PracticeChart, type PriceLineSpec } from './PracticeChart'

type Verdict = 'correct' | 'wrong' | 'neutral'

function tradeVerdict(t: PracticeTrade): Verdict {
  if (t.quiz) return t.quiz.correct ? 'correct' : 'wrong'
  if (t.setup)
    return judgementCorrect(t.setup.judgement, t.setup.outcomePips) ? 'correct' : 'wrong'
  if (t.replay) {
    if (t.replay.pips > 0) return 'correct'
    if (t.replay.pips < 0) return 'wrong'
    return 'neutral'
  }
  if (t.tradeReview) {
    if (t.tradeReview.outcomePips > 0) return 'correct'
    if (t.tradeReview.outcomePips < 0) return 'wrong'
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

function tradeBadge(t: PracticeTrade): { label: string; cls: string } {
  if (t.replay) {
    return t.replay.direction === 'long'
      ? { label: 'L', cls: 'bg-green-900/50 text-green-400' }
      : { label: 'S', cls: 'bg-red-900/50 text-red-400' }
  }
  if (t.quiz) {
    return t.quiz.prediction === 'up'
      ? { label: 'U', cls: 'bg-green-900/50 text-green-400' }
      : { label: 'D', cls: 'bg-red-900/50 text-red-400' }
  }
  if (t.setup) {
    const j = t.setup.judgement
    if (j === 'long') return { label: 'L', cls: 'bg-green-900/50 text-green-400' }
    if (j === 'short') return { label: 'S', cls: 'bg-red-900/50 text-red-400' }
    return { label: '—', cls: 'bg-gray-700 text-gray-400' }
  }
  if (t.tradeReview) {
    return t.tradeReview.judgement === 'long'
      ? { label: 'L', cls: 'bg-green-900/50 text-green-400' }
      : { label: 'S', cls: 'bg-red-900/50 text-red-400' }
  }
  return { label: '?', cls: 'bg-gray-700 text-gray-400' }
}

const MODE_FILTERS: Array<{ id: PracticeMode | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'replay', label: 'Replay' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'setup', label: 'Setup' },
  { id: 'trade-review', label: 'Trade Review' },
]

const VERDICT_FILTERS: Array<{ id: Verdict | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'correct', label: 'Correct' },
  { id: 'wrong', label: 'Wrong' },
]

export function HistoryMode() {
  const { trades, deleteTrade } = usePracticeSessions()
  const indicators = usePracticeStore((s) => s.indicators)
  const toggleIndicator = usePracticeStore((s) => s.toggleIndicator)

  const [modeFilter, setModeFilter] = useState<PracticeMode | 'all'>('all')
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [revealFuture, setRevealFuture] = useState(false)
  const [reviewTrade, setReviewTrade] = useState<PracticeTrade | null>(null)

  const filtered = useMemo(() => {
    const sorted = [...trades].sort((a, b) => b.createdAt - a.createdAt)
    return sorted.filter((t) => {
      if (modeFilter !== 'all' && t.mode !== modeFilter) return false
      if (verdictFilter !== 'all' && tradeVerdict(t) !== verdictFilter) return false
      return true
    })
  }, [trades, modeFilter, verdictFilter])

  // Keep selection in sync with the filtered list.
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selected = filtered.find((t) => t.id === selectedId) ?? null
  const pair = selected ? (getPairById(selected.pairId) ?? PAIRS[0]) : PAIRS[0]

  const { candles, isLoading } = useChartData(
    pair,
    selected?.timeframe ?? '60',
    selected ? PERIOD_FOR_PRACTICE_TF[selected.timeframe] : PERIOD_FOR_PRACTICE_TF['60'],
    selected?.cutoffTimestamp ?? null,
  )

  // Cursor index at the cutoff time so we can hide future bars unless revealed.
  const cutoffIdx = useMemo(() => {
    if (!selected || candles.length === 0) return null
    const idx = candles.findIndex((c) => c.time >= selected.cutoffTimestamp)
    return idx === -1 ? candles.length - 1 : idx
  }, [selected, candles])

  const cursorIndex = revealFuture ? null : cutoffIdx

  const markers = useMemo<ChartMarker[]>(() => {
    if (!selected) return []
    if (selected.replay) {
      const r = selected.replay
      const out: ChartMarker[] = [
        {
          time: r.entryTime,
          position: r.direction === 'long' ? 'belowBar' : 'aboveBar',
          shape: r.direction === 'long' ? 'arrowUp' : 'arrowDown',
          color: '#3b82f6',
          text: r.direction === 'long' ? 'BUY' : 'SELL',
        },
      ]
      if (revealFuture) {
        const plText = `${r.pips > 0 ? '+' : ''}${r.pips}p`
        out.push({
          time: r.exitTime,
          position: r.direction === 'long' ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          color: r.pips >= 0 ? '#22c55e' : '#ef4444',
          text: `${r.exitReason.toUpperCase()} ${plText}`,
        })
      }
      return out
    }
    return [
      {
        time: selected.cutoffTimestamp,
        position: 'aboveBar',
        shape: 'circle',
        color: '#facc15',
        text: 'Cutoff',
      },
    ]
  }, [selected, revealFuture])

  const priceLines = useMemo<PriceLineSpec[]>(() => {
    if (!selected?.replay) return []
    const r = selected.replay
    return [
      { price: r.entryPrice, color: '#3b82f6', title: 'Entry' },
      { price: r.stopLoss, color: '#ef4444', title: 'SL' },
      { price: r.takeProfit, color: '#22c55e', title: 'TP' },
    ]
  }, [selected])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
      {/* ─── Left: chart + detail ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {MODE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`px-2 py-1 text-xs rounded ${
                  modeFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setModeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {VERDICT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`px-2 py-1 text-xs rounded ${
                  verdictFilter === f.id
                    ? f.id === 'correct'
                      ? 'bg-green-600 text-white'
                      : f.id === 'wrong'
                        ? 'bg-red-600 text-white'
                        : 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setVerdictFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={revealFuture}
            disabled={!selected}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ml-auto ${
              revealFuture
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } disabled:opacity-40`}
            onClick={() => setRevealFuture((v) => !v)}
            title="Show bars after the cutoff"
          >
            {revealFuture ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
            {revealFuture ? 'Hide future' : 'Reveal future'}
          </button>
          <button
            type="button"
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => exportPracticeCsv(filtered)}
            title={`Download ${filtered.length} filtered answer(s) as CSV`}
          >
            <Download size={14} aria-hidden />
            CSV
          </button>
          <button
            type="button"
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            onClick={() => exportPracticeJson(filtered)}
            title={`Download ${filtered.length} filtered answer(s) as JSON`}
          >
            <Download size={14} aria-hidden />
            JSON
          </button>
          <IndicatorPanel indicators={indicators} onToggle={toggleIndicator} />
        </div>

        <div
          data-no-swipe
          className="rounded-lg border border-gray-800 bg-[#0f1117] h-[60vh] md:h-[480px] overflow-hidden"
        >
          {!selected ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              {trades.length === 0
                ? 'No practice answers yet. Play Replay / Quiz / Setup to fill this list.'
                : 'No trades match the current filters.'}
            </div>
          ) : isLoading && candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading chart...
            </div>
          ) : candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              No candle data for this cutoff.
            </div>
          ) : (
            <PracticeChart
              candles={candles}
              cursorIndex={cursorIndex}
              priceLines={priceLines}
              markers={markers}
              decimals={pair.decimals}
              indicators={indicators}
            />
          )}
        </div>

        {selected && <TradeDetail trade={selected} onReview={() => setReviewTrade(selected)} />}
      </div>

      {/* ─── Right: trade list ─── */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-gray-400 px-1">
          {filtered.length} of {trades.length} answers
        </div>
        <div className="space-y-1 max-h-[680px] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/30 p-1">
          {filtered.length === 0 ? (
            <div className="text-[10px] text-gray-600 px-2 py-3 text-center">No matches.</div>
          ) : (
            filtered.map((t) => {
              const v = tradeVerdict(t)
              const pips = tradePips(t)
              const p = getPairById(t.pairId)
              const badge = tradeBadge(t)
              const isSel = t.id === selectedId
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left rounded px-2 py-1.5 text-[11px] transition-colors ${
                    isSel
                      ? 'bg-blue-900/40 border border-blue-700'
                      : 'border border-transparent hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1 py-0.5 text-[9px] font-bold uppercase rounded ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <span className="px-1 py-0.5 text-[9px] uppercase tracking-wider text-gray-500">
                      {t.mode}
                    </span>
                    <span className="text-gray-300 truncate">{p?.displayName ?? t.pairId}</span>
                    <span className="text-gray-600">{t.timeframe}</span>
                    <span
                      className={`ml-auto flex items-center ${
                        v === 'correct'
                          ? 'text-green-400'
                          : v === 'wrong'
                            ? 'text-red-400'
                            : 'text-gray-500'
                      }`}
                      aria-label={v}
                    >
                      {v === 'correct' ? (
                        <Check size={12} aria-hidden />
                      ) : v === 'wrong' ? (
                        <X size={12} aria-hidden />
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-500">
                      {formatDateJST(t.cutoffTimestamp * 1000)}
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      {pips != null && (
                        <span className={pips >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {pips > 0 ? '+' : ''}
                          {pips}p
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Delete answer"
                        className="text-gray-600 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTrade(t.id)
                          if (selectedId === t.id) setSelectedId(null)
                        }}
                      >
                        <Trash2 size={12} aria-hidden />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <AIReviewModal trade={reviewTrade} onClose={() => setReviewTrade(null)} />
    </div>
  )
}

interface DetailProps {
  trade: PracticeTrade
  onReview: () => void
}

function TradeDetail({ trade, onReview }: DetailProps) {
  const v = tradeVerdict(trade)
  const verdictCls =
    v === 'correct'
      ? 'bg-green-600 text-white'
      : v === 'wrong'
        ? 'bg-red-600 text-white'
        : 'bg-gray-700 text-gray-300'
  const verdictLabel = v === 'correct' ? 'Right' : v === 'wrong' ? 'Wrong' : 'Neutral'
  const pair = getPairById(trade.pairId)
  const dec = pair?.decimals ?? 5

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-700 text-gray-300">
          {trade.mode}
        </span>
        <span className="text-sm font-medium text-white">{pair?.displayName ?? trade.pairId}</span>
        <span className="text-xs text-gray-500">{trade.timeframe}</span>
        <span className="text-xs text-gray-500">{formatDateJST(trade.cutoffTimestamp * 1000)}</span>
        <span
          className={`ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded ${verdictCls}`}
        >
          {v === 'correct' ? (
            <Check size={12} aria-hidden />
          ) : v === 'wrong' ? (
            <X size={12} aria-hidden />
          ) : null}
          {verdictLabel}
        </span>
        <button
          type="button"
          aria-label="AI review"
          title="AI review"
          className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-800"
          onClick={onReview}
        >
          <Bot size={14} aria-hidden />
        </button>
      </div>

      {trade.quiz && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <DetailCell label="Prediction" value={trade.quiz.prediction.toUpperCase()} />
          <DetailCell label="Bars ahead" value={String(trade.quiz.barsAhead)} />
          <DetailCell
            label="Actual move"
            value={`${trade.quiz.actualMove > 0 ? '+' : ''}${trade.quiz.actualMove} pips`}
            valueClass={trade.quiz.actualMove >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      )}

      {trade.setup && (
        <>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            <DetailCell label="Judgement" value={trade.setup.judgement.toUpperCase()} />
            <DetailCell label="Confidence" value={`${trade.setup.confidence}/5`} />
            <DetailCell
              label="Outcome"
              value={`${trade.setup.outcomePips > 0 ? '+' : ''}${trade.setup.outcomePips}p`}
              valueClass={trade.setup.outcomePips >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <DetailCell label="Bars" value={String(trade.setup.outcomeBars)} />
          </div>
          {trade.setup.reason && (
            <div className="text-[11px] text-gray-300 italic border-l-2 border-gray-700 pl-2">
              {trade.setup.reason}
            </div>
          )}
        </>
      )}

      {trade.replay && (
        <>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            <DetailCell label="Direction" value={trade.replay.direction.toUpperCase()} />
            <DetailCell label="Entry" value={trade.replay.entryPrice.toFixed(dec)} />
            <DetailCell
              label="SL"
              value={trade.replay.stopLoss.toFixed(dec)}
              valueClass="text-red-400"
            />
            <DetailCell
              label="TP"
              value={trade.replay.takeProfit.toFixed(dec)}
              valueClass="text-green-400"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            <DetailCell label="Exit" value={trade.replay.exitPrice.toFixed(dec)} />
            <DetailCell label="Reason" value={trade.replay.exitReason.toUpperCase()} />
            <DetailCell
              label="P/L"
              value={`${trade.replay.pips > 0 ? '+' : ''}${trade.replay.pips}p`}
              valueClass={trade.replay.pips >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <DetailCell label="Hold" value={`${trade.replay.holdBars}b`} />
          </div>
          {trade.replay.note && (
            <div className="text-[11px] text-gray-300 italic border-l-2 border-gray-700 pl-2">
              {trade.replay.note}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DetailCell({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`font-mono ${valueClass ?? 'text-gray-200'}`}>{value}</div>
    </div>
  )
}
