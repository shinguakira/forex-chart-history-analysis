import { TRADE_HISTORY } from '@/config/trade-history'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useTradeContext } from '@/hooks/use-trade-context'
import { useAIStore } from '@/store/ai-store'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

export function ChatPanel() {
  const { chatOpen, chatMessages, chatContext, setChatOpen, clearChat } = useAIStore()
  const { streaming, currentToken, error, sendMessage } = useAIChat()

  const trade =
    chatContext && chatContext !== 'portfolio'
      ? (TRADE_HISTORY.find((t) => t.ref === chatContext) ?? null)
      : null
  const { data: tradeCtx } = useTradeContext(trade)

  if (!chatOpen) return null

  // Auto-scroll is handled by the ref callback on the scroll container
  const scrollToBottom = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = el.scrollHeight
  }

  const contextLabel =
    chatContext === 'portfolio'
      ? 'Portfolio'
      : trade
        ? `${trade.pairId} ${trade.openDate}`
        : 'General'

  const handleSend = (text: string) => {
    if (chatContext === 'portfolio') {
      sendMessage(text, 'portfolio')
    } else if (tradeCtx) {
      sendMessage(text, tradeCtx)
    } else {
      sendMessage(text, 'portfolio')
    }
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[400px] z-40 flex flex-col border-l border-gray-700 bg-[#0f1117]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <span className="text-sm font-medium text-white">Chat</span>
          <span className="ml-2 text-xs text-gray-500">{contextLabel}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-300"
            onClick={clearChat}
          >
            Clear
          </button>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-300"
            onClick={() => setChatOpen(false)}
          >
            Close
          </button>
        </div>
      </div>

      <div ref={scrollToBottom} className="flex-1 overflow-y-auto p-4">
        {chatMessages.length === 0 && !streaming && (
          <div className="text-xs text-gray-600 text-center mt-8">
            Ask questions about your {chatContext === 'portfolio' ? 'portfolio' : 'trade'}
          </div>
        )}

        {chatMessages.map((msg) => (
          <ChatMessage
            key={`${msg.role}-${msg.content.slice(0, 40)}`}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
          />
        ))}

        {streaming && currentToken && (
          <ChatMessage role="assistant" content={currentToken} isStreaming />
        )}

        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
      </div>

      <div className="p-3 border-t border-gray-800">
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  )
}
