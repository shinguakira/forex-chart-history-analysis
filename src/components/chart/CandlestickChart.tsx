import {
  CandlestickSeries,
  CrosshairMode,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  LineSeries,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { CHART_COLORS } from '@/config/constants'
import { bollingerBands, ema, type LinePoint, macd, rsi, sma } from '@/lib/indicators'
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

function toTimeSeries(points: LinePoint[]) {
  return points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
}

export function CandlestickChart({ data, indicators, trades, goToTimestamp, onNavigated }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const macdContainerRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<number> | null>(null)

  const enabledIndicators = indicators.filter((i) => i.enabled)

  const hasRsi = enabledIndicators.some((i) => i.config.type === 'rsi')
  const hasMacd = enabledIndicators.some((i) => i.config.type === 'macd')

  // ─── Main chart ───
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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_COLORS.grid,
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
      overlaySeriesRef.current.clear()
    }
  }, [])

  // ─── RSI sub-chart ───
  useEffect(() => {
    if (!hasRsi || !rsiContainerRef.current) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove()
        rsiChartRef.current = null
        rsiSeriesRef.current = null
      }
      return
    }
    const chart = createChart(rsiContainerRef.current, {
      layout: { background: { color: CHART_COLORS.background }, textColor: CHART_COLORS.text },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: CHART_COLORS.grid },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      height: 120,
    })
    const series = chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 1,
      priceScaleId: 'right',
    })
    rsiChartRef.current = chart
    rsiSeriesRef.current = series

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    ro.observe(rsiContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      rsiChartRef.current = null
      rsiSeriesRef.current = null
    }
  }, [hasRsi])

  // ─── MACD sub-chart ───
  useEffect(() => {
    if (!hasMacd || !macdContainerRef.current) {
      if (macdChartRef.current) {
        macdChartRef.current.remove()
        macdChartRef.current = null
        macdLineRef.current = null
        macdSignalRef.current = null
        macdHistRef.current = null
      }
      return
    }
    const chart = createChart(macdContainerRef.current, {
      layout: { background: { color: CHART_COLORS.background }, textColor: CHART_COLORS.text },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: CHART_COLORS.grid },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      height: 140,
    })
    const hist = chart.addSeries(HistogramSeries, { priceScaleId: 'right' })
    const line = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceScaleId: 'right',
    })
    const signal = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      priceScaleId: 'right',
    })

    macdChartRef.current = chart
    macdHistRef.current = hist
    macdLineRef.current = line
    macdSignalRef.current = signal

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    ro.observe(macdContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      macdChartRef.current = null
      macdLineRef.current = null
      macdSignalRef.current = null
      macdHistRef.current = null
    }
  }, [hasMacd])

  // ─── Data update ───
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return
    const chart = chartRef.current
    if (!chart) return

    // Set candle data
    candleSeriesRef.current.setData(
      data.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    // Remove old overlay series
    for (const [key, series] of overlaySeriesRef.current) {
      chart.removeSeries(series)
      overlaySeriesRef.current.delete(key)
    }

    // Add overlay indicators
    for (const ind of enabledIndicators) {
      const cfg = ind.config
      if (cfg.type === 'sma') {
        const points = sma(data, cfg.period)
        const series = chart.addSeries(LineSeries, {
          color: cfg.color,
          lineWidth: 1,
          priceScaleId: 'right',
        })
        series.setData(toTimeSeries(points))
        overlaySeriesRef.current.set(ind.id, series)
      } else if (cfg.type === 'ema') {
        const points = ema(data, cfg.period)
        const series = chart.addSeries(LineSeries, {
          color: cfg.color,
          lineWidth: 1,
          priceScaleId: 'right',
        })
        series.setData(toTimeSeries(points))
        overlaySeriesRef.current.set(ind.id, series)
      } else if (cfg.type === 'bollingerBands') {
        const bb = bollingerBands(data, cfg.period, cfg.stdDev)
        const upper = chart.addSeries(LineSeries, {
          color: '#6366f180',
          lineWidth: 1,
          priceScaleId: 'right',
        })
        const middle = chart.addSeries(LineSeries, {
          color: '#6366f1',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
        })
        const lower = chart.addSeries(LineSeries, {
          color: '#6366f180',
          lineWidth: 1,
          priceScaleId: 'right',
        })
        upper.setData(toTimeSeries(bb.upper))
        middle.setData(toTimeSeries(bb.middle))
        lower.setData(toTimeSeries(bb.lower))
        overlaySeriesRef.current.set(`${ind.id}-upper`, upper)
        overlaySeriesRef.current.set(`${ind.id}-middle`, middle)
        overlaySeriesRef.current.set(`${ind.id}-lower`, lower)
      }
    }

    // RSI
    if (hasRsi && rsiSeriesRef.current) {
      const rsiEntry = enabledIndicators.find((i) => i.config.type === 'rsi')
      if (rsiEntry?.config.type === 'rsi') {
        const rsiData = rsi(data, rsiEntry.config.period)
        rsiSeriesRef.current.setData(toTimeSeries(rsiData))
      }
    }

    // MACD
    if (hasMacd && macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
      const macdEntry = enabledIndicators.find((i) => i.config.type === 'macd')
      if (macdEntry?.config.type === 'macd') {
        const macdData = macd(
          data,
          macdEntry.config.fastPeriod,
          macdEntry.config.slowPeriod,
          macdEntry.config.signalPeriod,
        )
        macdLineRef.current.setData(toTimeSeries(macdData.macd))
        macdSignalRef.current.setData(toTimeSeries(macdData.signal))
        macdHistRef.current.setData(
          macdData.histogram.map((p) => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? '#22c55e80' : '#ef444480',
          })),
        )
      }
    }
  }, [data, enabledIndicators, hasRsi, hasMacd])

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

      // Entry marker — arrow showing direction, positioned at entry
      if (openTs >= dataStart && openTs <= dataEnd) {
        markers.push({
          time: openTs as UTCTimestamp,
          position: isBull ? 'belowBar' : 'aboveBar',
          shape: isBull ? 'arrowUp' : 'arrowDown',
          color: '#3b82f6',
          text: `▶ ${isBull ? 'BUY' : 'SELL'} x${trade.size} @${trade.openPrice.toFixed(3)}`,
          size: 2,
        })
      }

      // Exit marker — circle with P&L
      if (closeTs >= dataStart && closeTs <= dataEnd) {
        markers.push({
          time: closeTs as UTCTimestamp,
          position: isBull ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          color: '#ffffff',
          text: `◼ ${plText} @${trade.closePrice.toFixed(3)}`,
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
  }, [goToTimestamp, data, onNavigated])

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
