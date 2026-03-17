import { useMemo, useState } from 'react'
import { CANVAS_ID } from '@/components/window/WindowCanvas'
import { TRADE_HISTORY } from '@/config/trade-history'
import { useWindowStore } from '@/store/window-store'

function formatDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${dd} ${hh}:${mm}`
}

function getCanvasSize() {
  const el = document.getElementById(CANVAS_ID)
  if (!el) return undefined
  return { width: el.clientWidth, height: el.clientHeight }
}

export function TradeHistory() {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<'all' | 'bull' | 'bear'>('all')

  const navigateToTrade = useWindowStore((s) => s.navigateToTrade)

  const filtered = useMemo(() => {
    const trades =
      filter === 'all' ? TRADE_HISTORY : TRADE_HISTORY.filter((t) => t.direction === filter)
    return trades.slice().reverse()
  }, [filter])

  const totalPl = useMemo(() => TRADE_HISTORY.reduce((sum, t) => sum + t.pl, 0), [])

  const handleTradeClick = (pairId: string, openDate: string) => {
    const timestamp = Math.floor(new Date(openDate).getTime() / 1000)
    navigateToTrade(pairId, timestamp, getCanvasSize())
  }

  return (
    <div className="flex flex-col border-t border-gray-800">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-800/50"
      >
        <span>Trades ({TRADE_HISTORY.length})</span>
        <span className={totalPl >= 0 ? 'text-green-400' : 'text-red-400'}>
          ¥{totalPl >= 0 ? '+' : ''}
          {totalPl.toLocaleString()}
        </span>
      </button>

      {expanded && (
        <>
          <div className="flex gap-1 px-2 pb-1">
            {(['all', 'bull', 'bear'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-xs rounded ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'bull' ? 'Long' : 'Short'}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-96 px-1">
            {filtered.map((trade) => (
              <div
                key={trade.ref}
                className="px-2 py-1 text-xs hover:bg-gray-800/50 rounded cursor-pointer"
                onClick={() => handleTradeClick(trade.pairId, trade.openDate)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-1 rounded ${
                        trade.direction === 'bull'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}
                    >
                      {trade.direction === 'bull' ? 'L' : 'S'}
                    </span>
                    <span className="text-gray-300">{trade.pairId.replace('_', '/')}</span>
                    <span className="text-gray-500">x{trade.size}</span>
                  </div>
                  <span
                    className={`font-mono ${trade.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    ¥{trade.pl >= 0 ? '+' : ''}
                    {trade.pl.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                  <span className="text-[10px]">{formatDate(trade.openDate)}</span>
                  <span className="text-gray-600 font-mono">{trade.openPrice.toFixed(3)}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-[10px]">{formatDate(trade.closeDate)}</span>
                  <span className="text-gray-600 font-mono">{trade.closePrice.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
