import { useState } from 'react'
import { useWindowStore } from '@/store/window-store'

interface Props {
  windowId: string
}

export function GoToDateInput({ windowId }: Props) {
  const [value, setValue] = useState('')
  const setGoTo = useWindowStore((s) => s.setWindowGoTo)

  const handleSubmit = () => {
    if (!value) return
    const ts = Math.floor(new Date(value).getTime() / 1000)
    if (Number.isNaN(ts)) return
    setGoTo(windowId, ts)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="bg-gray-800 text-gray-300 text-xs px-1.5 py-0.5 rounded border border-gray-700 outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-1.5 py-0.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
      >
        Go
      </button>
    </div>
  )
}
