import { useWindowStore } from '@/store/window-store'

interface Props {
  windowId: string
}

export function TradeToggle({ windowId }: Props) {
  const showTrades = useWindowStore((s) => s.windows.find((w) => w.id === windowId)?.showTrades)
  const toggle = useWindowStore((s) => s.toggleShowTrades)

  return (
    <button
      type="button"
      onClick={() => toggle(windowId)}
      className={`px-2 py-0.5 text-xs rounded transition-colors ${
        showTrades
          ? 'bg-yellow-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      Trades
    </button>
  )
}
