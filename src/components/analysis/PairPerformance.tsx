import { useMemo } from 'react'
import { computePairPerformance } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'

interface Props {
  trades: Trade[]
}

export function PairPerformance({ trades }: Props) {
  const pairs = useMemo(() => computePairPerformance(trades), [trades])

  if (pairs.length === 0) return null

  return (
    <AnalysisCard title="Pair Performance">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5">Pair</th>
            <th className="text-right py-1.5">Trades</th>
            <th className="text-right py-1.5">Win Rate</th>
            <th className="text-right py-1.5">Net P/L</th>
            <th className="text-right py-1.5">PF</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p) => (
            <tr key={p.pairId} className="border-b border-gray-800/50">
              <td className="py-1.5 text-gray-300">{p.pairId.replace('_', '/')}</td>
              <td className="text-right py-1.5 text-gray-400">{p.trades}</td>
              <td
                className={`text-right py-1.5 ${p.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}
              >
                {(p.winRate * 100).toFixed(1)}%
              </td>
              <td
                className={`text-right py-1.5 font-mono ${p.netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                ¥{Math.round(p.netPL).toLocaleString()}
              </td>
              <td className="text-right py-1.5 text-gray-400">
                {p.profitFactor === Infinity ? '∞' : p.profitFactor.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AnalysisCard>
  )
}
