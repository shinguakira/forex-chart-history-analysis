import { create } from 'zustand'
import { DEFAULT_PAIR } from '@/config/pairs'
import type { TimeFrame } from '@/types/candle'

interface UiStore {
  selectedPairId: string
  selectedTimeframe: TimeFrame

  setSelectedPairId: (id: string) => void
  setSelectedTimeframe: (tf: TimeFrame) => void
}

export const useUiStore = create<UiStore>((set) => ({
  selectedPairId: DEFAULT_PAIR.id,
  selectedTimeframe: '1',

  setSelectedPairId: (id) => set({ selectedPairId: id }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
}))
