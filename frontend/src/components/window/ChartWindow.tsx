import { useCallback, useMemo } from 'react'
import { CandlestickChart } from '@/components/chart/CandlestickChart'
import { GoToDateInput } from '@/components/chart/GoToDateInput'
import { IndicatorPanel } from '@/components/chart/IndicatorPanel'
import { LatestButton } from '@/components/chart/LatestButton'
import { PeriodSelector } from '@/components/chart/PeriodSelector'
import { TimeframeSelector } from '@/components/chart/TimeframeSelector'
import { TradeToggle } from '@/components/chart/TradeToggle'
import { getPairById, PAIRS } from '@/config/pairs'
import { TRADE_HISTORY } from '@/config/trade-history'
import { useChartData } from '@/hooks/use-chart-data'
import { useDrag } from '@/hooks/use-drag'
import { useResize } from '@/hooks/use-resize'
import { formatPrice, formatPriceChange } from '@/lib/utils'
import { useWindowStore } from '@/store/window-store'

interface Props {
  windowId: string
}

export function ChartWindow({ windowId }: Props) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === windowId))
  const focusWindow = useWindowStore((s) => s.focusWindow)
  const closeWindow = useWindowStore((s) => s.closeWindow)
  const updatePosition = useWindowStore((s) => s.updatePosition)
  const updateSize = useWindowStore((s) => s.updateSize)
  const clearGoTo = useWindowStore((s) => s.clearWindowGoTo)

  const pair = getPairById(win?.pairId ?? '') ?? PAIRS[0]
  const { candles, regularMarketPrice, previousClose, isLoading } = useChartData(
    pair,
    win?.timeframe ?? '1',
    win?.period ?? '5d',
    win?.goToTimestamp ?? null,
  )

  const indicators = win?.indicators
  const enabledIndicators = useMemo(() => indicators?.filter((i) => i.enabled) ?? [], [indicators])
  const showTrades = win?.showTrades ?? false
  const pairTrades = useMemo(
    () => (showTrades ? TRADE_HISTORY.filter((t) => t.pairId === pair.id) : []),
    [showTrades, pair.id],
  )

  const { onPointerDown: onDragDown } = useDrag({
    onDrag: (x, y) => updatePosition(windowId, x, y),
    onDragStart: () => focusWindow(windowId),
  })

  const { onPointerDown: onResizeDown } = useResize({
    onResize: (w, h) => updateSize(windowId, w, h),
    onResizeStart: () => focusWindow(windowId),
  })

  const onNavigated = useCallback(() => clearGoTo(windowId), [clearGoTo, windowId])

  if (!win) return null

  const change =
    regularMarketPrice && previousClose
      ? formatPriceChange(regularMarketPrice, previousClose)
      : null

  return (
    <div
      data-window
      className="absolute flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden select-none"
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => focusWindow(windowId)}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 cursor-grab active:cursor-grabbing"
        onPointerDown={onDragDown}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-white truncate">{pair.displayName}</span>
          {regularMarketPrice > 0 && (
            <span className="text-sm font-mono text-gray-300">
              {formatPrice(regularMarketPrice, pair.decimals)}
            </span>
          )}
          {change && (
            <span
              className={`text-xs font-mono ${change.positive ? 'text-green-400' : 'text-red-400'}`}
            >
              {change.value} ({change.percent})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(windowId)
            }}
            className="p-1 rounded hover:bg-red-600/80 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Controls row 1: timeframe + indicators */}
      <div className="flex items-center justify-between border-b border-gray-700">
        <TimeframeSelector windowId={windowId} />
        <div className="pr-2">
          <IndicatorPanel windowId={windowId} />
        </div>
      </div>

      {/* Controls row 2: period + go-to + latest + trades */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-700">
        <PeriodSelector windowId={windowId} />
        <div className="ml-auto flex items-center gap-1">
          <TradeToggle windowId={windowId} />
          <GoToDateInput windowId={windowId} />
          <LatestButton windowId={windowId} />
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-0">
        {isLoading && candles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading...
          </div>
        ) : (
          <CandlestickChart
            data={candles}
            indicators={enabledIndicators}
            trades={pairTrades}
            goToTimestamp={win.goToTimestamp}
            onNavigated={onNavigated}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onPointerDown={onResizeDown}
      >
        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z" />
        </svg>
      </div>
    </div>
  )
}
