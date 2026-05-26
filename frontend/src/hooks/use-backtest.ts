import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildBacktestContext } from '@/lib/ai/backtest-context'
import { parseAIResponse } from '@/lib/ai/parse'
import { buildPredictionMessages } from '@/lib/ai/prediction-prompts'
import { createProvider } from '@/lib/ai/provider'
import { validateBacktestPrediction } from '@/lib/backtest/validate'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage } from '@/types/ai'
import type {
  BacktestConfig,
  BacktestPrediction,
  BacktestRun,
  BacktestRunStats,
} from '@/types/backtest'

type RunStatus =
  | 'idle'
  | 'fetching-data'
  | 'streaming'
  | 'parsing'
  | 'validating'
  | 'complete'
  | 'error'

import { rspc } from '@/lib/rspc'

async function loadRuns(): Promise<BacktestRun[]> {
  return (await rspc.query(['backtests.list'])) as BacktestRun[]
}

async function upsertRun(run: BacktestRun): Promise<void> {
  await rspc.mutation(['backtests.upsert', run])
}

async function deleteRunApi(id: string): Promise<void> {
  await rspc.mutation(['backtests.delete', { id }])
}

function getModelString(provider: 'claude' | 'ollama', ollamaModel: string): string {
  if (provider === 'claude') return 'claude-sonnet-4-20250514'
  return `ollama:${ollamaModel}`
}

function computeStats(predictions: BacktestPrediction[]): BacktestRunStats {
  const wins = predictions.filter((p) => p.status === 'win').length
  const losses = predictions.filter((p) => p.status === 'loss').length
  const expired = predictions.filter((p) => p.status === 'expired').length
  const decided = wins + losses
  const totalPips = predictions.reduce((sum, p) => sum + (p.validationResult?.pipsGained ?? 0), 0)
  return {
    total: predictions.length,
    wins,
    losses,
    expired,
    winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
    totalPips: Math.round(totalPips * 10) / 10,
  }
}

function generateCutoffs(start: number, end: number, intervalDays: number): number[] {
  const step = intervalDays * 86_400_000
  const cutoffs: number[] = []
  for (let t = start; t <= end; t += step) {
    cutoffs.push(t)
  }
  return cutoffs
}

function streamAI(
  provider: ReturnType<typeof createProvider>,
  messages: AIMessage[],
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    provider.stream(
      messages,
      {
        onToken: () => {},
        onComplete: (text) => resolve(text),
        onError: (err) => reject(err),
      },
      signal,
    )
  })
}

export interface BacktestProgress {
  cutoffIndex: number
  cutoffTotal: number
  phase: RunStatus
  detail: string
  validationCurrent?: number
  validationTotal?: number
}

