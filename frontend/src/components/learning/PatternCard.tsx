import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ChartPattern } from '@/config/chart-patterns'
import { PatternChart } from './PatternChart'

interface Props {
  pattern: ChartPattern
}

const signalStyles = {
  bullish: 'bg-green-900/50 text-green-400',
  bearish: 'bg-red-900/50 text-red-400',
  neutral: 'bg-gray-700 text-gray-300',
} as const

const categoryStyles = 'bg-blue-900/50 text-blue-400'

export function PatternCard({ pattern }: Props) {
  const [expanded, setExpanded] = useState(false)

  const candles = useMemo(() => pattern.generateCandles(), [pattern])
  const markers = useMemo(() => pattern.getMarkers?.(), [pattern])

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden">
      <PatternChart candles={candles} markers={markers} />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{pattern.name}</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${signalStyles[pattern.signal]}`}
          >
            {pattern.signal}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${categoryStyles}`}>
            {pattern.category}
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">{pattern.description}</p>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} aria-hidden />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown size={12} aria-hidden />
              Show Details
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="text-xs font-medium text-gray-300 mb-1">How to Identify</div>
              <ul className="space-y-1">
                {pattern.identification.map((item) => (
                  <li key={item} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-blue-400 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-300 mb-1">Trading Strategy</div>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="text-green-400 font-medium shrink-0 w-16">Entry</span>
                  <span className="text-gray-400">{pattern.trading.entry}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-red-400 font-medium shrink-0 w-16">Stop Loss</span>
                  <span className="text-gray-400">{pattern.trading.stopLoss}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-medium shrink-0 w-16">Target</span>
                  <span className="text-gray-400">{pattern.trading.target}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
