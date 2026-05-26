import { useMemo } from 'react'
import { computeCumulativePL } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { MiniLineChart } from './shared/MiniLineChart'

interface Props {
  trades: Trade[]
}

export function CumulativePLChart({ trades }: Props) {
  const data = useMemo(() => computeCumulativePL(trades), [trades])

  if (data.length === 0) return null

  const final = data[data.length - 1].cumPL
  const max = Math.max(...data.map((d) => d.cumPL))
  const min = Math.min(...data.map((d) => d.cumPL))

  return (
    <AnalysisCard title="Cumulative P/L" fullWidth>
      <div className="flex items-center gap-4 mb-2 text-xs">
        <span className={`font-mono ${final >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Final: ¥{final >= 0 ? '+' : ''}
          {Math.round(final).toLocaleString()}
        </span>
        <span className="text-gray-500">Peak: ¥{Math.round(max).toLocaleString()}</span>
        <span className="text-gray-500">Trough: ¥{Math.round(min).toLocaleString()}</span>
      </div>
      <MiniLineChart
        points={data.map((d) => ({ value: d.cumPL }))}
        height={200}
        color={final >= 0 ? '#22c55e' : '#ef4444'}
        showZeroLine
        fillBelow
      />
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>{data[0].date.slice(0, 10)}</span>
        <span>{data[data.length - 1].date.slice(0, 10)}</span>
      </div>
    </AnalysisCard>
  )
}
