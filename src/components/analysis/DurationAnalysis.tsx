import { useMemo } from 'react'
import { computeDurationAnalysis } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { MiniBarChart } from './shared/MiniBarChart'

interface Props {
  trades: Trade[]
}

export function DurationAnalysis({ trades }: Props) {
  const buckets = useMemo(() => computeDurationAnalysis(trades), [trades])
  const avgHoldMins = useMemo(() => {
    if (trades.length === 0) return 0
    const total = trades.reduce(
      (s, t) => s + (new Date(t.closeDate).getTime() - new Date(t.openDate).getTime()),
      0,
    )
    return total / trades.length / 60000
  }, [trades])

  const active = buckets.filter((b) => b.count > 0)

  if (active.length === 0) return null

  const bestDuration = active.reduce((a, b) => (a.avgPL > b.avgPL ? a : b))

  const fmtDuration = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${(mins / 60).toFixed(1)}h`
    return `${(mins / 1440).toFixed(1)}d`
  }

  return (
    <AnalysisCard title="Trade Duration">
      <div className="space-y-3">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-gray-500">Avg Hold: </span>
            <span className="text-gray-300">{fmtDuration(avgHoldMins)}</span>
          </div>
          <div>
            <span className="text-gray-500">Best Duration: </span>
            <span className="text-green-400">
              {bestDuration.label} (¥{Math.round(bestDuration.avgPL).toLocaleString()}/trade)
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1">Trade Count by Duration</div>
          <MiniBarChart
            bars={buckets.map((b) => ({
              label: b.label,
              value: b.count,
              color: '#3b82f6',
            }))}
            height={80}
          />
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-1">Duration</th>
              <th className="text-right py-1">Count</th>
              <th className="text-right py-1">Win Rate</th>
              <th className="text-right py-1">Avg P/L</th>
              <th className="text-right py-1">Net P/L</th>
            </tr>
          </thead>
          <tbody>
            {buckets
              .filter((b) => b.count > 0)
              .map((b) => (
                <tr key={b.label} className="border-b border-gray-800/50">
                  <td className="py-1 text-gray-300">{b.label}</td>
                  <td className="py-1 text-right text-gray-400">{b.count}</td>
                  <td
                    className={`py-1 text-right ${b.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {(b.winRate * 100).toFixed(0)}%
                  </td>
                  <td
                    className={`py-1 text-right font-mono ${b.avgPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    ¥{Math.round(b.avgPL).toLocaleString()}
                  </td>
                  <td
                    className={`py-1 text-right font-mono ${b.netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    ¥{Math.round(b.netPL).toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AnalysisCard>
  )
}
