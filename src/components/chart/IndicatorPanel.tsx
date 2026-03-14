import { useState } from 'react'
import { useIndicatorStore } from '@/store/indicator-store'

const INDICATOR_LABELS: Record<string, { label: string; group: string }> = {
  'sma-20': { label: 'SMA 20', group: 'Moving Averages' },
  'sma-50': { label: 'SMA 50', group: 'Moving Averages' },
  'sma-200': { label: 'SMA 200', group: 'Moving Averages' },
  'ema-12': { label: 'EMA 12', group: 'Moving Averages' },
  'ema-26': { label: 'EMA 26', group: 'Moving Averages' },
  rsi: { label: 'RSI (14)', group: 'Oscillators' },
  macd: { label: 'MACD (12,26,9)', group: 'Oscillators' },
  bb: { label: 'Bollinger Bands (20,2)', group: 'Volatility' },
}

function getColor(config: { color?: string; type: string }): string | null {
  if ('color' in config && config.color) return config.color as string
  if (config.type === 'bollingerBands') return '#6366f1'
  if (config.type === 'rsi') return '#a855f7'
  if (config.type === 'macd') return '#3b82f6'
  return null
}

export function IndicatorPanel() {
  const [open, setOpen] = useState(false)
  const indicators = useIndicatorStore((s) => s.indicators)
  const toggle = useIndicatorStore((s) => s.toggleIndicator)

  const enabledCount = indicators.filter((i) => i.enabled).length

  // Group indicators
  const groups = new Map<string, typeof indicators>()
  for (const ind of indicators) {
    const meta = INDICATOR_LABELS[ind.id]
    const group = meta?.group ?? 'Other'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)?.push(ind)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
        Indicators
        {enabledCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-600 text-white">
            {enabledCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Technical Indicators</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {[...groups.entries()].map(([groupName, items]) => (
                <div key={groupName}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-800/50">
                    {groupName}
                  </div>
                  {items.map((ind) => {
                    const meta = INDICATOR_LABELS[ind.id]
                    const color = getColor(ind.config as { color?: string; type: string })
                    return (
                      <button
                        type="button"
                        key={ind.id}
                        onClick={() => toggle(ind.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            ind.enabled
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-600 bg-transparent'
                          }`}
                        >
                          {ind.enabled && (
                            <svg
                              className="w-3 h-3 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              aria-hidden="true"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {color && (
                          <span
                            className="w-3 h-0.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        <span className={ind.enabled ? 'text-white' : 'text-gray-400'}>
                          {meta?.label ?? ind.id}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
