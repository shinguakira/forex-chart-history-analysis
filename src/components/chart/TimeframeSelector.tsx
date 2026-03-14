import { TIMEFRAMES } from '@/config/constants'
import { useUiStore } from '@/store/ui-store'
import type { TimeFrame } from '@/types/candle'

export function TimeframeSelector() {
  const selected = useUiStore((s) => s.selectedTimeframe)
  const setTimeframe = useUiStore((s) => s.setSelectedTimeframe)

  return (
    <div className="flex gap-1 px-4 py-2">
      {TIMEFRAMES.map((tf) => (
        <button
          type="button"
          key={tf.resolution}
          onClick={() => setTimeframe(tf.resolution as TimeFrame)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
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
