import { useMemo } from 'react'
import { computeRiskReward } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

export function RiskRewardAnalysis({ trades }: Props) {
  const rr = useMemo(() => computeRiskReward(trades), [trades])

  return (
    <AnalysisCard title="Risk / Reward">
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          label="Avg R:R (wins)"
          value={`${rr.avgRR.toFixed(2)}:1`}
          color={rr.avgRR >= 1 ? 'green' : 'red'}
        />
        <StatItem
          label="Wins ≥ 1:1 R:R"
          value={`${rr.tradesAbove1to1}/${rr.totalWins}`}
          sub={
            rr.totalWins > 0
              ? `${((rr.tradesAbove1to1 / rr.totalWins) * 100).toFixed(0)}%`
              : undefined
          }
        />
        <StatItem
          label="Wins ≥ 2:1 R:R"
          value={`${rr.tradesAbove2to1}/${rr.totalWins}`}
          sub={
            rr.totalWins > 0
              ? `${((rr.tradesAbove2to1 / rr.totalWins) * 100).toFixed(0)}%`
              : undefined
          }
        />
        <StatItem
          label="Wins ≥ 3:1 R:R"
          value={`${rr.tradesAbove3to1}/${rr.totalWins}`}
          sub={
            rr.totalWins > 0
              ? `${((rr.tradesAbove3to1 / rr.totalWins) * 100).toFixed(0)}%`
              : undefined
          }
        />
      </div>
    </AnalysisCard>
  )
}
