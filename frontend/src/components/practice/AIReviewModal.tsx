import { Bot, X } from 'lucide-react'
import { useEffect } from 'react'
import { usePracticeAIReview } from '@/hooks/use-practice-ai-review'
import type { PracticeTrade } from '@/types/practice'

interface Props {
  trade: PracticeTrade | null
  onClose: () => void
}

export function AIReviewModal({ trade, onClose }: Props) {
  const { status, text, error, review, reset } = usePracticeAIReview()

  useEffect(() => {
    if (trade) {
      review(trade)
    } else {
      reset()
    }
  }, [trade, review, reset])

  if (!trade) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-lg border border-gray-700 bg-surface shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Bot size={16} aria-hidden />
            AI Review · {trade.mode} · {trade.pairId} {trade.timeframe}
          </div>
          <button
            type="button"
            aria-label="Close review"
            className="text-gray-500 hover:text-gray-200"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {status === 'streaming' && !text && (
            <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>
          )}
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          {text && (
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{text}</div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <div className="text-[10px] text-gray-500">
            {status === 'streaming' && 'streaming…'}
            {status === 'complete' && 'done'}
          </div>
          <button
            type="button"
            className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
