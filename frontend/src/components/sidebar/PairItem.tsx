import type { PairConfig } from '@/config/pairs'

interface Props {
  pair: PairConfig
  hasWindow: boolean
  onClick: () => void
}

export function PairItem({ pair, hasWindow, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        hasWindow
          ? 'bg-gray-700/80 border border-blue-500/50'
          : 'hover:bg-gray-800/60 border border-transparent'
      }`}
    >
      <span className="text-sm font-semibold text-white">{pair.displayName}</span>
      {hasWindow && <span className="ml-2 text-xs text-blue-400">open</span>}
    </button>
  )
}
