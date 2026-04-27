import { useMemo } from 'react'
import { computeSizeAnalysis } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'

interface Props {
  trades: Trade[]
}

export function PositionSizeAnalysis({ trades }: Props) {
  const sizes = useMemo(() => computeSizeAnalysis(trades), [trades])

  if (sizes.length === 0) return null

  return (
    <AnalysisCard title="Position Size">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1">Size</th>
            <th className="text-right py-1">Count</th>
            <th className="text-right py-1">Win Rate</th>
            <th className="text-right py-1">Avg P/L</th>
            <th className="text-right py-1">Net P/L</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((s) => (
            <tr key={s.size} className="border-b border-gray-800/50">
              <td className="py-1 text-gray-300">x{s.size}</td>
              <td className="py-1 text-right text-gray-400">{s.count}</td>
              <td
                className={`py-1 text-right ${s.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}
              >
                {(s.winRate * 100).toFixed(0)}%
              </td>
              <td
                className={`py-1 text-right font-mono ${s.avgPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                ¥{Math.round(s.avgPL).toLocaleString()}
              </td>
              <td
                className={`py-1 text-right font-mono ${s.netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                ¥{Math.round(s.netPL).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AnalysisCard>
  )
}
