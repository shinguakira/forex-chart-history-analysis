import { useCallback, useRef, useState } from 'react'
import { createProvider } from '@/lib/ai/provider'
import { useAIStore } from '@/store/ai-store'
import type { AIMessage } from '@/types/ai'
import type { PracticeTrade } from '@/types/practice'

type Status = 'idle' | 'streaming' | 'complete' | 'error'

interface State {
  status: Status
  text: string
  error: string | null
  tradeId: string | null
}

function buildPrompt(trade: PracticeTrade): { system: string; user: string } {
  const system = `You are a trading coach reviewing a single practice trade taken on a historical forex chart. The trader is building intuition. Give a concise, focused review:
1. Plan quality (entry timing, SL/TP placement)
2. Risk-reward assessment
3. One specific thing to do better next time
Keep it under 200 words. Use plain text, no headers.`

  if (trade.mode === 'replay' && trade.replay) {
    const r = trade.replay
    const rr = Math.abs((r.takeProfit - r.entryPrice) / (r.entryPrice - r.stopLoss)).toFixed(2)
    const user = `Pair: ${trade.pairId} | Timeframe: ${trade.timeframe}
Direction: ${r.direction.toUpperCase()}
Entry: ${r.entryPrice} | SL: ${r.stopLoss} | TP: ${r.takeProfit} (R:R = 1:${rr})
Exit: ${r.exitPrice} (${r.exitReason}) after ${r.holdBars} bars
Result: ${r.pips > 0 ? '+' : ''}${r.pips} pips${r.note ? `\nMy reasoning: ${r.note}` : ''}`
    return { system, user }
  }

  if (trade.mode === 'quiz' && trade.quiz) {
    const q = trade.quiz
    const user = `Quiz mode (directional prediction).
Pair: ${trade.pairId} | Timeframe: ${trade.timeframe}
Predicted: ${q.prediction.toUpperCase()} over ${q.barsAhead} bars
Actual move: ${q.actualMove > 0 ? '+' : ''}${q.actualMove} pips
Result: ${q.correct ? 'Correct' : 'Wrong'}

Briefly comment on what kinds of patterns might lead to better directional reads at this timeframe.`
    return { system, user }
  }

  if (trade.mode === 'setup' && trade.setup) {
    const s = trade.setup
    const user = `Setup mode (judgement with reasoning).
Pair: ${trade.pairId} | Timeframe: ${trade.timeframe}
Judgement: ${s.judgement.toUpperCase()} (confidence ${s.confidence}/5)
My reasoning: ${s.reason || '(no reasoning given)'}
Outcome over ${s.outcomeBars} bars: ${s.outcomePips > 0 ? '+' : ''}${s.outcomePips} pips

Comment on whether the reasoning was sound and what to refine.`
    return { system, user }
  }

  return { system, user: 'Review this trade.' }
}

export function usePracticeAIReview() {
  const [state, setState] = useState<State>({
    status: 'idle',
    text: '',
    error: null,
    tradeId: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const review = useCallback(async (trade: PracticeTrade) => {
    const store = useAIStore.getState()
    const provider = createProvider({
      type: store.provider,
      apiKey: store.apiKey,
      ollamaUrl: store.ollamaUrl,
      ollamaModel: store.ollamaModel,
    })
    if (!provider.isConfigured()) {
      setState({ status: 'error', text: '', error: 'API key not configured', tradeId: trade.id })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ status: 'streaming', text: '', error: null, tradeId: trade.id })

    const { system, user } = buildPrompt(trade)
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
        onComplete: (full) => {
          setState((s) => ({ ...s, status: 'complete', text: full }))
        },
        onError: (err) => {
          setState((s) => ({ ...s, status: 'error', error: err.message }))
        },
      },
      controller.signal,
    )
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle', text: '', error: null, tradeId: null })
  }, [])

  return { ...state, review, reset }
}
