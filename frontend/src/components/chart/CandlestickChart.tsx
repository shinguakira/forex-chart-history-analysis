import {
  CandlestickSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { CHART_COLORS } from '@/config/constants'
import { useChartIndicators } from '@/hooks/use-chart-indicators'
import { formatCandleTimeJST, formatTimeOnlyJST } from '@/lib/date-utils'
import type { Candle } from '@/types/candle'
import type { IndicatorEntry } from '@/types/indicators'
import type { Trade } from '@/types/trade'

interface Props {
  data: Candle[]
  indicators: IndicatorEntry[]
  trades?: Trade[]
  goToTimestamp?: number | null
  onNavigated?: () => void
}

type UTCTimestamp = import('lightweight-charts').UTCTimestamp

export function CandlestickChart({ data, indicators, trades, goToTimestamp, onNavigated }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const macdContainerRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  // ─── Main chart init ───
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
        timeFormatter: (t: number) => formatCandleTimeJST(t),
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_COLORS.grid,
        tickMarkFormatter: (t: number) => formatTimeOnlyJST(t),
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
    })

    chartRef.current = chart
    candleSeriesRef.current = series

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
      candleSeriesRef.current = null
    }
  }, [])

  // ─── Candle data ───
  useEffect(() => {
    if (!candleSeriesRef.current) return
    candleSeriesRef.current.setData(
      data.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
  }, [data])

  // ─── Indicators (overlays + RSI/MACD subplots) ───
  const { hasRsi, hasMacd, rsiChartRef, macdChartRef } = useChartIndicators({
    chartRef,
    candleSeriesRef,
    data,
    indicators,
    rsiContainerRef,
    macdContainerRef,
  })

  // ─── Trade markers ───
  useEffect(() => {
    if (!candleSeriesRef.current) return

    if (markersPluginRef.current) {
      markersPluginRef.current.detach()
      markersPluginRef.current = null
    }

    if (!trades || trades.length === 0 || data.length === 0) return

    const dataStart = data[0].time
    const dataEnd = data[data.length - 1].time

    type SeriesMarker = {
      time: UTCTimestamp
      position: 'aboveBar' | 'belowBar'
      shape: 'arrowUp' | 'arrowDown' | 'circle'
      color: string
      text: string
      size: number
    }

    const markers: SeriesMarker[] = []

    for (const trade of trades) {
      const openTs = Math.floor(new Date(trade.openDate).getTime() / 1000)
      const closeTs = Math.floor(new Date(trade.closeDate).getTime() / 1000)
      const isBull = trade.direction === 'bull'
      const plText = `${trade.pl >= 0 ? '+' : ''}${trade.pl.toLocaleString()}`

      if (openTs >= dataStart && openTs <= dataEnd) {
        markers.push({
          time: openTs as UTCTimestamp,
          position: isBull ? 'belowBar' : 'aboveBar',
          shape: isBull ? 'arrowUp' : 'arrowDown',
          color: '#3b82f6',
          text: `${isBull ? 'BUY' : 'SELL'} x${trade.size} @${trade.openPrice.toFixed(3)}`,
          size: 2,
        })
      }

      if (closeTs >= dataStart && closeTs <= dataEnd) {
        markers.push({
          time: closeTs as UTCTimestamp,
          position: isBull ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          color: '#ffffff',
          text: `${plText} @${trade.closePrice.toFixed(3)}`,
          size: 2,
        })
      }
    }

    if (markers.length === 0) return

    markers.sort((a, b) => a.time - b.time)

    const plugin = createSeriesMarkers(candleSeriesRef.current, markers)
    markersPluginRef.current = plugin

    return () => {
      if (markersPluginRef.current) {
        markersPluginRef.current.detach()
        markersPluginRef.current = null
      }
    }
  }, [trades, data])

  // ─── Navigate to specific timestamp ───
  useEffect(() => {
    if (goToTimestamp == null || !chartRef.current || data.length === 0) return

    const targetIdx = data.findIndex((c) => c.time >= goToTimestamp)
    const idx = targetIdx === -1 ? data.length - 1 : targetIdx
    const barsFromRight = data.length - 1 - idx

    chartRef.current.timeScale().scrollToPosition(-barsFromRight, false)
    rsiChartRef.current?.timeScale().scrollToPosition(-barsFromRight, false)
    macdChartRef.current?.timeScale().scrollToPosition(-barsFromRight, false)

    onNavigated?.()
  }, [goToTimestamp, data, onNavigated, rsiChartRef, macdChartRef])

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
