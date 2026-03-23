import { useCallback, useRef, useState } from 'react'
import { buildPortfolioReviewMessages, buildTradeReviewMessages } from '@/lib/ai/prompts'
import { createProvider } from '@/lib/ai/provider'
import { buildPortfolioContext, buildTradeContext } from '@/lib/ai/trade-context'
import { computePairPerformance, computeSummary } from '@/lib/trade-analysis'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage } from '@/types/ai'
import type { Trade } from '@/types/trade'

type ReviewStatus = 'idle' | 'loading-context' | 'streaming' | 'complete' | 'error'

interface ReviewState {
  status: ReviewStatus
  text: string
  error: string | null
}

export function useAIReview() {
  const [state, setState] = useState<ReviewState>({
    status: 'idle',
    text: '',
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const reviewTrade = useCallback(
    async ({ trade, allTrades }: { trade: Trade; allTrades: Trade[] }) => {
      const store = useAIStore.getState()
      const { cacheReview, getCachedReview } = store

      const cacheKey = trade.ref
      const cached = getCachedReview(cacheKey)
      if (cached) {
        setState({ status: 'complete', text: cached.content, error: null })
        return
      }

      const provider = createProvider({
        type: store.provider,
        apiKey: store.apiKey,
        ollamaUrl: store.ollamaUrl,
        ollamaModel: store.ollamaModel,
      })
      if (!provider.isConfigured()) {
        setState({ status: 'error', text: '', error: 'API key not configured' })
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ status: 'loading-context', text: '', error: null })

      let ctx: Awaited<ReturnType<typeof buildTradeContext>>
      try {
        ctx = await buildTradeContext(trade)
      } catch (err) {
        setState({
          status: 'error',
          text: '',
          error: `Failed to fetch chart data: ${err instanceof Error ? err.message : String(err)}`,
        })
        return
      }

      setState({ status: 'streaming', text: '', error: null })

      const summary = computeSummary(allTrades)
      const pairStats = computePairPerformance(allTrades)
      const pairStat = pairStats.find((p) => p.pairId === trade.pairId)

      const { system, user } = buildTradeReviewMessages(
        ctx,
        summary.winRate,
        pairStat?.winRate ?? summary.winRate,
      )

      const messages: AIMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]

      await provider.stream(
        messages,
        {
          onToken: (token) => {
            setState((s) => ({ ...s, text: s.text + token }))
          },
          onComplete: (fullText) => {
            setState({ status: 'complete', text: fullText, error: null })
            cacheReview({
              id: crypto.randomUUID(),
              key: cacheKey,
              content: fullText,
              createdAt: Date.now(),
            })
          },
          onError: (err) => {
            setState({ status: 'error', text: '', error: err.message })
          },
        },
        controller.signal,
      )
    },
    [],
  )

  const reviewPortfolio = useCallback(async (trades: Trade[]) => {
    const store = useAIStore.getState()
    const { cacheReview, getCachedReview } = store

    const cacheKey = 'portfolio'
    const cached = getCachedReview(cacheKey)
    if (cached) {
      setState({ status: 'complete', text: cached.content, error: null })
      return
    }

    const provider = createProvider({
      type: store.provider,
      apiKey: store.apiKey,
      ollamaUrl: store.ollamaUrl,
      ollamaModel: store.ollamaModel,
    })
    if (!provider.isConfigured()) {
      setState({ status: 'error', text: '', error: 'API key not configured' })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ status: 'loading-context', text: '', error: null })

    const portfolioCtx = await buildPortfolioContext(trades)

    setState({ status: 'streaming', text: '', error: null })

    const { system, user } = buildPortfolioReviewMessages(
      portfolioCtx.summaryText,
      portfolioCtx.topTradeContexts,
    )

    const messages: AIMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    await provider.stream(
      messages,
      {
        onToken: (token) => {
          setState((s) => ({ ...s, text: s.text + token }))
        },
        onComplete: (fullText) => {
          setState({ status: 'complete', text: fullText, error: null })
          cacheReview({
            id: crypto.randomUUID(),
            key: cacheKey,
            content: fullText,
            createdAt: Date.now(),
          })
        },
        onError: (err) => {
          setState({ status: 'error', text: '', error: err.message })
        },
      },
      controller.signal,
    )
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle', text: '', error: null })
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState((s) => ({ ...s, status: s.text ? 'complete' : 'idle' }))
  }, [])

  return { ...state, reviewTrade, reviewPortfolio, reset, cancel }
}
