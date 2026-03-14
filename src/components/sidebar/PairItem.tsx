import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVAL } from '@/config/constants'
import type { PairConfig } from '@/config/pairs'
import { formatPrice, formatPriceChange } from '@/lib/utils'

interface Props {
  pair: PairConfig
  selected: boolean
  onClick: () => void
}

export function PairItem({ pair, selected, onClick }: Props) {
  const { data } = useQuery({
    queryKey: ['sidebar-price', pair.id],
    queryFn: async () => {
      const base = import.meta.env.DEV ? '/api/yahoo' : 'https://query1.finance.yahoo.com'
      const url = `${base}/v8/finance/chart/${encodeURIComponent(pair.yahooSymbol)}?interval=1d&range=1d`
      const res = await fetch(url)
      if (!res.ok) return null
      const json = await res.json()
      const meta = json.chart.result[0].meta
      return {
        regularMarketPrice: meta.regularMarketPrice as number,
        previousClose: meta.previousClose as number,
      }
    },
    staleTime: POLLING_INTERVAL,
    refetchInterval: POLLING_INTERVAL,
  })

  const price = data?.regularMarketPrice ?? 0
  const change = price && data?.previousClose ? formatPriceChange(price, data.previousClose) : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        selected
          ? 'bg-gray-700/80 border border-blue-500/50'
          : 'hover:bg-gray-800/60 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{pair.displayName}</span>
        {price > 0 && (
          <span className="text-sm font-mono text-gray-300">
            {formatPrice(price, pair.decimals)}
          </span>
        )}
      </div>
      {change && (
        <div className="mt-0.5">
          <span
            className={`text-xs font-mono ${change.positive ? 'text-green-400' : 'text-red-400'}`}
          >
            {change.value} ({change.percent})
          </span>
        </div>
      )}
    </button>
  )
}
