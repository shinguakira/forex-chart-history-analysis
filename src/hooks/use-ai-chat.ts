import { useCallback, useRef, useState } from 'react'
import { buildChatSystemMessage } from '@/lib/ai/prompts'
import { createProvider } from '@/lib/ai/provider'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage, TradeContext } from '@/types/ai'

export function useAIChat() {
  const [streaming, setStreaming] = useState(false)
  const [currentToken, setCurrentToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (userText: string, context: 'portfolio' | TradeContext, summaryText?: string) => {
      const store = useAIStore.getState()
      const provider = createProvider({
        type: store.provider,
        apiKey: store.apiKey,
        ollamaUrl: store.ollamaUrl,
        ollamaModel: store.ollamaModel,
      })

      if (!provider.isConfigured()) {
        setError('API key not configured')
        return
      }

      store.addChatMessage({ role: 'user', content: userText })

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setStreaming(true)
      setCurrentToken('')
      setError(null)

      const systemContent = buildChatSystemMessage(context, summaryText)
      const messages: AIMessage[] = [
        { role: 'system', content: systemContent },
        ...store.chatMessages,
        { role: 'user', content: userText },
      ]

      let fullText = ''

      await provider.stream(
        messages,
        {
          onToken: (token) => {
            fullText += token
            setCurrentToken(fullText)
          },
          onComplete: (text) => {
            setStreaming(false)
            setCurrentToken('')
            store.addChatMessage({ role: 'assistant', content: text })
          },
          onError: (err) => {
            setStreaming(false)
            setError(err.message)
          },
        },
        controller.signal,
      )
    },
    [],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { streaming, currentToken, error, sendMessage, cancel }
}
