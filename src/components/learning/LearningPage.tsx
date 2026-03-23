import { useMemo, useState } from 'react'
import { CHART_PATTERNS, type PatternCategory, type SignalType } from '@/config/chart-patterns'
import { PatternCard } from './PatternCard'

type CategoryFilter = PatternCategory | 'all'
type SignalFilter = SignalType | 'all'

const categories: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'continuation', label: 'Continuation' },
  { value: 'candlestick', label: 'Candlestick' },
]

const signals: { value: SignalFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
]

export function LearningPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all')

  const filtered = useMemo(() => {
    return CHART_PATTERNS.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (signalFilter !== 'all' && p.signal !== signalFilter) return false
      return true
    })
  }, [categoryFilter, signalFilter])

  return (
    <div className="h-[calc(100vh-49px)] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Chart Patterns</h2>
          <span className="text-xs text-gray-500">{filtered.length} patterns</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  categoryFilter === c.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
                onClick={() => setCategoryFilter(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-700" />

          <div className="flex gap-1">
            {signals.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  signalFilter === s.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
                onClick={() => setSignalFilter(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-12">
            No patterns match the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
