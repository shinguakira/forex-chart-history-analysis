import {
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  createChart,
} from 'lightweight-charts'
import { type RefObject, useEffect, useRef } from 'react'
import { CHART_COLORS } from '@/config/constants'
import { formatCandleTimeJST, formatTimeOnlyJST } from '@/lib/date-utils'
import { bollingerBands, ema, type LinePoint, macd, rsi, sma } from '@/lib/indicators'
import type { Candle } from '@/types/candle'
import type { IndicatorEntry } from '@/types/indicators'

type UTCTimestamp = import('lightweight-charts').UTCTimestamp

interface SubplotOptions {
  blindMode?: boolean
  rsiHeight?: number
  macdHeight?: number
}

interface Options {
  chartRef: RefObject<IChartApi | null>
  candleSeriesRef: RefObject<ISeriesApi<'Candlestick'> | null>
  data: Candle[]
  indicators: IndicatorEntry[]
  rsiContainerRef: RefObject<HTMLDivElement | null>
  macdContainerRef: RefObject<HTMLDivElement | null>
  subplotOptions?: SubplotOptions
}

export interface UseChartIndicatorsResult {
  hasRsi: boolean
  hasMacd: boolean
  rsiChartRef: RefObject<IChartApi | null>
  macdChartRef: RefObject<IChartApi | null>
}

function toTimeSeries(points: LinePoint[]) {
  return points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
}

export function useChartIndicators({
  chartRef,
  candleSeriesRef,
  data,
  indicators,
  rsiContainerRef,
  macdContainerRef,
  subplotOptions,
}: Options): UseChartIndicatorsResult {
  const enabled = indicators.filter((i) => i.enabled)
  const hasRsi = enabled.some((i) => i.config.type === 'rsi')
  const hasMacd = enabled.some((i) => i.config.type === 'macd')

  const blindMode = subplotOptions?.blindMode ?? false
  const rsiHeight = subplotOptions?.rsiHeight ?? 120
  const macdHeight = subplotOptions?.macdHeight ?? 140

  const overlaySeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  // Track which chart owns the overlay refs. If the parent recreates its
  // chart (e.g. React StrictMode double-invocation, or PracticeChart's
  // blindMode/decimals change), the old series are already disposed — calling
  // `removeSeries` on them throws "Value is undefined" inside lightweight-charts.
  const overlayChartRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  // ─── RSI sub-chart lifecycle ───
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
      localization: {
        timeFormatter: (t: number) => (blindMode ? '' : formatCandleTimeJST(t)),
      },
      timeScale: {
        timeVisible: !blindMode,
        secondsVisible: false,
        borderColor: CHART_COLORS.grid,
        tickMarkFormatter: (t: number) => (blindMode ? '' : formatTimeOnlyJST(t)),
      },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      height: rsiHeight,
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
  }, [hasRsi, blindMode, rsiHeight, rsiContainerRef])

  // ─── MACD sub-chart lifecycle ───
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
      localization: {
        timeFormatter: (t: number) => (blindMode ? '' : formatCandleTimeJST(t)),
      },
      timeScale: {
        timeVisible: !blindMode,
        secondsVisible: false,
        borderColor: CHART_COLORS.grid,
        tickMarkFormatter: (t: number) => (blindMode ? '' : formatTimeOnlyJST(t)),
      },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      height: macdHeight,
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
  }, [hasMacd, blindMode, macdHeight, macdContainerRef])

  // ─── Data update: overlays + subplot data ───
  useEffect(() => {
    const chart = chartRef.current
    const candleSeries = candleSeriesRef.current
    if (!chart || !candleSeries) return

    // If the chart was recreated, the old overlay series are already disposed.
    // Drop the stale refs instead of calling removeSeries on dead handles.
    if (overlayChartRef.current !== chart) {
      overlaySeriesRef.current.clear()
      overlayChartRef.current = chart
    } else {
      // Same chart: tear down old overlays cleanly before re-adding.
      for (const [, series] of overlaySeriesRef.current) {
        chart.removeSeries(series)
      }
      overlaySeriesRef.current.clear()
    }

    if (data.length === 0) return

    for (const ind of enabled) {
      const cfg = ind.config
      if (cfg.type === 'sma') {
        const series = chart.addSeries(LineSeries, {
          color: cfg.color,
          lineWidth: 1,
          priceScaleId: 'right',
        })
        series.setData(toTimeSeries(sma(data, cfg.period)))
        overlaySeriesRef.current.set(ind.id, series)
      } else if (cfg.type === 'ema') {
        const series = chart.addSeries(LineSeries, {
          color: cfg.color,
          lineWidth: 1,
          priceScaleId: 'right',
        })
        series.setData(toTimeSeries(ema(data, cfg.period)))
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

    if (hasRsi && rsiSeriesRef.current) {
      const entry = enabled.find((i) => i.config.type === 'rsi')
      if (entry?.config.type === 'rsi') {
        rsiSeriesRef.current.setData(toTimeSeries(rsi(data, entry.config.period)))
      }
    }

    if (hasMacd && macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
      const entry = enabled.find((i) => i.config.type === 'macd')
      if (entry?.config.type === 'macd') {
        const m = macd(
          data,
          entry.config.fastPeriod,
          entry.config.slowPeriod,
          entry.config.signalPeriod,
        )
        macdLineRef.current.setData(toTimeSeries(m.macd))
        macdSignalRef.current.setData(toTimeSeries(m.signal))
        macdHistRef.current.setData(
          m.histogram.map((p) => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? '#22c55e80' : '#ef444480',
          })),
        )
      }
    }
  }, [data, indicators, hasRsi, hasMacd, chartRef, candleSeriesRef])

  return { hasRsi, hasMacd, rsiChartRef, macdChartRef }
}
