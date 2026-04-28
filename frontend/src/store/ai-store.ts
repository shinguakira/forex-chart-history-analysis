import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIMessage, ReviewResult } from '@/types/ai'

interface AIState {
  /** Kept only as a hint of the user's preferred backend provider; the actual
   *  routing is decided by the Rust backend's AI_PROVIDER env var. */
  provider: 'claude' | 'ollama'
  settingsOpen: boolean
  reviewCache: Record<string, ReviewResult>
  /** Per-context chat histories keyed by context id (e.g. 'portfolio', 'forecast', trade ref) */
  chatHistories: Record<string, AIMessage[]>
  chatContext: string | null
  chatOpen: boolean
}

interface AIActions {
  setProvider: (provider: 'claude' | 'ollama') => void
  setSettingsOpen: (open: boolean) => void
  cacheReview: (result: ReviewResult) => void
  getCachedReview: (key: string) => ReviewResult | undefined
  clearReviewCache: () => void
  addChatMessage: (msg: AIMessage) => void
  getChatMessages: () => AIMessage[]
  setChatContext: (ctx: string | null) => void
  setChatOpen: (open: boolean) => void
  clearChat: () => void
}

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      settingsOpen: false,
      reviewCache: {},
      chatHistories: {},
      chatContext: null,
      chatOpen: false,

      setProvider: (provider) => set({ provider }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      cacheReview: (result) =>
        set((s) => ({
          reviewCache: { ...s.reviewCache, [result.key]: result },
        })),
      getCachedReview: (key) => get().reviewCache[key],
      clearReviewCache: () => set({ reviewCache: {} }),

      addChatMessage: (msg) =>
        set((s) => {
          const ctx = s.chatContext ?? '_default'
          const prev = s.chatHistories[ctx] ?? []
          const messages = [...prev, msg].slice(-50)
          return { chatHistories: { ...s.chatHistories, [ctx]: messages } }
        }),
      getChatMessages: () => {
        const s = get()
        const ctx = s.chatContext ?? '_default'
        return s.chatHistories[ctx] ?? []
      },
      setChatContext: (chatContext) => set({ chatContext }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      clearChat: () =>
        set((s) => {
          const ctx = s.chatContext ?? '_default'
          const updated = { ...s.chatHistories }
          delete updated[ctx]
          return { chatHistories: updated }
        }),
    }),
    {
      name: 'ai-store',
      partialize: (s) => ({
        provider: s.provider,
        reviewCache: s.reviewCache,
      }),
    },
  ),
)
