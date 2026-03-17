import { useMemo } from 'react'
import { computeSummary } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { StatItem } from './shared/StatItem'

interface Props {
  trades: Trade[]
}

function fmtJPY(v: number): string {
  return `¥${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString()}`
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

export function SummaryCards({ trades }: Props) {
  const s = useMemo(() => computeSummary(trades), [trades])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem label="Total Trades" value={s.totalTrades} />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem label="Net P/L" value={fmtJPY(s.netPL)} color="auto" numericValue={s.netPL} />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem
          label="Win Rate"
          value={fmtPct(s.winRate)}
          color={s.winRate >= 0.5 ? 'green' : 'red'}
          sub={`${s.winCount}W / ${s.lossCount}L`}
        />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem
          label="Profit Factor"
          value={s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)}
          color={s.profitFactor >= 1 ? 'green' : 'red'}
        />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem label="Avg Win" value={fmtJPY(s.avgWin)} color="green" />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem label="Avg Loss" value={fmtJPY(-s.avgLoss)} color="red" />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem
          label="Expectancy"
          value={fmtJPY(s.expectancy)}
          color="auto"
          numericValue={s.expectancy}
        />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <StatItem
          label="Long / Short"
          value={`${s.longCount} / ${s.shortCount}`}
          sub={`${fmtPct(s.longCount / (s.totalTrades || 1))} L`}
        />
      </div>
    </div>
  )
}
