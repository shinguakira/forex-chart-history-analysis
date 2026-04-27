import { useShallow } from 'zustand/react/shallow'
import { useWindowStore } from '@/store/window-store'
import { ChartWindow } from './ChartWindow'

export const CANVAS_ID = 'window-canvas'

export function WindowCanvas() {
  const windowIds = useWindowStore(useShallow((s) => s.windows.map((w) => w.id)))

  return (
    <div id={CANVAS_ID} className="relative flex-1 overflow-hidden bg-gray-950">
      {windowIds.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
          Select a currency pair to open a chart
        </div>
      )}
      {windowIds.map((id) => (
        <ChartWindow key={id} windowId={id} />
      ))}
    </div>
  )
}
