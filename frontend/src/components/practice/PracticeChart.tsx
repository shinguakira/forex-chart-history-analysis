import {
  CandlestickSeries,
  CrosshairMode,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts'
import { useEffect, useMemo, useRef } from 'react'
import { CHART_COLORS } from '@/config/constants'
import { useChartIndicators } from '@/hooks/use-chart-indicators'
import { formatCandleTimeJST, formatTimeOnlyJST } from '@/lib/date-utils'
import type { Candle } from '@/types/candle'
import type { IndicatorEntry } from '@/types/indicators'

type UTCTimestamp = import('lightweight-charts').UTCTimestamp

export interface PriceLineSpec {
  price: number
  color: string
  title: string
}

export interface ChartMarker {
  time: number
  position: 'aboveBar' | 'belowBar'
  shape: 'arrowUp' | 'arrowDown' | 'circle'
  color: string
  text: string
}

interface Props {
  candles: Candle[]
  cursorIndex: number | null
  priceLines?: PriceLineSpec[]
  markers?: ChartMarker[]
  blindMode?: boolean
  decimals: number
  indicators?: IndicatorEntry[]
}

export function PracticeChart({
  candles,
  cursorIndex,
  priceLines,
  markers,
  blindMode,
  decimals,
  indicators,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const macdContainerRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const linesRef = useRef<IPriceLine[]>([])
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  const visible = useMemo(() => {
    if (cursorIndex == null) return candles
    return candles.slice(0, cursorIndex + 1)
  }, [candles, cursorIndex])

  // ─── Chart init ───
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      localization: {
        timeFormatter: (t: number) => (blindMode ? '' : formatCandleTimeJST(t)),
        priceFormatter: (price: number) => price.toFixed(decimals),
      },
      timeScale: {
        timeVisible: !blindMode,
        secondsVisible: false,
        borderColor: CHART_COLORS.grid,
        tickMarkFormatter: (t: number) => (blindMode ? '' : formatTimeOnlyJST(t)),
        rightOffset: 8,
      },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderUpColor: CHART_COLORS.borderUp,
      borderDownColor: CHART_COLORS.borderDown,
      wickUpColor: CHART_COLORS.wickUp,
      wickDownColor: CHART_COLORS.wickDown,
      priceFormat: { type: 'price', precision: decimals, minMove: 1 / 10 ** decimals },
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.applyOptions({ width, height })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      linesRef.current = []
      markersPluginRef.current = null
    }
  }, [blindMode, decimals])

  // ─── Data update ───
  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(
      visible.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
  }, [visible])

  // ─── Indicators (overlays + RSI/MACD subplots) ───
  const indicatorsList = useMemo(() => indicators ?? [], [indicators])
  const { hasRsi, hasMacd } = useChartIndicators({
    chartRef,
    candleSeriesRef: seriesRef,
    data: visible,
    indicators: indicatorsList,
    rsiContainerRef,
    macdContainerRef,
    subplotOptions: { blindMode },
  })

  // ─── Price lines ───
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    for (const ln of linesRef.current) {
      series.removePriceLine(ln)
    }
    linesRef.current = []

    if (!priceLines) return

    for (const spec of priceLines) {
      const ln = series.createPriceLine({
        price: spec.price,
        color: spec.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: spec.title,
      })
      linesRef.current.push(ln)
    }
  }, [priceLines])

  // ─── Markers ───
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    if (markersPluginRef.current) {
      markersPluginRef.current.detach()
      markersPluginRef.current = null
    }

    if (!markers || markers.length === 0) return

    const sorted = [...markers].sort((a, b) => a.time - b.time)
    markersPluginRef.current = createSeriesMarkers(
      series,
      sorted.map((m) => ({
        time: m.time as UTCTimestamp,
        position: m.position,
        shape: m.shape,
        color: m.color,
        text: m.text,
        size: 1,
      })),
    )
  }, [markers])

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-hidden" />
      {hasRsi && (
        <div className="border-t border-gray-800">
          <div className="px-2 py-0.5 text-xs text-gray-500">RSI</div>
          <div ref={rsiContainerRef} className="w-full" />
        </div>
      )}
      {hasMacd && (
        <div className="border-t border-gray-800">
          <div className="px-2 py-0.5 text-xs text-gray-500">MACD</div>
          <div ref={macdContainerRef} className="w-full" />
        </div>
      )}
    </div>
  )
}
