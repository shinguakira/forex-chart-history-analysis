import { useIsAIConfigured } from '@/hooks/use-is-ai-configured'
import { useMemo, useState } from 'react'
import { getPairById, PAIRS } from '@/config/pairs'
import { usePredictions } from '@/hooks/use-predictions'
import { formatDateJST } from '@/lib/date-utils'
import { useAIStore } from '@/store/ai-store'
import type { PredictionStatus } from '@/types/prediction'
import { ReviewSkeleton } from '../ai/ReviewSkeleton'
import { SettingsDialog } from '../ai/SettingsDialog'

type StatusFilter = PredictionStatus | 'all'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
]

const directionStyles = {
  long: 'bg-green-900/50 text-green-400',
  short: 'bg-red-900/50 text-red-400',
} as const

const statusStyles = {
  pending: 'bg-yellow-900/50 text-yellow-400',
  win: 'bg-green-900/50 text-green-400',
  loss: 'bg-red-900/50 text-red-400',
  expired: 'bg-gray-700 text-gray-400',
} as const

export function PredictionsPage() {
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)

  // Generation options
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['USD_JPY'])
  const [countInput, setCountInput] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [pairFilter, setPairFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const {
    predictions,
    loaded,
    generateStatus,
    progress,
    error,
    validatingId,
    stats,
    modelStats,
    generate,
    validate,
    validateAll,
    deletePrediction,
    cancel,
  } = usePredictions()

  const { configured: isConfigured, loading: configLoading } = useIsAIConfigured()
  const isGenerating =
    generateStatus === 'fetching-data' ||
    generateStatus === 'streaming' ||
    generateStatus === 'parsing'

  // Unique values for filter dropdowns
  const uniquePairs = useMemo(() => {
    const set = new Set(predictions.map((p) => p.pairId))
    return Array.from(set)
  }, [predictions])

  const uniqueModels = useMemo(() => {
    const set = new Set(predictions.map((p) => p.model))
    return Array.from(set)
  }, [predictions])

  // Apply all filters
  const filtered = useMemo(() => {
    let result = predictions
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }
    if (pairFilter !== 'all') {
      result = result.filter((p) => p.pairId === pairFilter)
    }
    if (modelFilter !== 'all') {
      result = result.filter((p) => p.model === modelFilter)
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      result = result.filter((p) => p.createdAt >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000
      result = result.filter((p) => p.createdAt < to)
    }
    return result
  }, [predictions, statusFilter, pairFilter, modelFilter, dateFrom, dateTo])

  // Filtered stats
  const filteredStats = useMemo(() => {
    const wins = filtered.filter((p) => p.status === 'win').length
    const losses = filtered.filter((p) => p.status === 'loss').length
    const pending = filtered.filter((p) => p.status === 'pending').length
    const decided = wins + losses
    return {
      total: filtered.length,
      wins,
      losses,
      pending,
      winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
    }
  }, [filtered])

  const pendingCount = stats.pending

  const togglePair = (pairId: string) => {
    setSelectedPairs((prev) =>
      prev.includes(pairId) ? prev.filter((id) => id !== pairId) : [...prev, pairId],
    )
  }

  const handleGenerate = () => {
    if (selectedPairs.length === 0) return
    const count = countInput ? Number.parseInt(countInput, 10) : undefined
    generate({ pairIds: selectedPairs, count: count && count > 0 ? count : undefined })
  }

  return (
    <div className="h-[calc(100vh-49px)] overflow-y-auto bg-[#0f1117] text-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">AI Predictions</h1>
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

        {/* Not configured — only after the probe resolved, so the banner
            doesn't flash on every navigation. */}
        {!configLoading && !isConfigured && (
          <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-4">
            <div className="text-sm text-yellow-300 font-medium mb-1">API Key Required</div>
            <div className="text-xs text-yellow-300/70">
              Configure your Claude API key in Settings to generate predictions.
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

        {/* Generation panel */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
          <div className="text-xs font-medium text-gray-300">Generate Predictions</div>

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

          {/* Count + generate */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">Count</label>
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
              onClick={handleGenerate}
              disabled={!isConfigured || isGenerating || selectedPairs.length === 0}
            >
              Generate
            </button>
            {isGenerating && (
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

        {/* Generation progress */}
        {generateStatus === 'fetching-data' && (
          <ReviewSkeleton label={`Fetching market data... ${progress}`} />
        )}
        {generateStatus === 'streaming' && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-xs text-gray-400 animate-pulse">
              Receiving predictions from AI...
            </div>
          </div>
        )}
        {generateStatus === 'parsing' && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-xs text-gray-400">Parsing predictions...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
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

        {/* Filters */}
        {loaded && predictions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Status tabs */}
            <div className="flex gap-1">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    statusFilter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-700" />

            {/* Pair filter */}
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
            >
              <option value="all">All Pairs</option>
              {uniquePairs.map((id) => (
                <option key={id} value={id}>
                  {getPairById(id)?.displayName ?? id}
                </option>
              ))}
            </select>

            {/* Model filter */}
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
            >
              <option value="all">All Models</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
              <span className="text-gray-600 text-xs">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>

            {/* Validate All */}
            {pendingCount > 0 && !isGenerating && (
              <>
                <div className="w-px h-4 bg-gray-700" />
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  onClick={validateAll}
                  disabled={validatingId !== null}
                >
                  Validate All ({pendingCount})
                </button>
              </>
            )}
          </div>
        )}

        {/* Filtered stats */}
        {loaded && filtered.length > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400">{filteredStats.total} shown</span>
            <span className="text-green-400">{filteredStats.wins}W</span>
            <span className="text-red-400">{filteredStats.losses}L</span>
            <span className="text-yellow-400">{filteredStats.pending}P</span>
            {filteredStats.wins + filteredStats.losses > 0 && (
              <span className={filteredStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                {filteredStats.winRate}% win rate
              </span>
            )}
          </div>
        )}

        {/* Predictions grid */}
        {loaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const pair = getPairById(p.pairId)
              const isValidating = validatingId === p.id
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3"
                >
                  {/* Pair + direction */}
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
                      <div className="text-gray-500">Stop Loss</div>
                      <div className="text-red-400 font-mono">{p.stopLoss}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Take Profit</div>
                      <div className="text-green-400 font-mono">{p.takeProfit}</div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>{p.timeframe}</span>
                    <span>{p.model}</span>
                    <span>{formatDateJST(p.createdAt)}</span>
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

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {p.status === 'pending' && (
                      <button
                        type="button"
                        className="px-3 py-1 text-xs rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50"
                        onClick={() => validate(p.id)}
                        disabled={isValidating}
                      >
                        {isValidating ? 'Validating...' : 'Validate'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                      onClick={() => deletePrediction(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty states */}
        {loaded && predictions.length === 0 && !isGenerating && (
          <div className="text-xs text-gray-500 text-center py-12">
            No predictions yet. Click Generate to create AI predictions.
          </div>
        )}

        {loaded && predictions.length > 0 && filtered.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-12">
            No predictions match the current filters.
          </div>
        )}
      </div>

      <SettingsDialog />
    </div>
  )
}
