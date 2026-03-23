import { getPairById } from '@/config/pairs'
import { useAIReview } from '@/hooks/use-ai-review'
import { useTradeContext } from '@/hooks/use-trade-context'
import { useAIStore } from '@/store/ai-store'
import type { Trade } from '@/types/trade'
import { ReviewSkeleton } from './ReviewSkeleton'
import { StreamingText } from './StreamingText'

interface Props {
  trade: Trade
  allTrades: Trade[]
}

export function TradeReviewCard({ trade, allTrades }: Props) {
  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useTradeContext(trade)
  const { status, text, error, reviewTrade, reset, cancel } = useAIReview()
  const cached = useAIStore((s) => s.reviewCache[trade.ref])

  const pair = getPairById(trade.pairId)
  const displayName = pair?.displayName ?? trade.pairId
  const duration = (() => {
    const diffMin = Math.round(
      (new Date(trade.closeDate).getTime() - new Date(trade.openDate).getTime()) / 60_000,
    )
    if (diffMin < 60) return `${diffMin}m`
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
  })()

  const displayText = cached && status === 'idle' ? cached.content : text

  const handleReview = async () => {
    if (!ctx) return
    await reviewTrade(ctx, allTrades)
  }

  const handleRegenerate = () => {
    const store = useAIStore.getState()
    const newCache = { ...store.reviewCache }
    delete newCache[trade.ref]
    useAIStore.setState({ reviewCache: newCache })
    reset()
    if (ctx) reviewTrade(ctx, allTrades)
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-white">{displayName}</span>
          <span
            className={`ml-2 text-xs ${trade.direction === 'bull' ? 'text-green-400' : 'text-red-400'}`}
          >
            {trade.direction === 'bull' ? 'LONG' : 'SHORT'} x{trade.size}
          </span>
          <span
            className={`ml-2 text-xs font-mono ${trade.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            ¥{Math.round(trade.pl).toLocaleString()}
          </span>
        </div>
        <span className="text-xs text-gray-500">{duration}</span>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {trade.openDate} → {trade.closeDate}
        <span className="ml-2">
          {trade.openPrice} → {trade.closePrice}
        </span>
      </div>

      {!displayText && status === 'idle' && (
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={handleReview}
          disabled={ctxLoading}
        >
          {ctxLoading ? 'Loading chart data...' : 'Review with AI'}
        </button>
      )}

      {ctxError && (
        <div className="text-xs text-red-400">Failed to load chart data: {ctxError.message}</div>
      )}

      {status === 'loading-context' && <ReviewSkeleton label="Fetching chart data..." />}
      {status === 'streaming' && <StreamingText text={text} isStreaming />}
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}

      {displayText && status !== 'streaming' && (
        <div>
          <StreamingText text={displayText} />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
              onClick={handleRegenerate}
            >
              Regenerate
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
              onClick={() => {
                useAIStore.getState().setChatContext(trade.ref)
                useAIStore.getState().setChatOpen(true)
              }}
            >
              Chat about this trade
            </button>
          </div>
        </div>
      )}

      {status === 'streaming' && (
        <button
          type="button"
          className="mt-2 px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
          onClick={cancel}
        >
          Stop
        </button>
      )}
    </div>
  )
}
