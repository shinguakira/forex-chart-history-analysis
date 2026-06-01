import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cloneIndicators } from '@/config/indicators'
import { DEFAULT_PAIR } from '@/config/pairs'
import type { TimeFrame } from '@/types/candle'
import type { IndicatorEntry } from '@/types/indicators'
import type { PracticeView, ReplayDirection } from '@/types/practice'

interface PendingPosition {
  direction: ReplayDirection
  entryPrice: number
  stopLoss: number
  takeProfit: number
  entryCursorIndex: number
  entryTime: number
}

export type VerdictKind = 'correct' | 'wrong'

interface ResultPulse {
  kind: VerdictKind
  /** Monotonic id so the overlay re-fires even when verdict matches the previous one. */
  id: number
}

interface PracticeState {
  view: PracticeView
  pairId: string
  timeframe: TimeFrame
  cursorIndex: number | null
  blindMode: boolean
  position: PendingPosition | null
  indicators: IndicatorEntry[]
  soundMuted: boolean
  /** Quiz mode auto-advances to the next question after each reveal. */
  quizAutoContinue: boolean
  pulse: ResultPulse | null
}

interface PracticeActions {
  setView: (view: PracticeView) => void
  setPairId: (id: string) => void
  setTimeframe: (tf: TimeFrame) => void
  setCursorIndex: (idx: number | null) => void
  advanceCursor: (delta: number, max: number) => void
  setBlindMode: (b: boolean) => void
  openPosition: (p: PendingPosition) => void
  clearPosition: () => void
  toggleIndicator: (indicatorId: string) => void
  setSoundMuted: (m: boolean) => void
  setQuizAutoContinue: (b: boolean) => void
  flashResult: (kind: VerdictKind) => void
  clearPulse: () => void
}

export const usePracticeStore = create<PracticeState & PracticeActions>()(
  persist(
    (set) => ({
      view: 'replay',
      pairId: DEFAULT_PAIR.id,
      timeframe: '60',
      cursorIndex: null,
      blindMode: false,
      position: null,
      indicators: cloneIndicators(),
      soundMuted: false,
      quizAutoContinue: false,
      pulse: null,

      setView: (view) => set({ view }),
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
      toggleIndicator: (indicatorId) =>
        set((s) => ({
          indicators: s.indicators.map((ind) =>
            ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind,
          ),
        })),
      setSoundMuted: (soundMuted) => set({ soundMuted }),
      setQuizAutoContinue: (quizAutoContinue) => set({ quizAutoContinue }),
      flashResult: (kind) =>
        set((s) => ({ pulse: { kind, id: (s.pulse?.id ?? 0) + 1 } })),
      clearPulse: () => set({ pulse: null }),
    }),
    {
      name: 'practice-store',
      partialize: (s) => ({
        view: s.view,
        pairId: s.pairId,
        timeframe: s.timeframe,
        blindMode: s.blindMode,
        indicators: s.indicators,
        soundMuted: s.soundMuted,
        quizAutoContinue: s.quizAutoContinue,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PracticeState>
        const merged = { ...current, ...p }
        // Heal indicator list against latest defaults (preserves user toggles for known ids)
        const defaults = cloneIndicators()
        const enabledIds = new Set((p.indicators ?? []).filter((i) => i.enabled).map((i) => i.id))
        merged.indicators = defaults.map((d) => ({ ...d, enabled: enabledIds.has(d.id) }))
        return merged
      },
    },
  ),
)
