import { X } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { CandlestickChart } from '@/components/chart/CandlestickChart'
import { GoToDateInput } from '@/components/chart/GoToDateInput'
import { WindowIndicatorPanel } from '@/components/chart/IndicatorPanel'
import { LatestButton } from '@/components/chart/LatestButton'
import { PeriodSelector } from '@/components/chart/PeriodSelector'
import { TimeframeSelector } from '@/components/chart/TimeframeSelector'
import { TradeToggle } from '@/components/chart/TradeToggle'
import { getPairById, PAIRS } from '@/config/pairs'
import { useChartData } from '@/hooks/use-chart-data'
import { useTradeHistory } from '@/hooks/use-trade-history'
import { useDrag } from '@/hooks/use-drag'
import { useResize } from '@/hooks/use-resize'
import { useIsMobile } from '@/hooks/use-media-query'
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
  const { trades: TRADE_HISTORY } = useTradeHistory()
  const pairTrades = useMemo(
    () => (showTrades ? TRADE_HISTORY.filter((t) => t.pairId === pair.id) : []),
    [showTrades, pair.id, TRADE_HISTORY],
  )

  const isMobile = useIsMobile()

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

  // Mobile: ignore stored geometry, fill the canvas, drop drag/resize handles.
  // The window-canvas is a single-column stack — z-index from the store still
  // controls which one is on top.
  const positionStyle = isMobile
    ? { inset: 0, zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }

  return (
    <div
      data-window
      className={`flex flex-col bg-gray-900 ${
        isMobile ? 'absolute' : 'absolute border border-gray-700 rounded-lg'
      } shadow-2xl overflow-hidden select-none`}
      style={positionStyle}
      onMouseDown={() => focusWindow(windowId)}
    >
      {/* Title bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 ${
          isMobile ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={isMobile ? undefined : onDragDown}
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
            aria-label="Close chart window"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(windowId)
            }}
            className="p-1 rounded hover:bg-red-600/80 text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>

      {/* Controls row 1: timeframe + indicators */}
      <div className="flex items-center justify-between border-b border-gray-700">
        <TimeframeSelector windowId={windowId} />
        <div className="pr-2">
          <WindowIndicatorPanel windowId={windowId} />
        </div>
      </div>

      {/* Controls row 2: period + go-to + latest + trades */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-0.5 border-b border-gray-700">
        <PeriodSelector windowId={windowId} />
        <div className="md:ml-auto flex flex-wrap items-center gap-1">
          <TradeToggle windowId={windowId} />
          <LatestButton windowId={windowId} />
          <GoToDateInput windowId={windowId} />
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

      {/* Resize handle — desktop only */}
      {!isMobile && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onPointerDown={onResizeDown}
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z" />
          </svg>
        </div>
      )}
    </div>
  )
}
