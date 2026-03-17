import { create } from 'zustand'
import { DEFAULT_PERIOD_BY_TIMEFRAME, MAX_PERIODS_BY_TIMEFRAME } from '@/config/constants'
import { cloneIndicators } from '@/config/indicators'
import type { Period, TimeFrame } from '@/types/candle'
import type { IndicatorEntry } from '@/types/indicators'

export interface ChartWindow {
  id: string
  pairId: string
  timeframe: TimeFrame
  period: Period
  goToTimestamp: number | null
  indicators: IndicatorEntry[]
  showTrades: boolean
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

const MAX_WINDOWS = 6
const DEFAULT_WIDTH = 700
const DEFAULT_HEIGHT = 500

interface WindowStore {
  windows: ChartWindow[]
  nextZIndex: number

  addWindow: (pairId: string, canvasSize?: { width: number; height: number }) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateSize: (id: string, width: number, height: number) => void
  setWindowPair: (id: string, pairId: string) => void
  setWindowTimeframe: (id: string, tf: TimeFrame) => void
  setWindowPeriod: (id: string, period: Period) => void
  setWindowGoTo: (id: string, timestamp: number) => void
  clearWindowGoTo: (id: string) => void
  toggleWindowIndicator: (id: string, indicatorId: string) => void
  toggleShowTrades: (id: string) => void
  navigateToTrade: (
    pairId: string,
    timestamp: number,
    canvasSize?: { width: number; height: number },
  ) => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  nextZIndex: 1,

  addWindow: (pairId, canvasSize) => {
    const state = get()
    if (state.windows.length >= MAX_WINDOWS) return

    const existing = state.windows.find((w) => w.pairId === pairId)
    if (existing) {
      get().focusWindow(existing.id)
      return
    }

    const cw = canvasSize?.width ?? DEFAULT_WIDTH
    const ch = canvasSize?.height ?? DEFAULT_HEIGHT
    const width = Math.max(DEFAULT_WIDTH, cw - 40)
    const height = Math.max(DEFAULT_HEIGHT, ch - 40)
    const timeframe: TimeFrame = '1'

    const newWindow: ChartWindow = {
      id: crypto.randomUUID(),
      pairId,
      timeframe,
      period: DEFAULT_PERIOD_BY_TIMEFRAME[timeframe],
      goToTimestamp: null,
      indicators: cloneIndicators(),
      showTrades: false,
      x: 20,
      y: 20,
      width,
      height,
      zIndex: state.nextZIndex,
    }

    set({
      windows: [...state.windows, newWindow],
      nextZIndex: state.nextZIndex + 1,
    })
  },

  closeWindow: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    })),

  focusWindow: (id) => {
    const state = get()
    const win = state.windows.find((w) => w.id === id)
    if (!win) return
    const maxZ = Math.max(...state.windows.map((w) => w.zIndex))
    if (win.zIndex === maxZ) return
    set({
      windows: state.windows.map((w) => (w.id === id ? { ...w, zIndex: state.nextZIndex } : w)),
      nextZIndex: state.nextZIndex + 1,
    })
  },

  updatePosition: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  updateSize: (id, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),

  setWindowPair: (id, pairId) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, pairId } : w)),
    })),

  setWindowTimeframe: (id, tf) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, timeframe: tf, period: DEFAULT_PERIOD_BY_TIMEFRAME[tf], goToTimestamp: null }
          : w,
      ),
    })),

  setWindowPeriod: (id, period) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, period, goToTimestamp: null } : w)),
    })),

  setWindowGoTo: (id, timestamp) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, goToTimestamp: timestamp } : w)),
    })),

  clearWindowGoTo: (id) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, goToTimestamp: null } : w)),
    })),

  toggleWindowIndicator: (id, indicatorId) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id
          ? {
              ...w,
              indicators: w.indicators.map((ind) =>
                ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind,
              ),
            }
          : w,
      ),
    })),

  toggleShowTrades: (id) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, showTrades: !w.showTrades } : w)),
    })),

  navigateToTrade: (pairId, timestamp, canvasSize) => {
    const state = get()
    let win = state.windows.find((w) => w.pairId === pairId)

    if (!win) {
      get().addWindow(pairId, canvasSize)
      win = get().windows.find((w) => w.pairId === pairId)
      if (!win) return
    }

    // Pick timeframe that can cover the trade date
    // Use '60' (1H) as default for historical trades, or '15' for recent
    const nowSec = Math.floor(Date.now() / 1000)
    const age = nowSec - timestamp
    let tf: TimeFrame
    if (age < 5 * 86_400) tf = '5'
    else if (age < 30 * 86_400) tf = '15'
    else if (age < 365 * 86_400) tf = '60'
    else tf = 'D'

    // Pick smallest period that contains the trade
    const allowedPeriods = MAX_PERIODS_BY_TIMEFRAME[tf]
    const period = allowedPeriods[Math.min(1, allowedPeriods.length - 1)]

    get().focusWindow(win.id)
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === win.id
          ? { ...w, timeframe: tf, period, goToTimestamp: timestamp, showTrades: true }
          : w,
      ),
    }))
  },
}))
