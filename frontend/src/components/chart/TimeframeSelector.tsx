import { TIMEFRAMES } from '@/config/constants'
import { useWindowStore } from '@/store/window-store'
import type { TimeFrame } from '@/types/candle'

interface Props {
  windowId: string
}

export function TimeframeSelector({ windowId }: Props) {
  const selected = useWindowStore((s) => s.windows.find((w) => w.id === windowId)?.timeframe ?? '1')
  const setTimeframe = useWindowStore((s) => s.setWindowTimeframe)

  return (
    <div className="flex gap-1 px-2 py-1.5">
      {TIMEFRAMES.map((tf) => (
        <button
          type="button"
          key={tf.resolution}
          onClick={() => setTimeframe(windowId, tf.resolution as TimeFrame)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            selected === tf.resolution
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
