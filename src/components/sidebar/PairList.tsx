import { PAIRS } from '@/config/pairs'
import { useUiStore } from '@/store/ui-store'
import { PairItem } from './PairItem'

interface PairPriceData {
  regularMarketPrice: number
  previousClose: number
}

interface Props {
  selectedPairData?: PairPriceData
}

export function PairList({ selectedPairData }: Props) {
  const selectedPairId = useUiStore((s) => s.selectedPairId)
  const setSelectedPairId = useUiStore((s) => s.setSelectedPairId)

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-1">
        Currency Pairs
      </h3>
      {PAIRS.map((pair) => {
        const isSelected = pair.id === selectedPairId
        return (
          <PairItem
            key={pair.id}
            pair={pair}
            selected={isSelected}
            onClick={() => setSelectedPairId(pair.id)}
            price={isSelected ? selectedPairData?.regularMarketPrice : undefined}
            previousClose={isSelected ? selectedPairData?.previousClose : undefined}
          />
        )
      })}
    </div>
  )
}
