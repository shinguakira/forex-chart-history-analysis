import { useMemo } from 'react'
import { computeDrawdown } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

export function DrawdownAnalysis({ trades }: Props) {
  const dd = useMemo(() => computeDrawdown(trades), [trades])

  if (trades.length === 0) return null

  return (
    <AnalysisCard title="Drawdown Analysis">
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          label="Max Drawdown"
          value={`¥-${Math.round(dd.maxDrawdown).toLocaleString()}`}
          color="red"
          sub={
            dd.maxDrawdownStartDate
              ? `${dd.maxDrawdownStartDate.slice(0, 10)} → ${dd.maxDrawdownEndDate.slice(0, 10)}`
              : undefined
          }
        />
        <StatItem
          label="Max DD from Peak"
          value={
            dd.maxDrawdownPeak > 0
              ? `${((dd.maxDrawdown / dd.maxDrawdownPeak) * 100).toFixed(1)}%`
              : '0%'
          }
          color="red"
          sub={`Peak: ¥${Math.round(dd.maxDrawdownPeak).toLocaleString()}`}
        />
        <StatItem
          label="Current Drawdown"
          value={`¥-${Math.round(dd.currentDrawdown).toLocaleString()}`}
          color={dd.currentDrawdown > 0 ? 'red' : 'green'}
          sub={`Peak: ¥${Math.round(dd.currentPeak).toLocaleString()}`}
        />
        <StatItem
          label="Current DD %"
          value={
            dd.currentPeak > 0
              ? `${((dd.currentDrawdown / dd.currentPeak) * 100).toFixed(1)}%`
              : '0%'
          }
          color={dd.currentDrawdown > 0 ? 'red' : 'green'}
        />
      </div>
    </AnalysisCard>
  )
}
