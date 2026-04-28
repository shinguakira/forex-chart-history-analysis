import { useMemo, useState } from 'react'
import { PAIRS } from '@/config/pairs'
import { useAIReview } from '@/hooks/use-ai-review'
import { useTradeHistory } from '@/hooks/use-trade-history'
import { useAIStore } from '@/store/ai-store'
import { DurationFilter } from '../analysis/DurationFilter'
import { ChatPanel } from './ChatPanel'
import { ReviewSkeleton } from './ReviewSkeleton'
import { SettingsDialog } from './SettingsDialog'
import { StructuredResponse } from './StructuredResponse'
import { TradeReviewCard } from './TradeReviewCard'

type Tab = 'portfolio' | 'trades'
const PAGE_SIZE = 20

function getPresetStart(preset: string): Date | null {
  if (preset === 'all') return null
  const now = new Date()
  switch (preset) {
    case '1m':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case '3m':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case '6m':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case '2y':
      return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
    default:
      return null
  }
}

export function ReviewPage() {
  const [tab, setTab] = useState<Tab>('portfolio')
  const [preset, setPreset] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [tradeFilter, setTradeFilter] = useState<'all' | 'wins' | 'losses'>('all')
  const [pairFilter, setPairFilter] = useState('all')
  const [searchRef, setSearchRef] = useState('')
  const [page, setPage] = useState(0)

  const apiKey = useAIStore((s) => s.apiKey)
  const chatOpen = useAIStore((s) => s.chatOpen)
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)
  const setChatContext = useAIStore((s) => s.setChatContext)
  const setChatOpen = useAIStore((s) => s.setChatOpen)
  const { status, text, error, reviewPortfolio, reset, cancel } = useAIReview()
  const cached = useAIStore((s) => s.reviewCache.portfolio)
  const { trades: TRADE_HISTORY } = useTradeHistory()

  const filteredTrades = useMemo(() => {
    let trades = TRADE_HISTORY

    // Date filter
    if (preset === 'custom') {
      const start = customStart ? new Date(customStart) : null
      const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null
      trades = trades.filter((t) => {
        const d = new Date(t.closeDate)
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      })
    } else {
      const start = getPresetStart(preset)
      if (start) trades = trades.filter((t) => new Date(t.closeDate) >= start)
    }

    // Pair filter
    if (pairFilter !== 'all') {
      trades = trades.filter((t) => t.pairId === pairFilter)
    }

    // Win/loss filter
    if (tradeFilter === 'wins') trades = trades.filter((t) => t.pl > 0)
    if (tradeFilter === 'losses') trades = trades.filter((t) => t.pl <= 0)

    // Ref search
    if (searchRef.trim()) {
      const q = searchRef.trim().toLowerCase()
      trades = trades.filter(
        (t) => t.ref.toLowerCase().includes(q) || t.openDate.includes(q) || t.closeDate.includes(q),
      )
    }

    return trades
  }, [preset, customStart, customEnd, pairFilter, tradeFilter, searchRef, TRADE_HISTORY])

  // Reset page when filters change
  const totalPages = Math.ceil(filteredTrades.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pagedTrades = filteredTrades.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const portfolioText = cached && status === 'idle' ? cached.content : text
  const isConfigured = apiKey.length > 0

  const handlePortfolioReview = () => {
    reviewPortfolio(filteredTrades)
  }

  const handlePortfolioRegenerate = () => {
    const store = useAIStore.getState()
    const newCache = { ...store.reviewCache }
    delete newCache.portfolio
    useAIStore.setState({ reviewCache: newCache })
    reset()
    reviewPortfolio(filteredTrades)
  }

  return (
    <div className={`min-h-screen bg-[#0f1117] text-gray-200 p-6 ${chatOpen ? 'mr-[400px]' : ''}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">AI Trade Review</h1>
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
              Configure your Claude API key in Settings to use AI trade review.
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

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            type="button"
            className={`px-4 py-2 text-xs rounded-t ${tab === 'portfolio' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setTab('portfolio')}
          >
            Portfolio Review
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs rounded-t ${tab === 'trades' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setTab('trades')}
          >
            Trade Review
          </button>
        </div>

        {/* Portfolio Tab */}
        {tab === 'portfolio' && (
          <div className="space-y-4">
            {!portfolioText && status === 'idle' && (
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                onClick={handlePortfolioReview}
                disabled={!isConfigured}
              >
                Generate Portfolio Review ({filteredTrades.length} trades)
              </button>
            )}

            {status === 'loading-context' && (
              <ReviewSkeleton label="Fetching chart data for sample trades... (this may take ~10s)" />
            )}

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

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {portfolioText && status !== 'streaming' && (
              <div>
                <div className="flex items-center gap-3 mb-4 sticky top-0 z-10 bg-[#0f1117] py-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
                    onClick={handlePortfolioRegenerate}
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                    onClick={() => {
                      setChatContext('portfolio')
                      setChatOpen(true)
                    }}
                  >
                    Chat about portfolio
                  </button>
                </div>
                <StructuredResponse text={portfolioText} />
              </div>
            )}
          </div>
        )}

        {/* Trades Tab */}
        {tab === 'trades' && (
          <div className="space-y-4">
            <DurationFilter
              preset={preset}
              onPresetChange={(v) => {
                setPreset(v)
                setPage(0)
              }}
              customStart={customStart}
              customEnd={customEnd}
              onCustomStartChange={(v) => {
                setCustomStart(v)
                setPage(0)
              }}
              onCustomEndChange={(v) => {
                setCustomEnd(v)
                setPage(0)
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              {/* Pair filter */}
              <select
                value={pairFilter}
                onChange={(e) => {
                  setPairFilter(e.target.value)
                  setPage(0)
                }}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Pairs</option>
                {PAIRS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>

              {/* Win/loss filter */}
              <div className="flex gap-1">
                {(['all', 'wins', 'losses'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`px-3 py-1 text-xs rounded ${tradeFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    onClick={() => {
                      setTradeFilter(f)
                      setPage(0)
                    }}
                  >
                    {f === 'all' ? 'All' : f === 'wins' ? 'Wins' : 'Losses'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search ref / date..."
                value={searchRef}
                onChange={(e) => {
                  setSearchRef(e.target.value)
                  setPage(0)
                }}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 outline-none focus:border-blue-500 w-48"
              />

              <span className="text-xs text-gray-500">{filteredTrades.length} trades</span>
            </div>

            {/* Trade cards - paginated */}
            <div className="space-y-3">
              {pagedTrades.map((trade) => (
                <TradeReviewCard key={trade.ref} trade={trade} allTrades={filteredTrades} />
              ))}
              {filteredTrades.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-8">
                  No trades match the current filters.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <ChatPanel />

      {/* Chat toggle button */}
      {!chatOpen && isConfigured && (
        <button
          type="button"
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 z-30"
          onClick={() => {
            if (!useAIStore.getState().chatContext) {
              setChatContext(tab === 'portfolio' ? 'portfolio' : null)
            }
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
