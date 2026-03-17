import { useMemo } from 'react'
import { computeRecentComparison, computeRolling } from '@/lib/trade-analysis'
import type { Trade } from '@/types/trade'
import { AnalysisCard } from './shared/AnalysisCard'
import { MiniLineChart } from './shared/MiniLineChart'

interface Props {
  trades: Trade[]
}

function fmtJPY(v: number): string {
  return `¥${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString()}`
}

export function RecentTrend({ trades }: Props) {
  const rolling20 = useMemo(() => computeRolling(trades, 20), [trades])
  const rolling50 = useMemo(() => computeRolling(trades, 50), [trades])
  const comparison = useMemo(() => computeRecentComparison(trades), [trades])

  return (
    <AnalysisCard title="Recent Performance Trend">
      <div className="space-y-4">
        {/* Rolling win rate */}
        {rolling20.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-1">
              Rolling 20-Trade Win Rate
              {rolling20.length > 0 && (
                <span className="ml-2 text-gray-400">
                  Current: {(rolling20[rolling20.length - 1].winRate * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <MiniLineChart
              points={rolling20.map((p) => ({ value: p.winRate * 100 }))}
              height={80}
              color="#3b82f6"
            />
          </div>
        )}

        {rolling50.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-1">
              Rolling 50-Trade Win Rate
              {rolling50.length > 0 && (
                <span className="ml-2 text-gray-400">
                  Current: {(rolling50[rolling50.length - 1].winRate * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <MiniLineChart
              points={rolling50.map((p) => ({ value: p.winRate * 100 }))}
              height={80}
              color="#8b5cf6"
            />
          </div>
        )}

        {/* Last 30 days vs overall */}
        {comparison && comparison.last30Days.totalTrades > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-2">Last 30 Days vs Overall</div>
            <div className="grid grid-cols-3 gap-3">
              <div />
              <div className="text-[10px] text-gray-500 text-center">Last 30d</div>
              <div className="text-[10px] text-gray-500 text-center">Overall</div>

              <div className="text-xs text-gray-400">Trades</div>
              <div className="text-xs text-center text-gray-300">
                {comparison.last30Days.totalTrades}
              </div>
              <div className="text-xs text-center text-gray-500">
                {comparison.overall.totalTrades}
              </div>

              <div className="text-xs text-gray-400">Win Rate</div>
              <div
                className={`text-xs text-center ${comparison.last30Days.winRate >= comparison.overall.winRate ? 'text-green-400' : 'text-red-400'}`}
              >
                {(comparison.last30Days.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-center text-gray-500">
                {(comparison.overall.winRate * 100).toFixed(1)}%
              </div>

              <div className="text-xs text-gray-400">Avg P/L</div>
              <div
                className={`text-xs text-center font-mono ${comparison.last30Days.avgPL >= comparison.overall.avgPL ? 'text-green-400' : 'text-red-400'}`}
              >
                {fmtJPY(comparison.last30Days.avgPL)}
              </div>
              <div className="text-xs text-center text-gray-500 font-mono">
                {fmtJPY(comparison.overall.avgPL)}
              </div>

              <div className="text-xs text-gray-400">PF</div>
              <div
                className={`text-xs text-center ${comparison.last30Days.profitFactor >= comparison.overall.profitFactor ? 'text-green-400' : 'text-red-400'}`}
              >
                {comparison.last30Days.profitFactor === Infinity
                  ? '∞'
                  : comparison.last30Days.profitFactor.toFixed(2)}
              </div>
              <div className="text-xs text-center text-gray-500">
                {comparison.overall.profitFactor === Infinity
                  ? '∞'
                  : comparison.overall.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Improvement indicators */}
        {comparison && comparison.last30Days.totalTrades > 0 && (
          <div className="flex gap-2 flex-wrap">
            {comparison.last30Days.winRate > comparison.overall.winRate && (
              <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                Win rate improving
              </span>
            )}
            {comparison.last30Days.winRate < comparison.overall.winRate && (
              <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
                Win rate declining
              </span>
            )}
            {comparison.last30Days.avgPL > comparison.overall.avgPL && (
              <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                Avg P/L improving
              </span>
            )}
            {comparison.last30Days.avgPL < comparison.overall.avgPL && (
              <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
                Avg P/L declining
              </span>
            )}
          </div>
        )}
      </div>
    </AnalysisCard>
  )
}
