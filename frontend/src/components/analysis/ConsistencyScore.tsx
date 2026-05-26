import { useMemo } from 'react'
import { computeConsistency } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

export function ConsistencyScore({ trades }: Props) {
  const c = useMemo(() => computeConsistency(trades), [trades])

  return (
    <AnalysisCard title="Consistency">
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          label="Profitable Months"
          value={`${(c.profitableMonthsPct * 100).toFixed(0)}%`}
          color={c.profitableMonthsPct >= 0.5 ? 'green' : 'red'}
          sub={`${c.profitableMonths}/${c.totalMonths}`}
        />
        <StatItem
          label="Profitable Weeks"
          value={`${(c.profitableWeeksPct * 100).toFixed(0)}%`}
          color={c.profitableWeeksPct >= 0.5 ? 'green' : 'red'}
          sub={`${c.profitableWeeks}/${c.totalWeeks}`}
        />
        <StatItem label="P/L Std Dev" value={`¥${Math.round(c.plStdDev).toLocaleString()}`} />
        <StatItem
          label="Sharpe Ratio"
          value={c.sharpeRatio.toFixed(3)}
          color={c.sharpeRatio > 0 ? 'green' : 'red'}
          sub="avg P/L ÷ std dev"
        />
      </div>
    </AnalysisCard>
  )
}
