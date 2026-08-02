import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useIsAIConfigured } from '@/hooks/use-is-ai-configured'
import { getPairById, PAIRS } from '@/config/pairs'
import type { BacktestRun } from '@/generated/bindings'
import { useBacktest } from '@/hooks/use-backtest'
import { formatDateJST } from '@/lib/date-utils'
import { useAIStore } from '@/store/ai-store'
import { SettingsDialog } from '../ai/SettingsDialog'

const directionStyles = {
  long: 'bg-green-900/50 text-green-400',
  short: 'bg-red-900/50 text-red-400',
} as const

const statusStyles = {
  win: 'bg-green-900/50 text-green-400',
  loss: 'bg-red-900/50 text-red-400',
  expired: 'bg-gray-700 text-gray-400',
} as const

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every day' },
  { value: 3, label: 'Every 3 days' },
  { value: 7, label: 'Every week' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 30, label: 'Every month' },
]

function formatDate(offset: number): string {
  const d = new Date(Date.now() - offset)
  d.setHours(9, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function BacktestPage() {
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)

  const [selectedPairs, setSelectedPairs] = useState<string[]>(['USD_JPY'])
  const [countInput, setCountInput] = useState('')
  const [startInput, setStartInput] = useState(() => formatDate(30 * 86_400_000))
  const [endInput, setEndInput] = useState(() => formatDate(2 * 86_400_000))
  const [intervalDays, setIntervalDays] = useState(7)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())

  const {
    runs,
    loaded,
    runStatus,
    progress,
    error,
    aggregateStats,
    modelStats,
    runBacktest,
    deleteRun,
    cancel,
  } = useBacktest()

  const { configured: isConfigured, loading: configLoading } = useIsAIConfigured()
  const isRunning =
    runStatus === 'fetching-data' ||
    runStatus === 'streaming' ||
    runStatus === 'parsing' ||
    runStatus === 'validating'

  const togglePair = (pairId: string) => {
    setSelectedPairs((prev) =>
      prev.includes(pairId) ? prev.filter((id) => id !== pairId) : [...prev, pairId],
    )
  }

  const toggleExpanded = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  const handleRun = () => {
    if (selectedPairs.length === 0 || !startInput || !endInput) return
    const startTimestamp = new Date(startInput).getTime()
    const endTimestamp = new Date(endInput).getTime()
    if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) return
    if (startTimestamp >= endTimestamp) return
    const count = countInput ? Number.parseInt(countInput, 10) : undefined
    runBacktest({
      startTimestamp,
      endTimestamp,
      intervalDays,
      pairIds: selectedPairs,
      count: count && count > 0 ? count : undefined,
    })
  }

  // Estimate number of cutoff points
  const estimatedCutoffs = (() => {
    const start = new Date(startInput).getTime()
    const end = new Date(endInput).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return 0
    return Math.floor((end - start) / (intervalDays * 86_400_000)) + 1
  })()

  const formatPairs = (pairIds: string[]) =>
    pairIds.map((id) => getPairById(id)?.displayName ?? id).join(', ')

  const formatRange = (start: number | undefined | null, end: number | undefined | null) => {
    if (start == null && end == null) return '—'
    const s = start ?? end
    const e = end ?? start
    return `${formatDateJST(s as number)} ~ ${formatDateJST(e as number)}`
  }

  const runWindow = (cfg: BacktestRun['config']) => {
    const start = cfg.startTimestamp ?? cfg.cutoffTimestamp ?? null
    const end = cfg.endTimestamp ?? cfg.cutoffTimestamp ?? null
    const interval = cfg.intervalDays ?? 1
    return { start, end, interval }
  }

  return (
    <div className="h-[calc(100vh-49px)] overflow-y-auto bg-surface text-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Backtest</h1>
          <div className="flex items-center gap-3">
            {configLoading && <span className="text-xs text-gray-500">⏳ checking…</span>}
            {!configLoading && isConfigured && (
              <span className="text-xs text-green-400">API configured</span>
            )}
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Not configured — only after probe resolved */}
        {!configLoading && !isConfigured && (
          <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-4">
            <div className="text-sm text-yellow-300 font-medium mb-1">API Key Required</div>
            <div className="text-xs text-yellow-300/70">
              Configure your Claude API key in Settings to run backtests.
            </div>
            <button
              type="button"
              className="mt-3 px-4 py-1.5 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-500"
              onClick={() => setSettingsOpen(true)}
            >
              Configure API Key
            </button>
          </div>
        )}

        {/* Config panel */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
          <div className="text-xs font-medium text-gray-300">Run Backtest</div>
          <div className="text-[10px] text-gray-500">
            AI generates predictions at each cutoff point. Each trade is validated within 1-day
            holding period.
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">From</label>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">To</label>
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">Interval</label>
              <select
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {estimatedCutoffs > 0 && (
              <span className="text-[10px] text-gray-500">{estimatedCutoffs} cutoff points</span>
            )}
          </div>

          {/* Pair selection */}
          <div className="flex flex-wrap gap-1">
            {PAIRS.map((pair) => (
              <button
                key={pair.id}
                type="button"
                className={`px-2 py-1 text-[11px] rounded transition-colors ${
                  selectedPairs.includes(pair.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => togglePair(pair.id)}
              >
                {pair.displayName}
              </button>
            ))}
          </div>

          {/* Count + run */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">Count per cutoff</label>
              <input
                type="number"
                min="1"
                max="50"
                placeholder="auto"
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="w-16 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600"
              />
            </div>
            <button
              type="button"
              className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={handleRun}
              disabled={
                !isConfigured || isRunning || selectedPairs.length === 0 || estimatedCutoffs === 0
              }
            >
              Run Backtest
            </button>
            {isRunning && (
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
                onClick={cancel}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {isRunning && progress && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-2">
            <div className="text-xs text-gray-300 font-medium">
              Cutoff {progress.cutoffIndex}/{progress.cutoffTotal}
            </div>
            {progress.phase === 'fetching-data' && (
              <div className="text-xs text-gray-400 animate-pulse">
                Fetching historical data... {progress.detail}
              </div>
            )}
            {progress.phase === 'streaming' && (
              <div className="text-xs text-gray-400 animate-pulse">
                Receiving predictions from AI...
              </div>
            )}
            {progress.phase === 'parsing' && (
              <div className="text-xs text-gray-400">Parsing predictions...</div>
            )}
            {progress.phase === 'validating' &&
              progress.validationCurrent !== undefined &&
              progress.validationTotal !== undefined && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">
                    Validating {progress.validationCurrent}/{progress.validationTotal}...
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(progress.validationCurrent / progress.validationTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            {/* Overall progress bar */}
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-green-600 h-1 rounded-full transition-all"
                style={{
                  width: `${((progress.cutoffIndex - 1) / progress.cutoffTotal) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-gray-600">
              Overall: {progress.cutoffIndex - 1}/{progress.cutoffTotal} completed
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Aggregate stats */}
        {aggregateStats && aggregateStats.totalRuns > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-xs font-medium text-gray-300 mb-2">
              Aggregate ({aggregateStats.totalRuns} run{aggregateStats.totalRuns > 1 ? 's' : ''})
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">{aggregateStats.total} predictions</span>
              <span className="text-green-400">{aggregateStats.wins}W</span>
              <span className="text-red-400">{aggregateStats.losses}L</span>
              <span className="text-gray-400">{aggregateStats.expired}E</span>
              {aggregateStats.wins + aggregateStats.losses > 0 && (
                <span
                  className={
                    aggregateStats.winRate >= 50
                      ? 'text-green-400 font-medium'
                      : 'text-red-400 font-medium'
                  }
                >
                  {aggregateStats.winRate}%
                </span>
              )}
              <span className={aggregateStats.totalPips >= 0 ? 'text-green-400' : 'text-red-400'}>
                {aggregateStats.totalPips > 0 ? '+' : ''}
                {aggregateStats.totalPips} pips
              </span>
            </div>
          </div>
        )}

        {/* Model stats */}
        {modelStats.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-xs font-medium text-gray-300 mb-2">Model Performance</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {modelStats.map((m) => (
                <div
                  key={m.model}
                  className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded bg-gray-800"
                >
                  <span className="text-gray-400 truncate mr-2">{m.model}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-green-400">{m.wins}W</span>
                    <span className="text-red-400">{m.losses}L</span>
                    {m.wins + m.losses > 0 && (
                      <span
                        className={
                          m.winRate >= 50
                            ? 'text-green-400 font-medium'
                            : 'text-red-400 font-medium'
                        }
                      >
                        {m.winRate}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run history */}
        {loaded && runs.length > 0 && (
          <div className="space-y-3">
            {runs.map((run) => {
              const isExpanded = expandedRuns.has(run.id)
              const { start, end, interval } = runWindow(run.config)
              const cutoffCount =
                start != null && end != null && end > start
                  ? Math.floor((end - start) / (interval * 86_400_000)) + 1
                  : run.predictions.length
              return (
                <div key={run.id} className="rounded-lg border border-gray-800 bg-gray-900/50">
                  {/* Run summary */}
                  <div className="p-4 flex items-center justify-between">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse run' : 'Expand run'}
                      className="flex-1 text-left"
                      onClick={() => toggleExpanded(run.id)}
                    >
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500 flex items-center">
                          {isExpanded ? (
                            <ChevronDown size={12} aria-hidden />
                          ) : (
                            <ChevronRight size={12} aria-hidden />
                          )}
                        </span>
                        <span className="text-white font-medium">{formatRange(start, end)}</span>
                        <span className="text-gray-500">
                          {cutoffCount}x / {interval}d
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-1 ml-5">
                        <span className="text-gray-500">
                          {formatPairs(run.config.pairIds)} | {run.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-1 ml-5">
                        <span className="text-gray-400">{run.stats.total} total</span>
                        <span className="text-green-400">{run.stats.wins}W</span>
                        <span className="text-red-400">{run.stats.losses}L</span>
                        <span className="text-gray-400">{run.stats.expired}E</span>
                        {run.stats.wins + run.stats.losses > 0 && (
                          <span
                            className={
                              run.stats.winRate >= 50
                                ? 'text-green-400 font-medium'
                                : 'text-red-400 font-medium'
                            }
                          >
                            {run.stats.winRate}%
                          </span>
                        )}
                        <span
                          className={run.stats.totalPips >= 0 ? 'text-green-400' : 'text-red-400'}
                        >
                          {run.stats.totalPips > 0 ? '+' : ''}
                          {run.stats.totalPips} pips
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded"
                      onClick={() => deleteRun(run.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Expanded predictions */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {run.predictions.map((p) => {
                          const pair = getPairById(p.pairId)
                          return (
                            <div
                              key={p.id}
                              className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 space-y-2"
                            >
                              {/* Pair + direction + status */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white">
                                    {pair?.displayName ?? p.pairId}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${directionStyles[p.direction]}`}
                                  >
                                    {p.direction}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusStyles[p.status]}`}
                                >
                                  {p.status}
                                </span>
                              </div>

                              {/* Prices */}
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-500">Entry</div>
                                  <div className="text-white font-mono">{p.entryPrice}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">SL</div>
                                  <div className="text-red-400 font-mono">{p.stopLoss}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">TP</div>
                                  <div className="text-green-400 font-mono">{p.takeProfit}</div>
                                </div>
                              </div>

                              {/* Meta */}
                              <div className="text-[10px] text-gray-500">
                                {p.timeframe} | Cutoff: {formatDateJST(p.cutoffTimestamp)}
                              </div>

                              {/* Validation result */}
                              {p.validationResult && (
                                <div
                                  className={`rounded px-3 py-2 text-xs ${
                                    p.validationResult.result === 'win'
                                      ? 'bg-green-900/30 text-green-400'
                                      : 'bg-red-900/30 text-red-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {p.validationResult.result === 'win' ? '+' : ''}
                                      {p.validationResult.pipsGained} pips
                                    </span>
                                    <span className="text-gray-500">
                                      Exit: {p.validationResult.exitPrice} @{' '}
                                      {formatDateJST(p.validationResult.exitTime)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {p.status === 'expired' && !p.validationResult && (
                                <div className="rounded px-3 py-2 text-xs bg-gray-700/30 text-gray-500">
                                  Neither SL nor TP hit within 1 day
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {loaded && runs.length === 0 && !isRunning && (
          <div className="text-xs text-gray-500 text-center py-12">
            No backtest runs yet. Configure a date range and click Run Backtest.
          </div>
        )}
      </div>

      <SettingsDialog />
    </div>
  )
}
