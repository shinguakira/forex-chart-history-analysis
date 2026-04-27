import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PAIR } from '@/config/pairs'
import type { TimeFrame } from '@/types/candle'
import type { PracticeMode, ReplayDirection } from '@/types/practice'

interface PendingPosition {
  direction: ReplayDirection
  entryPrice: number
  stopLoss: number
  takeProfit: number
  entryCursorIndex: number
  entryTime: number
}

interface PracticeState {
  mode: PracticeMode
  pairId: string
  timeframe: TimeFrame
  cursorIndex: number | null
  blindMode: boolean
  position: PendingPosition | null
}

interface PracticeActions {
  setMode: (mode: PracticeMode) => void
  setPairId: (id: string) => void
  setTimeframe: (tf: TimeFrame) => void
  setCursorIndex: (idx: number | null) => void
  advanceCursor: (delta: number, max: number) => void
  setBlindMode: (b: boolean) => void
  openPosition: (p: PendingPosition) => void
  clearPosition: () => void
}

export const usePracticeStore = create<PracticeState & PracticeActions>()(
  persist(
    (set) => ({
      mode: 'replay',
      pairId: DEFAULT_PAIR.id,
      timeframe: '60',
      cursorIndex: null,
      blindMode: false,
      position: null,

      setMode: (mode) => set({ mode }),
      setPairId: (pairId) => set({ pairId, cursorIndex: null, position: null }),
      setTimeframe: (timeframe) => set({ timeframe, cursorIndex: null, position: null }),
      setCursorIndex: (cursorIndex) => set({ cursorIndex }),
      advanceCursor: (delta, max) =>
        set((s) => {
          if (s.cursorIndex == null) return s
          const next = Math.max(0, Math.min(max, s.cursorIndex + delta))
          return { cursorIndex: next }
        }),
      setBlindMode: (blindMode) => set({ blindMode }),
      openPosition: (position) => set({ position }),
      clearPosition: () => set({ position: null }),
    }),
    {
      name: 'practice-store',
      partialize: (s) => ({
        mode: s.mode,
        pairId: s.pairId,
        timeframe: s.timeframe,
        blindMode: s.blindMode,
      }),
    },
  ),
)
