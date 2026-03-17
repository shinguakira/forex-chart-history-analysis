import { MAX_PERIODS_BY_TIMEFRAME, PERIODS } from '@/config/constants'
import { useWindowStore } from '@/store/window-store'
import type { Period } from '@/types/candle'

interface Props {
  windowId: string
}

export function PeriodSelector({ windowId }: Props) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === windowId))
  const setPeriod = useWindowStore((s) => s.setWindowPeriod)

  if (!win) return null

  const allowed = MAX_PERIODS_BY_TIMEFRAME[win.timeframe]

  return (
    <div className="flex gap-1">
      {PERIODS.filter((p) => allowed.includes(p.value)).map((p) => (
        <button
          type="button"
          key={p.value}
          onClick={() => setPeriod(windowId, p.value as Period)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            win.period === p.value
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
