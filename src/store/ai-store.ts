import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIMessage, ReviewResult } from '@/types/ai'

const ENV_CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY ?? ''
const ENV_OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434'
const ENV_OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'plutus'

interface AIState {
  provider: 'claude' | 'ollama'
  apiKey: string
  ollamaUrl: string
  ollamaModel: string
  settingsOpen: boolean
  reviewCache: Record<string, ReviewResult>
  chatMessages: AIMessage[]
  chatContext: string | null
  chatOpen: boolean
}

interface AIActions {
  setProvider: (provider: 'claude' | 'ollama') => void
  setApiKey: (key: string) => void
  setOllamaUrl: (url: string) => void
  setOllamaModel: (model: string) => void
  setSettingsOpen: (open: boolean) => void
  cacheReview: (result: ReviewResult) => void
  getCachedReview: (key: string) => ReviewResult | undefined
  clearReviewCache: () => void
  addChatMessage: (msg: AIMessage) => void
  setChatContext: (ctx: string | null) => void
  setChatOpen: (open: boolean) => void
  clearChat: () => void
}

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      apiKey: ENV_CLAUDE_API_KEY,
      ollamaUrl: ENV_OLLAMA_URL,
      ollamaModel: ENV_OLLAMA_MODEL,
      settingsOpen: false,
      reviewCache: {},
      chatMessages: [],
      chatContext: null,
      chatOpen: false,

      setProvider: (provider) => set({ provider }),
      setApiKey: (apiKey) => set({ apiKey }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      cacheReview: (result) =>
        set((s) => ({
          reviewCache: { ...s.reviewCache, [result.key]: result },
        })),
      getCachedReview: (key) => get().reviewCache[key],
      clearReviewCache: () => set({ reviewCache: {} }),

      addChatMessage: (msg) =>
        set((s) => {
          const messages = [...s.chatMessages, msg]
          return { chatMessages: messages.slice(-50) }
        }),
      setChatContext: (chatContext) => set({ chatContext }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      clearChat: () => set({ chatMessages: [], chatContext: null }),
    }),
    {
      name: 'ai-store',
      partialize: (s) => ({
        provider: s.provider,
        reviewCache: s.reviewCache,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AIState>),
        // Always use env vars for secrets — never restore from localStorage
        apiKey: ENV_CLAUDE_API_KEY,
        ollamaUrl: ENV_OLLAMA_URL,
        ollamaModel: ENV_OLLAMA_MODEL,
      }),
    },
  ),
)
