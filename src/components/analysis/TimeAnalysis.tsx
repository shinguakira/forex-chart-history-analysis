import { useMemo } from 'react'
import { computeDayOfWeekAnalysis, computeHourlyAnalysis } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { MiniBarChart } from './shared/MiniBarChart'

interface Props {
  trades: Trade[]
}

export function TimeAnalysis({ trades }: Props) {
  const hourly = useMemo(() => computeHourlyAnalysis(trades), [trades])
  const daily = useMemo(() => computeDayOfWeekAnalysis(trades), [trades])

  const activeHours = hourly.filter((h) => h.tradeCount > 0)
  const bestHour =
    activeHours.length > 0 ? activeHours.reduce((a, b) => (a.avgPL > b.avgPL ? a : b)) : null
  const worstHour =
    activeHours.length > 0 ? activeHours.reduce((a, b) => (a.avgPL < b.avgPL ? a : b)) : null

  return (
    <AnalysisCard title="Time Analysis">
      <div className="space-y-4">
        {/* Hourly trade count */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1">Trades by Hour (UTC)</div>
          <MiniBarChart
            bars={hourly.map((h) => ({
              label: String(h.hour),
              value: h.tradeCount,
              color: h.winRate >= 0.5 ? '#22c55e80' : '#ef444480',
            }))}
            height={80}
          />
        </div>

        {/* Hourly P/L */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1">Net P/L by Hour</div>
          <MiniBarChart
            bars={hourly.map((h) => ({
              label: String(h.hour),
              value: h.netPL,
            }))}
            height={80}
            showValues={false}
          />
        </div>

        {/* Best / Worst hours */}
        {bestHour && worstHour && (
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-gray-500">Best hour: </span>
              <span className="text-green-400">
                {bestHour.hour}:00 (¥{Math.round(bestHour.avgPL).toLocaleString()}/trade)
              </span>
            </div>
            <div>
              <span className="text-gray-500">Worst hour: </span>
              <span className="text-red-400">
                {worstHour.hour}:00 (¥{Math.round(worstHour.avgPL).toLocaleString()}/trade)
              </span>
            </div>
          </div>
        )}

        {/* Day of week */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1">Day of Week</div>
          <table className="w-full text-xs">
            <tbody>
              {daily
                .filter((d) => d.tradeCount > 0)
                .map((d) => (
                  <tr key={d.day} className="border-b border-gray-800/50">
                    <td className="py-1 text-gray-400 w-10">{d.dayName}</td>
                    <td className="py-1 text-gray-500 text-right">{d.tradeCount}</td>
                    <td
                      className={`py-1 text-right ${d.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {(d.winRate * 100).toFixed(0)}%
                    </td>
                    <td
                      className={`py-1 text-right font-mono ${d.netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      ¥{Math.round(d.netPL).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </AnalysisCard>
  )
}
