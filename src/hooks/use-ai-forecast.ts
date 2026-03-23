import { useCallback, useRef, useState } from 'react'
import { buildForecastContext } from '@/lib/ai/forecast-context'
import { buildForecastMessages } from '@/lib/ai/forecast-prompts'
import { createProvider } from '@/lib/ai/provider'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage } from '@/types/ai'

type ForecastStatus = 'idle' | 'fetching-data' | 'streaming' | 'complete' | 'error'

export function useAIForecast() {
  const [status, setStatus] = useState<ForecastStatus>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const generateForecast = useCallback(async () => {
    const store = useAIStore.getState()
    const provider = createProvider({
      type: store.provider,
      apiKey: store.apiKey,
      ollamaUrl: store.ollamaUrl,
      ollamaModel: store.ollamaModel,
    })

    if (!provider.isConfigured()) {
      setError('API key not configured')
      setStatus('error')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('fetching-data')
    setText('')
    setError(null)
    setProgress('')

    try {
      const ctx = await buildForecastContext((msg) => setProgress(msg))

      setStatus('streaming')
      setProgress('')

      const { system, user } = buildForecastMessages(ctx)
      const messages: AIMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]

      let fullText = ''

      await provider.stream(
        messages,
        {
          onToken: (token) => {
            fullText += token
            setText(fullText)
          },
          onComplete: (finalText) => {
            setStatus('complete')
            setText(finalText)
            store.cacheReview({
              id: crypto.randomUUID(),
              key: 'forecast',
              content: finalText,
              createdAt: Date.now(),
            })
          },
          onError: (err) => {
            setStatus('error')
            setError(err.message)
          },
        },
        controller.signal,
      )
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setText('')
    setError(null)
    setProgress('')
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setStatus((s) => (text ? 'complete' : s === 'fetching-data' ? 'idle' : 'idle'))
  }, [text])

  return { status, text, error, progress, generateForecast, reset, cancel }
}
