import { useMemo } from 'react'
import { computeMonthlyBreakdown } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'

interface Props {
  trades: Trade[]
}

export function MonthlyBreakdown({ trades }: Props) {
  const rows = useMemo(() => computeMonthlyBreakdown(trades), [trades])

  if (rows.length === 0) return null

  return (
    <AnalysisCard title="Monthly Breakdown" fullWidth>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-1.5 px-2">Month</th>
              <th className="text-right py-1.5 px-2">Trades</th>
              <th className="text-right py-1.5 px-2">Wins</th>
              <th className="text-right py-1.5 px-2">Losses</th>
              <th className="text-right py-1.5 px-2">Win Rate</th>
              <th className="text-right py-1.5 px-2">Net P/L</th>
              <th className="text-right py-1.5 px-2">Avg P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2 text-gray-300">{r.month}</td>
                <td className="text-right py-1.5 px-2 text-gray-400">{r.trades}</td>
                <td className="text-right py-1.5 px-2 text-green-400">{r.wins}</td>
                <td className="text-right py-1.5 px-2 text-red-400">{r.losses}</td>
                <td
                  className={`text-right py-1.5 px-2 ${r.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {(r.winRate * 100).toFixed(1)}%
                </td>
                <td
                  className={`text-right py-1.5 px-2 font-mono ${r.netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  ¥{r.netPL >= 0 ? '+' : ''}
                  {Math.round(r.netPL).toLocaleString()}
                </td>
                <td
                  className={`text-right py-1.5 px-2 font-mono ${r.avgPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  ¥{Math.round(r.avgPL).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisCard>
  )
}
