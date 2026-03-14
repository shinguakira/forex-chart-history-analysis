import type { PairConfig } from '@/config/pairs'
import { formatPrice, formatPriceChange } from '@/lib/utils'

interface Props {
  pair: PairConfig
  price: number
  previousClose: number
}

export function ChartHeader({ pair, price, previousClose }: Props) {
  const change = price && previousClose ? formatPriceChange(price, previousClose) : null

  return (
    <div className="flex items-center gap-4 px-4 py-2">
      <h2 className="text-xl font-bold text-white">{pair.displayName}</h2>
      {price > 0 && (
        <span className="text-lg font-mono text-white">{formatPrice(price, pair.decimals)}</span>
      )}
      {change && (
        <span
          className={`text-sm font-mono ${change.positive ? 'text-green-400' : 'text-red-400'}`}
        >
          {change.value} ({change.percent})
        </span>
      )}
    </div>
  )
}
