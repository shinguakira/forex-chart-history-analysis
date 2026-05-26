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
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M13 19l9-7-9-7v14z" />
        <path d="M2 19l9-7-9-7v14z" />
      </svg>
      Latest
    </button>
  )
}
