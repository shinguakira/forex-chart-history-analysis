import { Menu, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useIsMobile } from '@/hooks/use-media-query'
import { PairList } from '@/components/sidebar/PairList'
import { TradeHistory } from '@/components/sidebar/TradeHistory'
import { WindowCanvas } from '@/components/window/WindowCanvas'

const MIN_SIDEBAR = 160
const MAX_SIDEBAR = 600
const DEFAULT_SIDEBAR = 208

export function MainLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dragging = useRef(false)
  const isMobile = useIsMobile()

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
    <div className="relative flex flex-1 min-h-0">
      <aside
        className="hidden md:block border-r border-gray-800 overflow-y-auto flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        <PairList />
        <TradeHistory />
      </aside>
      <div
        className="hidden md:block w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-600/50 active:bg-blue-600 transition-colors"
        onPointerDown={onPointerDown}
      />
      <WindowCanvas />

      {isMobile && (
        <>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="absolute z-20 p-3 rounded-full bg-blue-600/90 text-white hover:bg-blue-600 shadow-xl"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', left: 'calc(1rem + env(safe-area-inset-left, 0px))' }}
            aria-label="Open pairs sidebar"
          >
            <Menu size={18} aria-hidden />
          </button>
          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setDrawerOpen(false)}
              />
              <aside className="fixed bottom-0 left-0 w-72 max-w-[85vw] z-50 bg-[#0f1117] border-r border-gray-800 overflow-y-auto shadow-2xl flex flex-col" style={{ top: 'calc(49px + env(safe-area-inset-top, 0px))' }}>
                <div className="flex items-center justify-between px-2 py-2 border-b border-gray-800">
                  <span className="text-xs text-gray-500 uppercase tracking-wider px-2">Pairs</span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                    aria-label="Close pairs sidebar"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
                <div onClick={() => setDrawerOpen(false)} className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                  <PairList />
                  <TradeHistory />
                </div>
              </aside>
            </>
          )}
        </>
      )}
    </div>
  )
}
