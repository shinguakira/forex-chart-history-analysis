import { CandlestickChart } from '@/components/chart/CandlestickChart'
import { ChartHeader } from '@/components/chart/ChartHeader'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { TimeframeSelector } from '@/components/chart/TimeframeSelector'
import { PairList } from '@/components/sidebar/PairList'
import { getPairById, PAIRS } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import { useUiStore } from '@/store/ui-store'

export function MainLayout() {
  const selectedPairId = useUiStore((s) => s.selectedPairId)
  const selectedTimeframe = useUiStore((s) => s.selectedTimeframe)
  const pair = getPairById(selectedPairId) ?? PAIRS[0]

  const { candles, regularMarketPrice, previousClose, isLoading } = useChartData(
    pair,
    selectedTimeframe,
  )

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <aside className="w-64 border-r border-gray-800 overflow-y-auto flex-shrink-0">
        <PairList selectedPairData={{ regularMarketPrice, previousClose }} />
      </aside>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between border-b border-gray-800">
          <ChartHeader pair={pair} price={regularMarketPrice} previousClose={previousClose} />
          <div className="flex items-center gap-2 pr-2">
            <TimeframeSelector />
            <IndicatorPanel />
          </div>
        </div>
        <div className="flex-1 relative">
          {isLoading && candles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <CandlestickChart data={candles} />
          )}
        </div>
      </div>
    </div>
  )
}
