import type { PairConfig } from '@/config/pairs'
import { formatPrice, formatPriceChange } from '@/lib/utils'

interface Props {
  pair: PairConfig
  selected: boolean
  onClick: () => void
  price?: number
  previousClose?: number
}

export function PairItem({ pair, selected, onClick, price, previousClose }: Props) {
  const change = price && previousClose ? formatPriceChange(price, previousClose) : null

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
        {price != null && price > 0 && (
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
