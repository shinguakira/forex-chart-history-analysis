import { useShallow } from 'zustand/react/shallow'
import { CANVAS_ID } from '@/components/window/WindowCanvas'
import { PAIRS } from '@/config/pairs'
import { useWindowStore } from '@/store/window-store'
import { PairItem } from './PairItem'

function getCanvasSize() {
  const el = document.getElementById(CANVAS_ID)
  if (!el) return undefined
  return { width: el.clientWidth, height: el.clientHeight }
}

export function PairList() {
  const addWindow = useWindowStore((s) => s.addWindow)
  const openPairIds = useWindowStore(useShallow((s) => s.windows.map((w) => w.pairId)))

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-1">
        Currency Pairs
      </h3>
      {PAIRS.map((pair) => (
        <PairItem
          key={pair.id}
          pair={pair}
          hasWindow={openPairIds.includes(pair.id)}
          onClick={() => addWindow(pair.id, getCanvasSize())}
        />
      ))}
    </div>
  )
}
