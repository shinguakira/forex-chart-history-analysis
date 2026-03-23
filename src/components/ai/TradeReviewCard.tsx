import { getPairById } from '@/config/pairs'
import { useAIReview } from '@/hooks/use-ai-review'
import { useAIStore } from '@/store/ai-store'
import type { Trade } from '@/types/trade'
import { ReviewSkeleton } from './ReviewSkeleton'
import { StructuredResponse } from './StructuredResponse'

interface Props {
  trade: Trade
  allTrades: Trade[]
}

export function TradeReviewCard({ trade, allTrades }: Props) {
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
    await reviewTrade({ trade, allTrades })
  }

  const handleRegenerate = () => {
    const store = useAIStore.getState()
    const newCache = { ...store.reviewCache }
    delete newCache[trade.ref]
    useAIStore.setState({ reviewCache: newCache })
    reset()
    reviewTrade({ trade, allTrades })
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
          className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
          onClick={handleReview}
        >
          Review with AI
        </button>
      )}

      {(status === 'loading-context' || status === 'streaming') && !displayText && (
        <ReviewSkeleton
          label={status === 'loading-context' ? 'Fetching chart data...' : undefined}
        />
      )}
      {status === 'streaming' && text && <StructuredResponse text={text} isStreaming />}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mt-2">
          {error}
        </div>
      )}

      {displayText && status !== 'streaming' && (
        <div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              onClick={handleRegenerate}
            >
              Regenerate
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
              onClick={() => {
                const store = useAIStore.getState()
                store.setChatContext(trade.ref)
                store.setChatOpen(true)
              }}
            >
              Chat about this trade
            </button>
          </div>
          <StructuredResponse text={displayText} />
        </div>
      )}

      {status === 'streaming' && (
        <button
          type="button"
          className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          onClick={cancel}
        >
          Stop
        </button>
      )}
    </div>
  )
}
