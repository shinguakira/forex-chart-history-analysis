import { useMemo, useState } from 'react'
import { TRADE_HISTORY } from '@/config/trade-history'
import { ConsistencyScore } from './ConsistencyScore'
import { CumulativePLChart } from './CumulativePLChart'
import { DirectionAnalysis } from './DirectionAnalysis'
import { DrawdownAnalysis } from './DrawdownAnalysis'
import { DurationAnalysis } from './DurationAnalysis'
import { DurationFilter } from './DurationFilter'
import { MonthlyBreakdown } from './MonthlyBreakdown'
import { PairPerformance } from './PairPerformance'
import { PositionSizeAnalysis } from './PositionSizeAnalysis'
import { RecentTrend } from './RecentTrend'
import { RiskRewardAnalysis } from './RiskRewardAnalysis'
import { StreakAnalysis } from './StreakAnalysis'
import { SummaryCards } from './SummaryCards'
import { TimeAnalysis } from './TimeAnalysis'

function getPresetStart(preset: string): Date | null {
  if (preset === 'all') return null
  const now = new Date()
  switch (preset) {
    case '1m':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case '3m':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case '6m':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case '2y':
      return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
    default:
      return null
  }
}

export function AnalysisPage() {
  const [preset, setPreset] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const filteredTrades = useMemo(() => {
    if (preset === 'custom') {
      const start = customStart ? new Date(customStart) : null
      const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null
      return TRADE_HISTORY.filter((t) => {
        const d = new Date(t.closeDate)
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      })
    }

    const start = getPresetStart(preset)
    if (!start) return TRADE_HISTORY

    return TRADE_HISTORY.filter((t) => new Date(t.closeDate) >= start)
  }, [preset, customStart, customEnd])

  return (
    <div className="h-[calc(100vh-49px)] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Trade Analysis</h2>
          <span className="text-xs text-gray-500">{filteredTrades.length} trades</span>
        </div>

        <DurationFilter
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        <SummaryCards trades={filteredTrades} />

        <CumulativePLChart trades={filteredTrades} />

        <MonthlyBreakdown trades={filteredTrades} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PairPerformance trades={filteredTrades} />
          <DirectionAnalysis trades={filteredTrades} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeAnalysis trades={filteredTrades} />
          <DurationAnalysis trades={filteredTrades} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PositionSizeAnalysis trades={filteredTrades} />
          <StreakAnalysis trades={filteredTrades} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DrawdownAnalysis trades={filteredTrades} />
          <RiskRewardAnalysis trades={filteredTrades} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConsistencyScore trades={filteredTrades} />
          <RecentTrend trades={filteredTrades} />
        </div>
      </div>
    </div>
  )
}
