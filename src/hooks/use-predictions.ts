import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildForecastContext } from '@/lib/ai/forecast-context'
import { parseAIResponse } from '@/lib/ai/parse'
import { buildPredictionMessages } from '@/lib/ai/prediction-prompts'
import { createProvider } from '@/lib/ai/provider'
import { validatePrediction } from '@/lib/predictions/validate'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage } from '@/types/ai'
import type { Prediction } from '@/types/prediction'

type GenerateStatus = 'idle' | 'fetching-data' | 'streaming' | 'parsing' | 'complete' | 'error'

export interface GenerateOptions {
  pairIds: string[]
  count?: number
}

async function loadPredictions(): Promise<Prediction[]> {
  const res = await fetch('/api/predictions')
  if (!res.ok) return []
  return res.json()
}

async function savePredictions(predictions: Prediction[]): Promise<void> {
  await fetch('/api/predictions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(predictions),
  })
}

function getModelString(provider: 'claude' | 'ollama', ollamaModel: string): string {
  if (provider === 'claude') return 'claude-sonnet-4-20250514'
  return `ollama:${ollamaModel}`
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadPredictions().then((data) => {
      setPredictions(data)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback((updated: Prediction[]) => {
    setPredictions(updated)
    savePredictions(updated)
  }, [])

  const generate = useCallback(async (opts: GenerateOptions) => {
    const store = useAIStore.getState()
    const provider = createProvider({
      type: store.provider,
      apiKey: store.apiKey,
      ollamaUrl: store.ollamaUrl,
      ollamaModel: store.ollamaModel,
    })

    if (!provider.isConfigured()) {
      setError('API key not configured')
      setGenerateStatus('error')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setGenerateStatus('fetching-data')
    setError(null)
    setProgress('')

    try {
      const ctx = await buildForecastContext((msg) => setProgress(msg), opts.pairIds)

      setGenerateStatus('streaming')
      setProgress('')

      const { system, user } = buildPredictionMessages(ctx, {
        pairIds: opts.pairIds,
        count: opts.count,
      })
      const messages: AIMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]

      await provider.stream(
        messages,
        {
          onToken: () => {},
          onComplete: (finalText) => {
            try {
              setGenerateStatus('parsing')
              const items = parseAIResponse(finalText)
              const modelStr = getModelString(store.provider, store.ollamaModel)
              const now = Date.now()

              const newPredictions: Prediction[] = items.map((item: unknown) => {
                const raw = item as Record<string, unknown>
                return {
                  id: crypto.randomUUID(),
                  pairId: String(raw.pairId ?? ''),
                  direction: raw.direction === 'short' ? 'short' : 'long',
                  entryPrice: Number(raw.entryPrice) || 0,
                  stopLoss: Number(raw.stopLoss) || 0,
                  takeProfit: Number(raw.takeProfit) || 0,
                  timeframe: String(raw.timeframe ?? ''),
                  model: modelStr,
                  provider: store.provider,
                  createdAt: now,
                  status: 'pending' as const,
                  validatedAt: null,
                  validationResult: null,
                }
              })

              setPredictions((prev) => {
                const merged = [...newPredictions, ...prev]
                savePredictions(merged)
                return merged
              })
              setGenerateStatus('complete')
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
              setGenerateStatus('error')
            }
          },
          onError: (err) => {
            setError(err.message)
            setGenerateStatus('error')
          },
        },
        controller.signal,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setGenerateStatus('error')
    }
  }, [])

  const validate = useCallback(
    async (id: string) => {
      const prediction = predictions.find((p) => p.id === id)
      if (!prediction || prediction.status !== 'pending') return

      setValidatingId(id)
      try {
        const result = await validatePrediction(prediction)
        const updated = predictions.map((p) =>
          p.id === id
            ? {
                ...p,
                status: result.status,
                validatedAt: Date.now(),
                validationResult: result.validationResult,
              }
            : p,
        )
        persist(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setValidatingId(null)
      }
    },
    [predictions, persist],
  )

  const validateAll = useCallback(async () => {
    const pending = predictions.filter((p) => p.status === 'pending')
    let current = [...predictions]

    for (const prediction of pending) {
      setValidatingId(prediction.id)
      try {
        const result = await validatePrediction(prediction)
        current = current.map((p) =>
          p.id === prediction.id
            ? {
                ...p,
                status: result.status,
                validatedAt: Date.now(),
                validationResult: result.validationResult,
              }
            : p,
        )
        await new Promise((r) => setTimeout(r, 500))
      } catch {
        // Skip failed validations
      }
    }

    setValidatingId(null)
    persist(current)
  }, [predictions, persist])

  const deletePrediction = useCallback(
    (id: string) => {
      const updated = predictions.filter((p) => p.id !== id)
      persist(updated)
    },
    [predictions, persist],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerateStatus('idle')
    setProgress('')
  }, [])

  const stats = useMemo(() => {
    const total = predictions.length
    const wins = predictions.filter((p) => p.status === 'win').length
    const losses = predictions.filter((p) => p.status === 'loss').length
    const pending = predictions.filter((p) => p.status === 'pending').length
    const decided = wins + losses
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0
    return { total, wins, losses, pending, winRate }
  }, [predictions])

  const modelStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; pending: number }>()
    for (const p of predictions) {
      const entry = map.get(p.model) ?? { wins: 0, losses: 0, pending: 0 }
      if (p.status === 'win') entry.wins++
      else if (p.status === 'loss') entry.losses++
      else if (p.status === 'pending') entry.pending++
      map.set(p.model, entry)
    }
    return Array.from(map.entries()).map(([model, s]) => {
      const decided = s.wins + s.losses
      return {
        model,
        ...s,
        total: s.wins + s.losses + s.pending,
        winRate: decided > 0 ? Math.round((s.wins / decided) * 100) : 0,
      }
    })
  }, [predictions])

  return {
    predictions,
    loaded,
    generateStatus,
    progress,
    error,
    validatingId,
    stats,
    modelStats,
    generate,
    validate,
    validateAll,
    deletePrediction,
    cancel,
  }
}