export function useBacktest() {
  const [runs, setRuns] = useState<BacktestRun[]>([])
  const [loaded, setLoaded] = useState(false)
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [progress, setProgress] = useState<BacktestProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadRuns().then((data) => {
      setRuns(data)
      setLoaded(true)
    })
  }, [])

  const setLocal = useCallback((updated: BacktestRun[]) => {
    setRuns(updated)
  }, [])

  const runBacktest = useCallback(async (config: BacktestConfig) => {
    const store = useAIStore.getState()
    const provider = createProvider({
      type: store.provider,
      apiKey: store.apiKey,
      ollamaUrl: store.ollamaUrl,
      ollamaModel: store.ollamaModel,
    })

    if (!provider.isConfigured()) {
      setError('API key not configured')
      setRunStatus('error')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setRunStatus('fetching-data')
    setError(null)
    setProgress(null)

    const cutoffs = generateCutoffs(config.startTimestamp, config.endTimestamp, config.intervalDays)
    const modelStr = getModelString(store.provider, store.ollamaModel)
    const allPredictions: BacktestPrediction[] = []

    try {
      for (let ci = 0; ci < cutoffs.length; ci++) {
        const cutoffMs = cutoffs[ci]
        if (controller.signal.aborted) return

        // Phase: fetching data
        setRunStatus('fetching-data')
        setProgress({
          cutoffIndex: ci + 1,
          cutoffTotal: cutoffs.length,
          phase: 'fetching-data',
          detail: '',
        })

        const ctx = await buildBacktestContext(cutoffMs, config.pairIds, (msg) => {
          setProgress({
            cutoffIndex: ci + 1,
            cutoffTotal: cutoffs.length,
            phase: 'fetching-data',
            detail: msg,
          })
        })

        if (controller.signal.aborted) return

        // Phase: streaming
        setRunStatus('streaming')
        setProgress({
          cutoffIndex: ci + 1,
          cutoffTotal: cutoffs.length,
          phase: 'streaming',
          detail: '',
        })

        const { system, user } = buildPredictionMessages(ctx, {
          pairIds: config.pairIds,
          count: config.count,
          maxHoldingPeriod: '1 day (24 hours)',
        })
        const messages: AIMessage[] = [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]

        const finalText = await streamAI(provider, messages, controller.signal)
        if (controller.signal.aborted) return

        // Phase: parsing
        setRunStatus('parsing')
        setProgress({
          cutoffIndex: ci + 1,
          cutoffTotal: cutoffs.length,
          phase: 'parsing',
          detail: '',
        })

        const items = parseAIResponse(finalText)
        const rawPredictions = items.map((item: unknown) => {
          const raw = item as Record<string, unknown>
          return {
            id: crypto.randomUUID(),
            pairId: String(raw.pairId ?? ''),
            direction: (raw.direction === 'short' ? 'short' : 'long') as 'long' | 'short',
            entryPrice: Number(raw.entryPrice) || 0,
            stopLoss: Number(raw.stopLoss) || 0,
            takeProfit: Number(raw.takeProfit) || 0,
            timeframe: String(raw.timeframe ?? ''),
            cutoffTimestamp: cutoffMs,
          }
        })

        // Phase: validating
        setRunStatus('validating')

        for (let vi = 0; vi < rawPredictions.length; vi++) {
          const pred = rawPredictions[vi]
          if (controller.signal.aborted) return

          setProgress({
            cutoffIndex: ci + 1,
            cutoffTotal: cutoffs.length,
            phase: 'validating',
            detail: '',
            validationCurrent: vi + 1,
            validationTotal: rawPredictions.length,
          })

          try {
            const result = await validateBacktestPrediction(pred, cutoffMs, pred.pairId)
            allPredictions.push({
              ...pred,
              status: result.status,
              validationResult: result.validationResult,
            })
          } catch {
            allPredictions.push({
              ...pred,
              status: 'expired',
              validationResult: null,
            })
          }

          if (vi < rawPredictions.length - 1) {
            await new Promise((r) => setTimeout(r, 500))
          }
        }
      }

      const run: BacktestRun = {
        id: crypto.randomUUID(),
        config,
        predictions: allPredictions,
        model: modelStr,
        provider: store.provider,
        createdAt: Date.now(),
        stats: computeStats(allPredictions),
      }

      setRuns((prev) => [run, ...prev])
      upsertRun(run).catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      setRunStatus('complete')
      setProgress(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : String(err))
      setRunStatus('error')
    }
  }, [])

  const deleteRun = useCallback(
    (id: string) => {
      const updated = runs.filter((r) => r.id !== id)
      setLocal(updated)
      deleteRunApi(id).catch((err) => setError(err instanceof Error ? err.message : String(err)))
    },
    [runs, setLocal],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setRunStatus('idle')
    setProgress(null)
  }, [])

  const aggregateStats = useMemo(() => {
    if (runs.length === 0) return null
    const allPredictions = runs.flatMap((r) => r.predictions)
    return {
      totalRuns: runs.length,
      ...computeStats(allPredictions),
    }
  }, [runs])

  const modelStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; expired: number }>()
    for (const run of runs) {
      const entry = map.get(run.model) ?? { wins: 0, losses: 0, expired: 0 }
      entry.wins += run.stats.wins
      entry.losses += run.stats.losses
      entry.expired += run.stats.expired
      map.set(run.model, entry)
    }
    return Array.from(map.entries()).map(([model, s]) => {
      const decided = s.wins + s.losses
      return {
        model,
        ...s,
        total: s.wins + s.losses + s.expired,
        winRate: decided > 0 ? Math.round((s.wins / decided) * 100) : 0,
      }
    })
  }, [runs])

  return {
    runs,
    loaded,
    runStatus,
    progress,
    error,
    aggregateStats,
    modelStats,
    runBacktest,
    deleteRun,
    cancel,
  }
}
