import { useMemo } from 'react'
import { computeStreaks } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

export function StreakAnalysis({ trades }: Props) {
  const s = useMemo(() => computeStreaks(trades), [trades])

  return (
    <AnalysisCard title="Streak Analysis">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Current:</span>
          <span
            className={`text-sm font-bold ${s.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`}
          >
            {s.currentStreak.length} {s.currentStreak.type === 'win' ? 'wins' : 'losses'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatItem
            label="Longest Win Streak"
            value={`${s.longestWin.length} trades`}
            color="green"
            sub={
              s.longestWin.startDate
                ? `${s.longestWin.startDate.slice(0, 10)} → ${s.longestWin.endDate.slice(0, 10)}`
                : undefined
            }
          />
          <StatItem
            label="Longest Loss Streak"
            value={`${s.longestLoss.length} trades`}
            color="red"
            sub={
              s.longestLoss.startDate
                ? `${s.longestLoss.startDate.slice(0, 10)} → ${s.longestLoss.endDate.slice(0, 10)}`
                : undefined
            }
          />
          <StatItem label="Avg Win Streak" value={s.avgWinStreak.toFixed(1)} />
          <StatItem label="Avg Loss Streak" value={s.avgLossStreak.toFixed(1)} />
        </div>
      </div>
    </AnalysisCard>
  )
}
