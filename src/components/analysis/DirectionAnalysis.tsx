import { useMemo } from 'react'
import { computeDirectionStats } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

function fmtJPY(v: number): string {
  return `¥${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString()}`
}

export function DirectionAnalysis({ trades }: Props) {
  const stats = useMemo(() => computeDirectionStats(trades), [trades])

  return (
    <AnalysisCard title="Direction Analysis (Long vs Short)">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.direction} className="space-y-2">
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded inline-block ${
                s.direction === 'bull' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
              }`}
            >
              {s.direction === 'bull' ? 'Long' : 'Short'} ({s.count})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatItem
                label="Win Rate"
                value={`${(s.winRate * 100).toFixed(1)}%`}
                color={s.winRate >= 0.5 ? 'green' : 'red'}
              />
              <StatItem
                label="Net P/L"
                value={fmtJPY(s.netPL)}
                color="auto"
                numericValue={s.netPL}
              />
              <StatItem label="Avg Win" value={fmtJPY(s.avgWin)} color="green" />
              <StatItem label="Avg Loss" value={fmtJPY(-s.avgLoss)} color="red" />
              <StatItem
                label="Profit Factor"
                value={s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)}
                color={s.profitFactor >= 1 ? 'green' : 'red'}
              />
            </div>
          </div>
        ))}
      </div>
    </AnalysisCard>
  )
}
