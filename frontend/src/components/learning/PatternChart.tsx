import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { PatternMarker } from '@/config/chart-patterns'
import { CHART_COLORS } from '@/config/constants'
import type { Candle } from '@/types/candle'

type UTCTimestamp = import('lightweight-charts').UTCTimestamp

interface Props {
  candles: Candle[]
  markers?: PatternMarker[]
}

export function PatternChart({ candles, markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<number> | null>(null)

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
      handleScroll: false,
      handleScale: false,
      timeScale: { visible: false },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      crosshair: { mode: 0 },
      height: 200,
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
    seriesRef.current = series

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return

    seriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    if (markersPluginRef.current) {
      markersPluginRef.current.detach()
      markersPluginRef.current = null
    }

    if (markers && markers.length > 0) {
      const chartMarkers = markers
        .filter((m) => m.index >= 0 && m.index < candles.length)
        .map((m) => ({
          time: candles[m.index].time as UTCTimestamp,
          position: m.position === 'above' ? ('aboveBar' as const) : ('belowBar' as const),
          shape: 'circle' as const,
          color: '#60a5fa',
          text: m.label,
          size: 1,
        }))
        .sort((a, b) => a.time - b.time)

      if (chartMarkers.length > 0) {
        markersPluginRef.current = createSeriesMarkers(seriesRef.current, chartMarkers)
      }
    }

    chartRef.current?.timeScale().fitContent()

    return () => {
      if (markersPluginRef.current) {
        markersPluginRef.current.detach()
        markersPluginRef.current = null
      }
    }
  }, [candles, markers])

  return <div ref={containerRef} className="w-full" />
}
