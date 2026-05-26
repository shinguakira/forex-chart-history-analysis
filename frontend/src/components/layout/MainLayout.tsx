import { useCallback, useRef, useState } from 'react'
import { PairList } from '@/components/sidebar/PairList'
import { TradeHistory } from '@/components/sidebar/TradeHistory'
import { WindowCanvas } from '@/components/window/WindowCanvas'

const MIN_SIDEBAR = 160
const MAX_SIDEBAR = 600
const DEFAULT_SIDEBAR = 208

export function MainLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const dragging = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return
      const w = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, ev.clientX))
      setSidebarWidth(w)
    }
    const onUp = () => {
      dragging.current = false
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }, [])

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <aside
        className="border-r border-gray-800 overflow-y-auto flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        <PairList />
        <TradeHistory />
      </aside>
      <div
        className="w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-600/50 active:bg-blue-600 transition-colors"
        onPointerDown={onPointerDown}
      />
      <WindowCanvas />
    </div>
  )
}
