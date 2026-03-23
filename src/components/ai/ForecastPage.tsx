import { useAIForecast } from '@/hooks/use-ai-forecast'
import { formatDateJST } from '@/lib/date-utils'
import { useAIStore } from '@/store/ai-store'
import { ReviewSkeleton } from './ReviewSkeleton'
import { SettingsDialog } from './SettingsDialog'
import { StreamingText } from './StreamingText'

const STALE_MS = 10 * 60 * 1000 // 10 minutes

export function ForecastPage() {
  const { apiKey, setSettingsOpen } = useAIStore()
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
    <div className="min-h-screen bg-[#0f1117] text-gray-200 p-6">
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
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <StreamingText text={text} isStreaming />
            <button
              type="button"
              className="mt-3 px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
              onClick={cancel}
            >
              Stop
            </button>
          </div>
        )}

        {/* Error */}
        {error && <div className="text-sm text-red-400">{error}</div>}

        {/* Completed forecast */}
        {forecastText && status !== 'streaming' && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            {cached && (
              <div className="text-xs text-gray-500 mb-3">
                Generated: {formatDateJST(cached.createdAt)}
                {isCacheStale && (
                  <span className="text-yellow-500 ml-2">
                    (stale — market data may have changed)
                  </span>
                )}
              </div>
            )}
            <StreamingText text={forecastText} />
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-800">
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
                onClick={handleRegenerate}
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog />
    </div>
  )
}
