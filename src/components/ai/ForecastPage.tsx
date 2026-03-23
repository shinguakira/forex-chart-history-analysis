import { useAIForecast } from '@/hooks/use-ai-forecast'
import { formatDateJST } from '@/lib/date-utils'
import { useAIStore } from '@/store/ai-store'
import { ChatPanel } from './ChatPanel'
import { ReviewSkeleton } from './ReviewSkeleton'
import { SettingsDialog } from './SettingsDialog'
import { StructuredResponse } from './StructuredResponse'

const STALE_MS = 10 * 60 * 1000 // 10 minutes

export function ForecastPage() {
  const apiKey = useAIStore((s) => s.apiKey)
  const chatOpen = useAIStore((s) => s.chatOpen)
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)
  const setChatContext = useAIStore((s) => s.setChatContext)
  const setChatOpen = useAIStore((s) => s.setChatOpen)
  const { status, text, error, progress, generateForecast, reset, cancel } = useAIForecast()
  const cached = useAIStore((s) => s.reviewCache.forecast)

  const isConfigured = apiKey.length > 0
  const forecastText = cached && status === 'idle' ? cached.content : text
  const isCacheStale = cached ? Date.now() - cached.createdAt > STALE_MS : true

  const handleRegenerate = () => {
    const store = useAIStore.getState()
    const newCache = { ...store.reviewCache }
    delete newCache.forecast
    useAIStore.setState({ reviewCache: newCache })
    reset()
    generateForecast()
  }

  return (
    <div className={`min-h-screen bg-[#0f1117] text-gray-200 p-6 ${chatOpen ? 'mr-[400px]' : ''}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">AI Forecast</h1>
          <div className="flex items-center gap-3">
            {isConfigured && <span className="text-xs text-green-400">API configured</span>}
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Not configured prompt */}
        {!isConfigured && (
          <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-4">
            <div className="text-sm text-yellow-300 font-medium mb-1">API Key Required</div>
            <div className="text-xs text-yellow-300/70">
              Configure your Claude API key in Settings to use AI forecast.
            </div>
            <button
              type="button"
              className="mt-3 px-4 py-1.5 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-500"
              onClick={() => setSettingsOpen(true)}
            >
              Configure API Key
            </button>
          </div>
        )}

        {/* Generate button */}
        {!forecastText && status === 'idle' && (
          <button
            type="button"
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            onClick={generateForecast}
            disabled={!isConfigured}
          >
            Generate Forecast
          </button>
        )}

        {/* Fetching data */}
        {status === 'fetching-data' && (
          <ReviewSkeleton label={`Fetching market data... ${progress}`} />
        )}

        {/* Streaming */}
        {status === 'streaming' && (
          <div>
            <StructuredResponse text={text} isStreaming />
            <button
              type="button"
              className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              onClick={cancel}
            >
              Stop
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Completed forecast */}
        {forecastText && status !== 'streaming' && (
          <div>
            <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-[#0f1117] py-2">
              <div className="flex items-center gap-3">
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
                    setChatContext('forecast')
                    setChatOpen(true)
                  }}
                >
                  Chat about forecast
                </button>
              </div>
              {cached && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{formatDateJST(cached.createdAt)}</span>
                  {isCacheStale && (
                    <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      stale
                    </span>
                  )}
                </div>
              )}
            </div>
            <StructuredResponse text={forecastText} />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <ChatPanel />

      {/* Chat toggle button */}
      {!chatOpen && isConfigured && forecastText && (
        <button
          type="button"
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 z-30"
          onClick={() => {
            setChatContext('forecast')
            setChatOpen(true)
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Settings Dialog */}
      <SettingsDialog />
    </div>
  )
}
