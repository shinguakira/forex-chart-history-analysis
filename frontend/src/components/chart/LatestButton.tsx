import { ChevronsRight } from 'lucide-react'
import { useWindowStore } from '@/store/window-store'

interface Props {
  windowId: string
}

export function LatestButton({ windowId }: Props) {
  const clearGoTo = useWindowStore((s) => s.clearWindowGoTo)

  return (
    <button
      type="button"
      onClick={() => clearGoTo(windowId)}
      className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
    >
      <ChevronsRight size={12} aria-hidden />
      Latest
    </button>
  )
}
