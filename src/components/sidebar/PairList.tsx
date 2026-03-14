import { PAIRS } from '@/config/pairs'
import { useUiStore } from '@/store/ui-store'
import { PairItem } from './PairItem'

export function PairList() {
  const selectedPairId = useUiStore((s) => s.selectedPairId)
  const setSelectedPairId = useUiStore((s) => s.setSelectedPairId)

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-1">
        Currency Pairs
      </h3>
      {PAIRS.map((pair) => (
        <PairItem
          key={pair.id}
          pair={pair}
          selected={pair.id === selectedPairId}
          onClick={() => setSelectedPairId(pair.id)}
        />
      ))}
    </div>
  )
}
